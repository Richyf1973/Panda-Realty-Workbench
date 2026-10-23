/**
 * Read relation / many-relation list filter values from URLSearchParams
 * (repeated keys and comma-separated lists when `multi` is true).
 */

export function splitRelationFilterRawTokens(raw: string): string[] {
  if (raw.includes(",")) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  }
  const t = raw.trim()
  return t === "" ? [] : [t]
}

export function relationFilterParamRawParts(
  searchParams: URLSearchParams,
  param: string,
  multi: boolean,
): string[] {
  if (multi) {
    const fromAll = searchParams
      .getAll(param)
      .flatMap((r) => splitRelationFilterRawTokens(r))
    if (fromAll.length > 0) return fromAll
    const single = searchParams.get(param)
    return single != null && single.trim() !== ""
      ? splitRelationFilterRawTokens(single)
      : []
  }
  const raw = searchParams.get(param)
  if (raw == null || raw.trim() === "") return []
  return [raw.trim()]
}
