export function formatRouteTotal(
  values: Array<number | null>,
  kind: "distance" | "duration",
): string {
  if (values.length === 0 || values.some((value) => value === null)) {
    return "Indisponível";
  }

  const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  if (kind === "distance") {
    return `${(total / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
  }

  const minutes = Math.round(total / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 ? `${hours}h ${remainingMinutes}min` : `${minutes} min`;
}