import { createHash } from "node:crypto";
import type { createClient } from "@/lib/supabase/server";
import { deliverableLabel } from "@/lib/deliverables";
import { formatBRL, formatDateBR } from "@/lib/format";
import { formatDocBR } from "@/lib/br";
import { PARTICIPANT } from "@/lib/participant-types";
import type {
  ProfileType,
  ProposalPaymentType,
} from "@/lib/types/database.types";

/** Versão do texto-modelo. Mudou o texto → muda a versão (e o hash). */
export const CONTRACT_VERSION = "sponsas-patrocinio-v1 (nov/2026)";

export type ContractParty = {
  role: "company" | "sponsee";
  profile_id: string;
  legal_name: string | null;
  document: string | null;
  rep_name: string | null;
  rep_cpf: string | null;
  address: string | null;
  complete: boolean;
};

export type ContractTerms = {
  version: string;
  sponsorship_id: string;
  sponsee_type: ProfileType;
  company: ContractParty | null;
  sponsee: ContractParty | null;
  payment_type: ProposalPaymentType;
  value: number | null;
  trade_description: string | null;
  trade_value: number | null;
  duration_months: number | null;
  start_date: string;
  deliverables: string[];
  message: string | null;
};

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Monta os termos do contrato a partir do banco (patrocínio + proposta +
 * qualificação das partes). É o MESMO objeto que a tela mostra e que vira o
 * hash gravado no aceite — o que a pessoa viu é o que ela aceitou.
 */
export async function loadContractTerms(
  supabase: Supabase,
  sponsorshipId: string,
): Promise<ContractTerms | null> {
  const [{ data: s }, { data: parties }] = await Promise.all([
    supabase
      .from("sponsorships")
      .select(
        "id, payment_type, value, trade_description, trade_value, duration_months, start_date, athlete:profiles!sponsorships_athlete_id_fkey(type), proposal:proposals(deliverables, message)",
      )
      .eq("id", sponsorshipId)
      .maybeSingle(),
    supabase.rpc("contract_parties", { p_sponsorship: sponsorshipId }),
  ]);
  if (!s) return null;
  const row = s as unknown as {
    id: string;
    payment_type: ProposalPaymentType;
    value: number | null;
    trade_description: string | null;
    trade_value: number | null;
    duration_months: number | null;
    start_date: string;
    athlete: { type: ProfileType } | null;
    proposal: { deliverables: string[] | null; message: string | null } | null;
  };
  const list = (parties ?? []) as ContractParty[];
  return {
    version: CONTRACT_VERSION,
    sponsorship_id: row.id,
    sponsee_type: row.athlete?.type ?? "athlete",
    company: list.find((p) => p.role === "company") ?? null,
    sponsee: list.find((p) => p.role === "sponsee") ?? null,
    payment_type: row.payment_type,
    value: row.value,
    trade_description: row.trade_description,
    trade_value: row.trade_value,
    duration_months: row.duration_months,
    start_date: row.start_date,
    deliverables: row.proposal?.deliverables ?? [],
    message: row.proposal?.message ?? null,
  };
}

/** SHA-256 dos termos (gravado na trilha de aceite). */
export function termsHash(t: ContractTerms): string {
  return createHash("sha256").update(JSON.stringify(t)).digest("hex");
}

function qualify(p: ContractParty | null, fallbackName: string): string {
  if (!p || !p.complete) {
    return `${fallbackName} — dados de qualificação ainda não preenchidos.`;
  }
  const doc = formatDocBR(p.document);
  const isCnpj = (p.document ?? "").length === 14;
  let s = `${p.legal_name}, inscrito(a) no ${isCnpj ? "CNPJ" : "CPF"} sob o nº ${doc}, com endereço em ${p.address}`;
  if (isCnpj && p.rep_name) {
    s += `, neste ato representado(a) por ${p.rep_name}, CPF nº ${formatDocBR(p.rep_cpf)}`;
  }
  return `${s}.`;
}

export type Clause = { title: string; paragraphs: string[] };

