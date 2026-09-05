export type DebugOptions = {
  enabled: boolean;
  levelId: number | null;
};

export function parseDebugOptions(
  search: string,
  levelCount: number
): DebugOptions {
  const params = new URLSearchParams(search);
  const value = params.get("debug");
  const enabled = value === "1" || value === "true";
  const requestedLevel = Number(params.get("level"));
  const levelId =
    enabled &&
    Number.isInteger(requestedLevel) &&
    requestedLevel >= 1 &&
    requestedLevel <= levelCount
      ? requestedLevel
      : null;

  return { enabled, levelId };
}
