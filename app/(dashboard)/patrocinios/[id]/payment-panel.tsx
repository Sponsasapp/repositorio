import Link from "next/link";
import { asaasConfigured } from "@/lib/asaas";
import { billingBlocker, INVOICE_STATUS, listInvoices } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBRL, formatDateBR } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { ativarCobranca } from "../actions";
import type { Sponsorship } from "@/lib/types/database.types";

/**
 * Bloco "Pagamento" do patrocínio (Asaas). Só aparece com o Asaas ligado.
 * Empresa: ativa a cobrança e paga as faturas. Patrocinado: vê o status e
 * quanto recebe. Quem renderiza já checou que o usuário é parte.
 */
export async function PaymentPanel({
  s,
  iAmCompany,
}: {
  s: Sponsorship;
  iAmCompany: boolean;
}) {
  if (!asaasConfigured()) return null;
  if (s.payment_type === "trade") return null;

  const admin = createAdminClient();
  const { data: cfg } = await admin
    .from("plan_config")
    .select("platform_fee_pct")
    .limit(1)
    .maybeSingle();
  const fee = Number(cfg?.platform_fee_pct ?? 10);
  const net = s.value != null ? (s.value * (100 - fee)) / 100 : null;

  const invoices = s.asaas_subscription_id
    ? await listInvoices(s.asaas_subscription_id)
    : [];
  const blocker = s.asaas_subscription_id ? null : await billingBlocker(s);

  return (
    <section className="border-border bg-card mt-6 rounded-xl border p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl">Pagamento</h2>
        {s.value != null && (
          <span className="text-muted-foreground text-sm">
            {formatBRL(s.value)}/mês
          </span>
        )}
      </div>

      {!iAmCompany && net != null && (
        <p className="text-muted-foreground mt-1 text-sm">
          Você recebe {100 - fee}% de cada pagamento — até {formatBRL(net)}{" "}
          por mês — direto na sua conta. O percentual vale sobre o valor já
          descontada a tarifa do meio de pagamento (PIX, boleto ou cartão).
        </p>
      )}

      {s.asaas_subscription_id ? (
        invoices.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">
            Cobrança ativa. As faturas aparecem aqui assim que geradas.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y text-sm">
            {invoices.map((inv) => {
              const st = INVOICE_STATUS[inv.status] ?? {
                label: inv.status,
                cls: "bg-muted text-muted-foreground",
              };
              const open = inv.status === "PENDING" || inv.status === "OVERDUE";
              return (
                <li
                  key={inv.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span>
                    {formatDateBR(inv.dueDate)}
                    <span className="text-muted-foreground">
                      {" "}
                      · {formatBRL(inv.value)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${st.cls}`}>
                      {st.label}
                    </span>
                    {inv.invoiceUrl && (iAmCompany ? open : false) && (
                      <Button asChild size="sm">
                        <a href={inv.invoiceUrl} target="_blank" rel="noopener noreferrer">
                          Pagar
                        </a>
                      </Button>
                    )}
                    {inv.invoiceUrl && !(iAmCompany && open) && (
                      <a
                        href={inv.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground text-xs underline"
                      >
                        ver
                      </a>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )
      ) : iAmCompany ? (
        blocker ? (
          <p className="text-muted-foreground mt-3 text-sm">{blocker}</p>
        ) : (
          <form action={ativarCobranca} className="mt-3">
            <input type="hidden" name="sponsorship_id" value={s.id} />
            <p className="text-muted-foreground mb-3 text-sm">
              A Sponsas gera uma fatura por mês (PIX, boleto ou cartão — você
              escolhe na hora de pagar) e repassa a parte do patrocinado
              automaticamente.
            </p>
            <SubmitButton confirm="Ativar a cobrança mensal deste patrocínio?">
              Ativar cobrança mensal
            </SubmitButton>
          </form>
        )
      ) : blocker?.startsWith("Aguardando o patrocinado") ? (
        <div className="mt-3 text-sm">
          <p>Ative seus recebimentos pra marca poder pagar pela Sponsas.</p>
          <Button asChild size="sm" className="mt-2">
            <Link href="/configuracoes">Ativar recebimentos</Link>
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground mt-3 text-sm">
          {blocker ?? "Aguardando a empresa ativar a cobrança mensal."}
        </p>
      )}
    </section>
  );
}
