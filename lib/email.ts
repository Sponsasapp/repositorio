import { SITE_URL } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import type { NotificationType } from "@/lib/types/database.types";

/** Escapa texto do usuário (nome, mensagem) antes de entrar no HTML. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FROM = "Sponsas <nao-responda@sponsas.com.br>";

async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY ausente — e-mail não enviado");
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!res.ok) {
      console.error("[email] resend", res.status, await res.text());
    }
  } catch (e) {
    console.error("[email] falha no envio", e);
  }
}

function template(
  title: string,
  body: string,
  cta?: { label: string; href: string },
) {
  return `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:8px;color:#14161C">
  <p style="font-size:20px;font-weight:700;margin:0 0 16px">Spon<span style="color:#FF5A1F">sas</span></p>
  <h1 style="font-size:18px;margin:0 0 8px">${esc(title)}</h1>
  <p style="color:#6B6E76;font-size:14px;line-height:1.5;margin:0 0 16px">${esc(body)}</p>
  ${
    cta
      ? `<p style="margin:0"><a href="${esc(cta.href)}" style="display:inline-block;background:#FF5A1F;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">${esc(cta.label)}</a></p>`
      : ""
  }
  <p style="color:#9BA1B4;font-size:12px;margin:28px 0 0">Você recebe este e-mail porque tem uma conta na Sponsas.</p>
</div>`;
}

/**
 * Notifica um usuário: grava a notificação in-app (lida pelo sininho) e,
 * best-effort, manda um e-mail em cima. A gravação in-app é a fonte da
 * verdade — se o e-mail falhar por qualquer motivo, o aviso continua visível
 * no produto. A RPC `notify` (SECURITY DEFINER) valida a relação e grava o
 * in-app; o e-mail do destinatário só é resolvido aqui, com service role
 * (sem `SUPABASE_SERVICE_ROLE_KEY` o aviso fica só no sininho).
 */
export async function notifyUser(
  userId: string,
  n: {
    type: NotificationType;
    subject: string;
    title: string;
    body: string;
    cta?: { label: string; path: string };
  },
) {
  try {
    const supabase = await createClient();
    const { data: ok, error } = await supabase.rpc("notify", {
      p_target: userId,
      p_type: n.type,
      p_title: n.title,
      p_body: n.body,
      p_cta_label: n.cta?.label ?? null,
      p_cta_path: n.cta?.path ?? null,
    });
    if (error) {
      console.error("[notifyUser] rpc", error.message);
      return;
    }
    // 'ok' = notificação in-app gravada e relação validada pelo banco.
    if (ok !== "ok") return;

    // O e-mail do destinatário é resolvido só aqui no servidor (a RPC não
    // devolve mais e-mail — migration 0038). Sem service role, fica só in-app.
    if (!hasAdminKey()) {
      console.warn("[notifyUser] SUPABASE_SERVICE_ROLE_KEY ausente — e-mail não enviado");
      return;
    }
    const { data: target } = await createAdminClient().auth.admin.getUserById(userId);
    const email = target?.user?.email;
    if (!email) return;

    const cta = n.cta
      ? { label: n.cta.label, href: `${SITE_URL}${n.cta.path}` }
      : undefined;

    await sendEmail(email, n.subject, template(n.title, n.body, cta));
  } catch (e) {
    console.error("[notifyUser]", e);
  }
}
