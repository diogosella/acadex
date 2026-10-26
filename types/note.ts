export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  // Última edição do título ou do conteúdo (classe Nota: dataAtualizacao).
  // Ausente nas notas que nunca foram editadas (e nas salvas por versões
  // antigas do app): nesse caso vale o createdAt.
  updatedAt?: number;
}
