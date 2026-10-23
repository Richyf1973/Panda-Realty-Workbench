export type PandaPropertyQuickCardOwner = {
  readonly ownerNum: 1 | 2 | 3
  readonly name: string
  readonly phone: string | null
  readonly email: string | null
}

type PandaPropertyQuickCardOwnerRow = Partial<
  Record<
    | "owner1name"
    | "owner1phone"
    | "owner1email"
    | "owner2name"
    | "owner2phone"
    | "owner2email"
    | "owner3name"
    | "owner3phone"
    | "owner3email",
    unknown
  >
>

function trimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function getPandaPropertyQuickCardOwners(
  row: PandaPropertyQuickCardOwnerRow,
): PandaPropertyQuickCardOwner[] {
  const owners: PandaPropertyQuickCardOwner[] = []

  for (const ownerNum of [1, 2, 3] as const) {
    const name = trimmedString(row[`owner${ownerNum}name`])
    if (name === "") continue
    const phone = trimmedString(row[`owner${ownerNum}phone`])
    const email = trimmedString(row[`owner${ownerNum}email`])
    owners.push({
      ownerNum,
      name,
      phone: phone === "" ? null : phone,
      email: email === "" ? null : email,
    })
  }

  return owners
}
