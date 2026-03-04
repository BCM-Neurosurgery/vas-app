export function utcIsoNow(): string {
  return new Date().toISOString();
}

export function toUtcIso(d: Date): string {
  return d.toISOString();
}

export function fromIsoToDate(iso: string): Date {
  return new Date(iso);
}