/** Texto do contrato-modelo, preenchido com os termos. */
export function contractClauses(
  t: ContractTerms,
  names: { company: string; sponsee: string },
): { parties: { label: string; text: string }[]; clauses: Clause[] } {
  const sponseeLabel = PARTICIPANT[t.sponsee_type].label.toLowerCase();
  const hasCash = t.payment_type !== "trade" && t.value != null;
  const hasTrade = t.payment_type !== "cash" && Boolean(t.trade_description);
  const city = t.sponsee?.address?.match(/, ([^,]+)\/[A-Z]{2}, CEP/)?.[1];

  const pagamento: string[] = [];
  if (hasCash) {
    pagamento.push(
      `A PATROCINADORA pagará ao PATROCINADO o valor de ${formatBRL(t.value!)} por mês de vigência, até o 10º (décimo) dia de cada mês, por PIX ou transferência para conta indicada pelo PATROCINADO, que emitirá o documento fiscal cabível quando aplicável.`,
    );
  }
  if (hasTrade) {
    pagamento.push(
      `A título de permuta, a PATROCINADORA fornecerá ao PATROCINADO: ${t.trade_description}${
        t.trade_value != null ? ` (valor estimado de ${formatBRL(t.trade_value)})` : ""
      }, nas condições combinadas entre as partes.`,
    );
  }
  pagamento.push(
    "O atraso no pagamento por mais de 15 (quinze) dias autoriza o PATROCINADO a suspender as contrapartidas até a regularização.",
  );

  const entregas =
    t.deliverables.length > 0
      ? t.deliverables.map((d) => `• ${deliverableLabel(d)}`)
      : ["• Conforme combinado entre as partes e registrado na plataforma."];

  const clauses: Clause[] = [
    {
      title: "Cláusula 1ª — Objeto",
      paragraphs: [
        `Este contrato tem por objeto o patrocínio do PATROCINADO (${sponseeLabel}) pela PATROCINADORA, mediante a divulgação da marca da PATROCINADORA por meio das contrapartidas descritas na Cláusula 2ª.`,
      ],
    },
    {
      title: "Cláusula 2ª — Contrapartidas (entregas)",
      paragraphs: [
        "O PATROCINADO se obriga às seguintes contrapartidas:",
        ...entregas,
        "Cada entrega é registrada na plataforma Sponsas com seu prazo e comprovada por link, print ou vídeo. A PATROCINADORA aprovará ou pedirá ajuste em até 7 (sete) dias da comprovação; sem manifestação nesse prazo, a entrega considera-se aceita.",
      ],
    },
    {
      title: "Cláusula 3ª — Valor e pagamento",
      paragraphs: pagamento,
    },
    {
      title: "Cláusula 4ª — Vigência",
      paragraphs: [
        t.duration_months != null
          ? `O contrato vigora por ${t.duration_months} ${t.duration_months === 1 ? "mês" : "meses"} a partir de ${formatDateBR(t.start_date)}, podendo ser renovado por novo acordo entre as partes.`
          : `O contrato vigora a partir de ${formatDateBR(t.start_date)}, por prazo indeterminado, até que uma das partes o encerre nos termos da Cláusula 7ª.`,
      ],
    },
    {
      title: "Cláusula 5ª — Uso de imagem e de marca",
      paragraphs: [
        "O PATROCINADO autoriza a PATROCINADORA a usar seu nome e imagem nas peças de divulgação do patrocínio durante a vigência. A PATROCINADORA autoriza o PATROCINADO a usar sua marca e logotipo exclusivamente nas contrapartidas deste contrato.",
        "Encerrado o contrato, cessa o direito de uso para novas peças, preservados os conteúdos já publicados durante a vigência.",
      ],
    },
    {
      title: "Cláusula 6ª — Obrigações das partes",
      paragraphs: [
        "O PATROCINADO se obriga a cumprir as contrapartidas nos prazos combinados e a manter conduta compatível com a imagem da PATROCINADORA.",
        "A PATROCINADORA se obriga a efetuar os pagamentos e/ou permutas nos prazos e a fornecer, a tempo, o material de marca necessário às entregas.",
      ],
    },
    {
      title: "Cláusula 7ª — Rescisão",
      paragraphs: [
        "Qualquer das partes pode encerrar o contrato mediante aviso com 30 (trinta) dias de antecedência, registrado na plataforma. O descumprimento grave de obrigação autoriza a rescisão imediata pela parte prejudicada.",
        "Na rescisão, são devidos os valores proporcionais ao período e às contrapartidas efetivamente cumpridos.",
      ],
    },
    {
      title: "Cláusula 8ª — Dados pessoais",
      paragraphs: [
        "As partes tratarão os dados pessoais uma da outra exclusivamente para a execução deste contrato, nos termos da Lei nº 13.709/2018 (LGPD).",
      ],
    },
    {
      title: "Cláusula 9ª — Aceite eletrônico",
      paragraphs: [
        "As partes reconhecem como válido o aceite eletrônico deste contrato na plataforma Sponsas, registrado com data, hora, endereço IP, dispositivo e código de integridade (hash) dos termos aceitos, nos termos do art. 10, § 2º, da MP nº 2.200-2/2001 e da Lei nº 14.063/2020.",
      ],
    },
    {
      title: "Cláusula 10ª — Foro",
      paragraphs: [
        city
          ? `Fica eleito o foro da comarca de ${city} para dirimir questões oriundas deste contrato.`
          : "Fica eleito o foro da comarca do domicílio do PATROCINADO para dirimir questões oriundas deste contrato.",
      ],
    },
  ];

  if (t.message) {
    clauses.push({
      title: "Condições adicionais combinadas",
      paragraphs: [t.message],
    });
  }

  return {
    parties: [
      { label: "PATROCINADORA", text: qualify(t.company, names.company) },
      { label: "PATROCINADO", text: qualify(t.sponsee, names.sponsee) },
    ],
    clauses,
  };
}
