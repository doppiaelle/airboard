export const AIRBOARD_AI_CONTRACT_VERSION = 3;

export function normalizeCloudRefinement(value) {
  if (
    value?.version !== AIRBOARD_AI_CONTRACT_VERSION ||
    !Array.isArray(value.units)
  )
    return null;
  const units = value.units.flatMap((unit) => {
    const id = String(unit?.id || "").trim(),
      content = String(unit?.content || "").trim();
    if (!id || !content) return [];
    const raw = Number(unit.confidence),
      confidence = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0.75;
    return [{ id, content, confidence }];
  });
  return { version: AIRBOARD_AI_CONTRACT_VERSION, units };
}
