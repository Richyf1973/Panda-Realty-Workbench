export async function patchFileSharedWithPortal(
  kind: string,
  fileId: number,
  value: boolean,
): Promise<boolean> {
  const url =
    kind === "entity"
      ? `/api/admin/property-entity-files/${fileId}`
      : `/api/admin/property-list-files/${fileId}`
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sharedWithPortal: value }),
  })
  return res.ok
}
