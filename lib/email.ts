import { SITE_URL } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/lib/types/database.types";

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
  <h1 style="font-size:18px;margin:0 0 8px">${title}</h1>
  <p style="color:#6B6E76;font-size:14px;line-height:1.5;margin:0 0 16px">${body}</p>
  ${
    cta
      ? `<p style="margin:0"><a href="${cta.href}" style="display:inline-block;background:#FF5A1F;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">${cta.label}</a></p>`
      : ""
  }
  <p style="color:#9BA1B4;font-size:12px;margin:28px 0 0">Você recebe este e-mail porque tem uma conta na Sponsas.</p>
</div>`;
}

/**
 * Notifica um usuário: grava a notificação in-app (lida pelo sininho) e,
 * best-effort, manda um e-mail em cima. A gravação in-app é a fonte da
 * verdade — se o e-mail falhar por qualquer motivo, o aviso continua visível
 * no produto. Tudo via RPC `notify` (SECURITY DEFINER, com guarda de
 * relação) — não precisa de service role.
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
    const { data: email, error } = await supabase.rpc("notify", {
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
    if (!email) return;

    const cta = n.cta
      ? { label: n.cta.label, href: `${SITE_URL}${n.cta.path}` }
      : undefined;

    await sendEmail(email, n.subject, template(n.title, n.body, cta));
  } catch (e) {
    console.error("[notifyUser]", e);
  }
}
