export function normalizeImageTags(input: unknown): string[] {
  const raw = Array.isArray(input) ? input : [];
  const unique: string[] = [];

  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const tag = item.trim();
    if (!tag) continue;
    if (!unique.includes(tag)) {
      unique.push(tag);
    }
  }

  if (!unique.includes('module')) {
    unique.unshift('module');
  }

  return unique.slice(0, 3);
}
