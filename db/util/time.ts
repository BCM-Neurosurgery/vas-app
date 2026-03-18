export function utcIsoNow(): string {
  return new Date().toISOString();
}

export function toUtcIso(d: Date): string {
  return d.toISOString();
}

export function fromIsoToDate(iso: string): Date {
  const hasExplicitTimezone = /(?:Z|[+-]\d{2}:\d{2})$/.test(iso);
  const normalized = hasExplicitTimezone ? iso : `${iso}Z`;
  return new Date(normalized);
}
