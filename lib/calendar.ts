export type CalendarCell = { iso: string; day: number; inMonth: boolean };

/** Grade de 42 dias (6 semanas, domingo a sábado) cobrindo o mês. */
export function monthGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(Date.UTC(year, month, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());

  const cells: CalendarCell[] = [];
  const cursor = new Date(start);
  for (let i = 0; i < 42; i++) {
    cells.push({
      iso: cursor.toISOString().slice(0, 10),
      day: cursor.getUTCDate(),
      inMonth: cursor.getUTCMonth() === month,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return cells;
}

export const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

export const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
