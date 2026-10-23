import "server-only"

import { sql } from "drizzle-orm"

import { db } from "@/db"
import type { SellerRow } from "./sellers-types"

export type { SellerRow }

export const SELLERS_PAGE_SIZE = 50

type SellerSqlRow = {
  name: string
  address: string | null
  phone: string | null
  email: string | null
  property_address: string
  property_list_id: string
}

function searchClause(
  pattern: string,
  nameCol: string,
  addrCol: string,
  phoneCol: string,
  emailCol: string,
) {
  return sql`AND (${sql.raw(nameCol)} ILIKE ${pattern} OR ${sql.raw(addrCol)} ILIKE ${pattern} OR ${sql.raw(phoneCol)} ILIKE ${pattern} OR ${sql.raw(emailCol)} ILIKE ${pattern})`
}

export async function querySellers(
  page: number,
  limit: number,
  search?: string,
): Promise<{ rows: SellerRow[]; total: number }> {
  const offset = (page - 1) * limit
  const pattern = search ? `%${search}%` : undefined

  const s1 = pattern ? searchClause(pattern, "owner1name", "owner1address", "owner1phone", "owner1email") : sql``
  const s2 = pattern ? searchClause(pattern, "owner2name", "owner2address", "owner2phone", "owner2email") : sql``
  const s3 = pattern ? searchClause(pattern, "owner3name", "owner3address", "owner3phone", "owner3email") : sql``

  const [countRow] = await db.execute<{ total: string }>(sql`
    SELECT COUNT(*)::int AS total FROM (
      SELECT owner1name AS name, owner1address AS address, owner1phone AS phone, owner1email AS email
        FROM panda_realty.panda_properties
       WHERE is_favorite = true AND owner1name IS NOT NULL ${s1}
      UNION ALL
      SELECT owner2name, owner2address, owner2phone, owner2email
        FROM panda_realty.panda_properties
       WHERE is_favorite = true AND owner2name IS NOT NULL ${s2}
      UNION ALL
      SELECT owner3name, owner3address, owner3phone, owner3email
        FROM panda_realty.panda_properties
       WHERE is_favorite = true AND owner3name IS NOT NULL ${s3}
    ) sub
  `)

  const rawRows = await db.execute<SellerSqlRow>(sql`
    SELECT owner1name AS name, owner1address AS address, owner1phone AS phone, owner1email AS email,
           street_address AS property_address, property_list_id
      FROM panda_realty.panda_properties
     WHERE is_favorite = true AND owner1name IS NOT NULL ${s1}
    UNION ALL
    SELECT owner2name, owner2address, owner2phone, owner2email, street_address, property_list_id
      FROM panda_realty.panda_properties
     WHERE is_favorite = true AND owner2name IS NOT NULL ${s2}
    UNION ALL
    SELECT owner3name, owner3address, owner3phone, owner3email, street_address, property_list_id
      FROM panda_realty.panda_properties
     WHERE is_favorite = true AND owner3name IS NOT NULL ${s3}
    ORDER BY property_address, property_list_id
    LIMIT ${limit} OFFSET ${offset}
  `)

  return {
    rows: rawRows.map((r) => ({
      name: r.name,
      address: r.address ?? null,
      phone: r.phone ?? null,
      email: r.email ?? null,
      propertyAddress: r.property_address,
      propertyListId: Number(r.property_list_id),
    })),
    total: Number((countRow as { total: string } | undefined)?.total ?? 0),
  }
}
