export function normalizeName(value: string): string {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('nl-BE').replace(/[’'`-]/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

export function nameKeys(firstName: string, lastName: string): string[] {
  const forward=normalizeName(`${firstName} ${lastName}`), reverse=normalizeName(`${lastName} ${firstName}`);
  return [...new Set([forward, reverse, forward.split(' ').sort().join(' ')])];
}

export function sourceNameKeys(fullName: string): string[] {
  const normal = normalizeName(fullName);
  const parts = normal.split(' ');
  const reversed = parts.length > 1 ? [...parts].reverse().join(' ') : normal;
  return [...new Set([normal, reversed, parts.sort().join(' ')])];
}

export function resolveName(source: string, candidates: Array<{ id: number; firstName: string; lastName: string }>, aliases: Record<string,string> = {}) {
  const sourceKey = normalizeName(source);
  const aliasTarget = aliases[sourceKey] ?? aliases[source];
  const keys = sourceNameKeys(aliasTarget ?? source);
  const matches = candidates.filter((p) => nameKeys(p.firstName, p.lastName).some((k) => keys.includes(k)));
  return matches.length === 1 ? { status: 'matched' as const, player: matches[0] } : matches.length > 1 ? { status: 'ambiguous' as const } : { status: 'unmatched' as const };
}
