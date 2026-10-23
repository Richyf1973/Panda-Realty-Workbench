import { readApiErrorMessage } from "./read-api-error"

/** DELETE `{apiBase}/{id}` with credentials; throws with API error message body when not ok. */
export async function deleteChildEntityRowViaImmediateApi(
  apiBase: string,
  idStr: string,
): Promise<void> {
  const res = await fetch(
    `${apiBase.replace(/\/$/, "")}/${encodeURIComponent(idStr)}`,
    { method: "DELETE", credentials: "include" },
  )
  if (!res.ok) throw new Error(await readApiErrorMessage(res))
}
