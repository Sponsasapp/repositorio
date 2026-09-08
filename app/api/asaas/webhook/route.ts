import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type AsaasWebhook = {
  id?: string;
  event: string;
  payment?: {
    id: string;
    subscription?: string | null;
    status?: string;
  };
};

/**
 * Webhook do Asaas. Autentica pelo header `asaas-access-token` (configurado
 * no painel do Asaas = env ASAAS_WEBHOOK_TOKEN). Idempotência por evento.
 */
export async function POST(request: Request) {
  const token = process.env.ASAAS_WEBHOOK_TOKEN;
  if (token) {
    const got = request.headers.get("asaas-access-token");
    if (got !== token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let body: AsaasWebhook;
  try {
    body = (await request.json()) as AsaasWebhook;
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Idempotência: se o evento traz id, registra e ignora repetição.
  const eventId = body.id ?? `${body.event}:${body.payment?.id ?? ""}`;
  const { error: insErr } = await admin
    .from("payment_events")
    .insert({ id: eventId, event: body.event });
  if (insErr) {
    // chave duplicada => já processado
    if (insErr.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
    console.error("[asaas/webhook] insert event", insErr.message);
  }

  const subId = body.payment?.subscription ?? null;
  if (subId) {
    const map: Record<string, string> = {
      PAYMENT_CONFIRMED: "active",
      PAYMENT_RECEIVED: "active",
      PAYMENT_OVERDUE: "overdue",
      PAYMENT_DELETED: "canceled",
      PAYMENT_REFUNDED: "canceled",
    };
    const next = map[body.event];
    if (next) {
      await admin
        .from("sponsorships")
        .update({ payment_status: next })
        .eq("asaas_subscription_id", subId);
    }
  }

  return NextResponse.json({ ok: true });
}
