export const FAVORITOS_KEY = "kyr:favoritos";

export function lerFavoritos(): string[] {
  try {
    const stored = window.localStorage.getItem(FAVORITOS_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed)
      ? parsed.filter((slug): slug is string => typeof slug === "string")
      : [];
  } catch {
    return [];
  }
}

export function alternarFavorito(slug: string): string[] {
  const current = lerFavoritos();
  const next = current.includes(slug)
    ? current.filter((savedSlug) => savedSlug !== slug)
    : [...current, slug];

  window.localStorage.setItem(FAVORITOS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("kyr:favoritos"));
  return next;
}