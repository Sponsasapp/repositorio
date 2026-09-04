import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  // As duas rodam em funções SECURITY DEFINER no Postgres — não precisa de
  // service role.
  const supabase = await createClient();
  const { data: snapshots, error } = await supabase.rpc(
    "capture_rank_snapshots",
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: expiring, error: expiringError } = await supabase.rpc(
    "notify_expiring_plans",
  );
  if (expiringError) {
    console.error("[cron] notify_expiring_plans", expiringError.message);
  }

  return NextResponse.json({
    ok: true,
    snapshots: snapshots ?? 0,
    expiring_notified: expiring ?? 0,
  });
}
