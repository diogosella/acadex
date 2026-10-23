export type NotifyBeforeOption = {
  label: string;
  minutes: number | null;
};

export const NOTIFY_BEFORE_OPTIONS: NotifyBeforeOption[] = [
  { label: "Não notificar", minutes: null },
  { label: "No horário do evento", minutes: 0 },
  { label: "10 minutos antes", minutes: 10 },
  { label: "30 minutos antes", minutes: 30 },
  { label: "1 hora antes", minutes: 60 },
  { label: "1 dia antes", minutes: 1440 },
];

export const DEFAULT_NOTIFY_BEFORE_MINUTES = 10;

export const HOUR_OPTIONS: string[] = Array.from({ length: 24 }, (_, hour) =>
  hour.toString().padStart(2, "0")
);

// Em desenvolvimento, todos os minutos (00–59) ficam disponíveis, para dar
// pra testar notificações criando um evento para daqui 1–2 minutos com
// "No horário do evento". No app final, só intervalos de 15 minutos.
export const MINUTE_OPTIONS: string[] = __DEV__
  ? Array.from({ length: 60 }, (_, minute) => minute.toString().padStart(2, "0"))
  : ["00", "15", "30", "45"];

const MONTH_NAMES_PT = [
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

const WEEKDAY_NAMES_PT = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

// Quantidade de dias de um mês (0-indexado), já tratando corretamente anos
// bissextos (ex: getDaysInMonth(2028, 1) === 29).
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function formatMonthLabel(year: number, month: number): string {
  return `${MONTH_NAMES_PT[month]} ${year}`;
}

export function formatWeekdayAndDay(year: number, month: number, day: number): string {
  const date = new Date(year, month, day);
  return `${WEEKDAY_NAMES_PT[date.getDay()]}, ${day} de ${MONTH_NAMES_PT[month].toLowerCase()}`;
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

export function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}
