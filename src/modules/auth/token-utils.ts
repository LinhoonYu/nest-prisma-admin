/** 解析 "7d" / "2h" / "30m" 格式的时长为秒数 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhdw])$/);
  if (!match) return 7 * 24 * 60 * 60;
  const [, num, unit] = match;
  const value = parseInt(num, 10);
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
  };
  return value * (multipliers[unit] || 86400);
}
