import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Roda no servidor, sob demanda (Vercel Cron).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Vercel Cron envia Authorization: Bearer ${CRON_SECRET}. Se a env estiver
  // setada, exigimos; senão (dev/local) deixamos passar.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada" },
      { status: 500 },
    );
  }

  const { data: rows, error } = await admin
    .from("athlete_modalities")
    .select("profile_id, modality, rank_score, rank_tier")
    .not("rank_score", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const capturedOn = new Date().toISOString().slice(0, 10);
  const snapshots = (rows ?? []).map((r) => ({
    athlete_id: r.profile_id,
    modality: r.modality,
    score: r.rank_score,
    tier: r.rank_tier,
    captured_on: capturedOn,
  }));

  if (snapshots.length > 0) {
    // upsert manual: apaga o dia e reinsere (o índice único é sobre uma
    // expressão coalesce(modality,''), que o supabase-js não aceita em onConflict)
    await admin
      .from("athlete_rank_snapshots")
      .delete()
      .eq("captured_on", capturedOn);
    const { error: upErr } = await admin
      .from("athlete_rank_snapshots")
      .insert(snapshots);
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, captured_on: capturedOn, count: snapshots.length });
}
