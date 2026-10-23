import postgres from "postgres"

function getDb() {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) throw new Error("DATABASE_URL is required")
  return postgres(url, { max: 1 })
}

export type SeedSellerPropertyOptions = {
  streetAddress: string
  owner1name: string
  isFavorite: boolean
  owner1address?: string
  owner1phone?: string
  owner1email?: string
}

/** Inserts a minimal property with an owner name and returns its propertyListId. */
export async function seedSellerProperty(opts: SeedSellerPropertyOptions): Promise<number> {
  const sql = getDb()
  try {
    const [row] = await sql`
      INSERT INTO panda_realty.panda_properties
        (street_address, suburb, state, postcode, property_type, owner1name, owner1address, owner1phone, owner1email, is_favorite)
      VALUES
        (${opts.streetAddress}, 'Testville', 'QLD', '4000', 'House', ${opts.owner1name},
         ${opts.owner1address ?? null}, ${opts.owner1phone ?? null}, ${opts.owner1email ?? null},
         ${opts.isFavorite})
      RETURNING property_list_id
    `
    return Number(row.property_list_id)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

/** Removes a property by its propertyListId. Safe to call when the row does not exist. */
export async function deleteSellerProperty(propertyListId: number): Promise<void> {
  const sql = getDb()
  try {
    await sql`DELETE FROM panda_realty.panda_properties WHERE property_list_id = ${propertyListId}`
  } finally {
    await sql.end({ timeout: 5 })
  }
}
