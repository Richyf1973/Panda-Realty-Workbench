import postgres from "postgres"

function getDb() {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) throw new Error("DATABASE_URL is required")
  return postgres(url, { max: 1 })
}

/** Read contract_date for a property row. Returns null if the column is NULL. */
export async function getPropertyContractDate(propertyListId: number): Promise<Date | null> {
  const sql = getDb()
  try {
    const rows = await sql`
      SELECT contract_date
      FROM panda_realty.panda_properties
      WHERE property_list_id = ${propertyListId}
      LIMIT 1
    `
    if (rows.length === 0) throw new Error(`Property ${propertyListId} not found`)
    const raw = rows[0].contract_date
    return raw != null ? (raw instanceof Date ? raw : new Date(raw as string)) : null
  } finally {
    await sql.end({ timeout: 5 })
  }
}

/** Overwrite contract_date for a property row. Pass null to clear it. Used to restore state after tests. */
export async function setPropertyContractDate(
  propertyListId: number,
  date: Date | null,
): Promise<void> {
  const sql = getDb()
  try {
    await sql`
      UPDATE panda_realty.panda_properties
      SET contract_date = ${date}
      WHERE property_list_id = ${propertyListId}
    `
  } finally {
    await sql.end({ timeout: 5 })
  }
}

/** Look up property_list_id by a street_address ILIKE snippet. Throws if not found. */
export async function getPropertyListIdByAddressSnippet(snippet: string): Promise<number> {
  const sql = getDb()
  try {
    const rows = await sql`
      SELECT property_list_id
      FROM panda_realty.panda_properties
      WHERE street_address ILIKE ${"%" + snippet + "%"}
      ORDER BY property_list_id
      LIMIT 1
    `
    if (rows.length === 0) throw new Error(`No property found matching "${snippet}"`)
    return Number(rows[0].property_list_id)
  } finally {
    await sql.end({ timeout: 5 })
  }
}
