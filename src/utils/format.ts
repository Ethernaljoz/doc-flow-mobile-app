const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

/** Date relative courte, façon iOS Files ("il y a 3 h", "12 mars"). */
export function formatRelativeDate(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < MIN) return "à l'instant";
  if (diff < HOUR) return `il y a ${Math.floor(diff / MIN)} min`;
  if (diff < DAY) return `il y a ${Math.floor(diff / HOUR)} h`;
  if (diff < 7 * DAY) return `il y a ${Math.floor(diff / DAY)} j`;
  return new Date(ts).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    ...(diff > 330 * DAY ? { year: 'numeric' } : {}),
  });
}
