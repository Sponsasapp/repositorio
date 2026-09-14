import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Roda de manhã (09:00 BRT) — cedo demais no cron das 06:00 UTC de
// rank-snapshot (03:00 BRT) pra um aviso "hoje você deve fazer...".
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  // SECURITY DEFINER — não precisa de service role.
  const supabase = await createClient();
  const { data: notified, error } = await supabase.rpc(
    "notify_deliverables_due_today",
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, notified: notified ?? 0 });
}
