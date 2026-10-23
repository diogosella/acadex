import { TaskPriority } from "@/types/task";

export type PriorityOption = {
  value: TaskPriority;
  label: string;
  color: string;
};

export const PRIORITY_OPTIONS: PriorityOption[] = [
  { value: "baixa", label: "Baixa", color: "#34C759" },
  { value: "media", label: "Média", color: "#FFD60A" },
  { value: "urgente", label: "Urgente", color: "#FF3B30" },
];

export const PRIORITY_RANK: Record<TaskPriority, number> = {
  urgente: 0,
  media: 1,
  baixa: 2,
};

export function getPriorityOption(priority: TaskPriority): PriorityOption {
  return (
    PRIORITY_OPTIONS.find((option) => option.value === priority) ??
    PRIORITY_OPTIONS[0]
  );
}

export type SubjectColorOption = {
  label: string;
  color: string;
};

export const SUBJECT_COLOR_OPTIONS: SubjectColorOption[] = [
  { label: "Azul", color: "#458FFF" },
  { label: "Verde", color: "#34C759" },
  { label: "Vermelho", color: "#FF3B30" },
  { label: "Laranja", color: "#FF9500" },
  { label: "Branco", color: "#FFFFFF" },
  { label: "Roxo", color: "#AF52DE" },
  { label: "Rosa", color: "#FF375F" },
  { label: "Amarelo", color: "#FFD60A" },
  { label: "Cinza", color: "#8E8E93" },
];
