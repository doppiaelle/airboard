export function semanticChoices(element) {
  const seen = new Set();
  return [
    { char: element?.content, confidence: element?.confidence ?? 0 },
    ...(element?.alternatives || []),
  ]
    .map((choice) => ({
      char: String(choice?.char ?? "")
        .trim()
        .slice(0, 4),
      confidence: Number(choice?.confidence) || 0,
    }))
    .filter(
      (choice) =>
        choice.char && !seen.has(choice.char) && seen.add(choice.char),
    )
    .slice(0, 7);
}

export function correctSemanticElement(elements, id, content) {
  const next = String(content ?? "")
    .trim()
    .slice(0, 4);
  if (!next) return null;
  const index = elements.findIndex((element) => element.id === id);
  if (index < 0) return null;
  const result = structuredClone(elements);
  result[index] = {
    ...result[index],
    content: next,
    confidence: 1,
    confirmed: true,
    provisional: false,
    manual: true,
  };
  return result;
}

export function deleteSemanticElement(elements, id) {
  if (!elements.some((element) => element.id === id)) return null;
  return elements.filter((element) => element.id !== id);
}
