import "server-only";

/**
 * Puxa métricas públicas de um canal do YouTube a partir do @ ou da URL.
 *
 * Usa só a YouTube Data API v3 com uma API key (env `YOUTUBE_API_KEY`) — dados
 * públicos, sem OAuth e sem revisão de app. Instagram e TikTok não têm
 * equivalente: exigem o piloto conectar a própria conta (OAuth) + app aprovado.
 */

const API = "https://www.googleapis.com/youtube/v3";

export type YouTubeStats = {
  channelId: string;
  title: string;
  handle: string | null;
  /** subscriberCount (arredondado pelo próprio YouTube) */
  followers: number | null;
  /** média de views nos últimos vídeos */
  avgReach: number | null;
  /** média de (likes + comentários) nos últimos vídeos */
  avgInteractions: number | null;
  /** avgInteractions ÷ followers × 100 */
  engagementRate: number | null;
};

type YtResult =
  | { ok: true; data: YouTubeStats }
  | { ok: false; error: string };

const toNum = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function extractQuery(input: string): {
  handle?: string;
  channelId?: string;
  search?: string;
} {
  const s = input.trim();
  if (!s) return {};

  if (s.includes("youtube.com") || s.includes("youtu.be")) {
    try {
      const u = new URL(s.startsWith("http") ? s : `https://${s}`);
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0]?.startsWith("@")) return { handle: parts[0].slice(1) };
      if (parts[0] === "channel" && parts[1]) return { channelId: parts[1] };
      if ((parts[0] === "c" || parts[0] === "user") && parts[1])
        return { search: decodeURIComponent(parts[1]) };
      if (parts[0]) return { search: decodeURIComponent(parts[0]) };
    } catch {
      // cai no tratamento abaixo
    }
  }

  if (s.startsWith("@")) return { handle: s.slice(1) };
  if (/^UC[\w-]{20,}$/.test(s)) return { channelId: s };
  return { handle: s.replace(/^@/, "") };
}

async function yt(
  path: string,
  params: Record<string, string>,
  key: string,
): Promise<Record<string, unknown> | null> {
  const qs = new URLSearchParams({ ...params, key }).toString();
  try {
    const res = await fetch(`${API}/${path}?${qs}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

type Channel = {
  id?: string;
  snippet?: { title?: string; customUrl?: string };
  statistics?: {
    subscriberCount?: string;
    hiddenSubscriberCount?: boolean;
  };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
};

function firstChannel(j: Record<string, unknown> | null): Channel | null {
  const items = j?.items as Channel[] | undefined;
  return items?.[0] ?? null;
}

export async function fetchYouTubeStats(input: string): Promise<YtResult> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return { ok: false, error: "Integração do YouTube ainda não configurada." };
  }

  const q = extractQuery(input);
  if (!q.handle && !q.channelId && !q.search) {
    return { ok: false, error: "Informe o @ ou a URL do canal do YouTube." };
  }

  const part = "snippet,statistics,contentDetails";
  let channel: Channel | null = null;

  if (q.channelId) {
    channel = firstChannel(await yt("channels", { part, id: q.channelId }, key));
  }
  if (!channel && q.handle) {
    channel = firstChannel(
      await yt("channels", { part, forHandle: q.handle }, key),
    );
  }
  if (!channel && (q.search || q.handle)) {
    const s = await yt(
      "search",
      {
        part: "snippet",
        type: "channel",
        maxResults: "1",
        q: q.search ?? q.handle ?? "",
      },
      key,
    );
    const items = s?.items as
      | Array<{ id?: { channelId?: string }; snippet?: { channelId?: string } }>
      | undefined;
    const id = items?.[0]?.id?.channelId ?? items?.[0]?.snippet?.channelId;
    if (id) {
      channel = firstChannel(await yt("channels", { part, id }, key));
    }
  }

  if (!channel?.id) {
    return { ok: false, error: "Canal não encontrado. Confira o @ ou a URL." };
  }

  const stats = channel.statistics ?? {};
  const followers = stats.hiddenSubscriberCount
    ? null
    : toNum(stats.subscriberCount);

  let avgReach: number | null = null;
  let avgInteractions: number | null = null;

  const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
  if (uploads) {
    const pl = await yt(
      "playlistItems",
      { part: "contentDetails", playlistId: uploads, maxResults: "12" },
      key,
    );
    const plItems = pl?.items as
      | Array<{ contentDetails?: { videoId?: string } }>
      | undefined;
    const ids = (plItems ?? [])
      .map((i) => i.contentDetails?.videoId)
      .filter((v): v is string => Boolean(v))
      .slice(0, 12);

    if (ids.length > 0) {
      const v = await yt(
        "videos",
        { part: "statistics", id: ids.join(",") },
        key,
      );
      const vItems = v?.items as
        | Array<{
            statistics?: {
              viewCount?: string;
              likeCount?: string;
              commentCount?: string;
            };
          }>
        | undefined;
      const rows = (vItems ?? []).map((it) => it.statistics ?? {});
      if (rows.length > 0) {
        const sumViews = rows.reduce((a, r) => a + (toNum(r.viewCount) ?? 0), 0);
        const sumInter = rows.reduce(
          (a, r) =>
            a + (toNum(r.likeCount) ?? 0) + (toNum(r.commentCount) ?? 0),
          0,
        );
        avgReach = Math.round(sumViews / rows.length) || null;
        avgInteractions = Math.round(sumInter / rows.length) || null;
      }
    }
  }

  const engagementRate =
    followers && avgInteractions
      ? Math.round((avgInteractions / followers) * 1000) / 10
      : null;

  return {
    ok: true,
    data: {
      channelId: channel.id,
      title: channel.snippet?.title ?? "",
      handle: channel.snippet?.customUrl ?? (q.handle ? `@${q.handle}` : null),
      followers,
      avgReach,
      avgInteractions,
      engagementRate,
    },
  };
}
