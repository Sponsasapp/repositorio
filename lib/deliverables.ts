/** Tipos de entrega que um piloto pode oferecer a um patrocinador. */
export const OFFERED_DELIVERABLES: { value: string; label: string }[] = [
  { value: "logo_carro", label: "Logo no carro" },
  { value: "logo_uniforme", label: "Logo no uniforme" },
  { value: "reels", label: "Reels" },
  { value: "stories", label: "Stories" },
  { value: "posts", label: "Posts no feed" },
  { value: "evento", label: "Presença em eventos" },
  { value: "conteudo", label: "Conteúdo personalizado" },
];

const OFFERED_MAP = new Map(OFFERED_DELIVERABLES.map((d) => [d.value, d.label]));

export function deliverableLabel(value: string): string {
  return OFFERED_MAP.get(value) ?? value;
}

/** Ramos do automotivo que um piloto aceita patrocinar. */
export const SPONSOR_CATEGORIES = [
  "Autopeças",
  "Lubrificantes e óleo",
  "Pneus",
  "Bebidas energéticas",
  "Vestuário e uniformes",
  "Ferramentas e equipamentos",
  "Rodas, freios e suspensão",
  "Som, acessórios e estética",
  "Combustível e aditivos",
] as const;

/** Divide um campo de texto "a, b, c" em array limpo. */
export function parseCsv(input: FormDataEntryValue | null): string[] {
  return String(input ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
