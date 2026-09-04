export function createId(
  prefix = 'item'
): string {
  const randomPart = Math.random()
    .toString(36)
    .slice(2, 9);

  return `${prefix}_${Date.now()}_${randomPart}`;
}