export function clean(value) {
  return String(value ?? "").trim();
}

export function normalizedToken(value) {
  return clean(value).toLowerCase().replace(/[-\s]+/g, "_");
}

export function compactUniqueStrings(values = [], limit = Number.POSITIVE_INFINITY) {
  const cleaned = Array.from(new Set(values.map(clean).filter(Boolean)));
  return cleaned.slice(0, limit);
}
