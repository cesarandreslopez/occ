export interface DocumentProperties {
  title?: string;
  subject?: string;
  author?: string;
  company?: string;
  createdDate?: string;
  modifiedDate?: string;
  lastModifiedBy?: string;
  keywords?: string;
}

export function estimateTokens(input: string | number): number {
  const chars = typeof input === 'number' ? input : input.length;
  return Math.max(0, Math.ceil(chars / 4));
}

export function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function formatDateLike(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.trim()) return value;
  return undefined;
}

export function createInspectPayload<T>(file: string, query: Record<string, unknown>, results: T): { file: string; query: Record<string, unknown>; results: T } {
  return { file, query, results };
}
