import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { tierInfo } from "@/lib/rank";
import { formatCompact, initials } from "@/lib/format";
import { toDataUri } from "@/lib/og";

export const alt = "Perfil de piloto na Sponsas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#0a0f1c";
const BEGE = "#f4f3ef";
const ORANGE = "#ff5a1f";

type Row = {
  name: string;
  photo_url: string | null;
  city: string | null;
  state: string | null;
  athlete_profiles: {
    modality: string | null;
    category: string | null;
    rank_tier: string | null;
  } | null;
  social_links: { followers: number | null }[];
};

async function getPilot(id: string): Promise<Row | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const supabase = createClient(url, key);
    const { data } = await supabase
      .from("profiles")
      .select(
        "name, photo_url, city, state, athlete_profiles(modality, category, rank_tier), social_links(followers)",
      )
      .eq("id", id)
      .eq("type", "athlete")
      .maybeSingle();
    return (data ?? null) as unknown as Row | null;
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pilot = await getPilot(id);
  const name = pilot?.name ?? "Piloto";
  const avatar = await toDataUri(pilot?.photo_url);
  const ap = pilot?.athlete_profiles ?? null;
  const linha = [ap?.modality, ap?.category, pilot?.state]
    .filter(Boolean)
    .join("  ·  ");
  const tier = tierInfo(ap?.rank_tier);
  const followers = (pilot?.social_links ?? []).reduce(
    (s, l) => s + (l.followers ?? 0),
    0,
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: NAVY,
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>
          <span style={{ color: BEGE }}>Spons</span>
          <span style={{ color: ORANGE }}>as</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div
            style={{
              display: "flex",
              width: 200,
              height: 200,
              borderRadius: 28,
              background: ORANGE,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt=""
                width={200}
                height={200}
                style={{ width: 200, height: 200, objectFit: "cover" }}
              />
            ) : (
              <span style={{ color: BEGE, fontSize: 84, fontWeight: 700 }}>
                {initials(name)}
              </span>
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: 760,
            }}
          >
            <div
              style={{
                display: "flex",
                color: BEGE,
                fontSize: 72,
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: -1,
              }}
            >
              {name}
            </div>
            {linha && (
              <div
                style={{
                  display: "flex",
                  color: "rgba(244,243,239,0.6)",
                  fontSize: 32,
                  marginTop: 18,
                }}
              >
                {linha}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {tier && (
            <div
              style={{
                display: "flex",
                background: ORANGE,
                color: "#ffffff",
                fontSize: 26,
                fontWeight: 700,
                padding: "12px 26px",
                borderRadius: 999,
              }}
            >
              Rank Sponsas: {tier.label}
            </div>
          )}
          {followers > 0 && (
            <div
              style={{
                display: "flex",
                color: BEGE,
                fontSize: 28,
              }}
            >
              {formatCompact(followers)} seguidores
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
