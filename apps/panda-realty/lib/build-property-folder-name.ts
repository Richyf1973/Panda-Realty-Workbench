export function buildPropertyFolderName(
  streetAddress: string,
  suburb: string,
  state: string,
  postcode: string,
): string {
  return [streetAddress, suburb, state, postcode].map((s) => s.trim()).join(" ")
}
