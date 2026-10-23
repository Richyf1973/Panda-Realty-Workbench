import postgres from "postgres"

function getDb() {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) throw new Error("DATABASE_URL is required")
  return postgres(url, { max: 1 })
}

/**
 * Removes any property_entities links and the entity itself for the given name.
 * Safe to call when no rows exist (no-op).
 */
export async function deletePandaPropertyTenantByName(entityName: string): Promise<void> {
  const sql = getDb()
  try {
    await sql`
      DELETE FROM panda_realty.property_entities
      WHERE entity_id IN (
        SELECT entity_id FROM panda_realty.entities WHERE entity_name = ${entityName}
      )
    `
    await sql`DELETE FROM panda_realty.entities WHERE entity_name = ${entityName}`
  } finally {
    await sql.end({ timeout: 5 })
  }
}

/**
 * Creates an entity (category 3 = Tenant) and links it to the property.
 * No-ops if entity or link already exists.
 */
export async function createPandaPropertyTenant(
  propertyStreetAddress: string,
  tenant: {
    name: string
    email?: string
    phone?: string
    address?: string
    suburb?: string
    state?: string
    postcode?: string
    notes?: string
  },
): Promise<void> {
  const sql = getDb()
  try {
    const props = await sql`
      SELECT property_list_id FROM panda_realty.panda_properties
      WHERE LOWER(street_address) = LOWER(${propertyStreetAddress})
      LIMIT 1
    `
    if (props.length === 0) throw new Error(`Property not found: ${propertyStreetAddress}`)
    const propertyListId = props[0].property_list_id

    const existing = await sql`
      SELECT entity_id FROM panda_realty.entities WHERE entity_name = ${tenant.name} LIMIT 1
    `
    let entityId: number
    if (existing.length > 0) {
      entityId = Number(existing[0].entity_id)
    } else {
      const [ins] = await sql`
        INSERT INTO panda_realty.entities
          (entity_category_id, entity_name, contact, email_address, address,
           esuburb, estate, epostcode, notes)
        VALUES
          (3, ${tenant.name}, ${tenant.phone ?? null}, ${tenant.email ?? null},
           ${tenant.address ?? null}, ${tenant.suburb ?? null}, ${tenant.state ?? null},
           ${tenant.postcode ?? null}, ${tenant.notes ?? null})
        RETURNING entity_id
      `
      entityId = Number(ins.entity_id)
    }

    const linked = await sql`
      SELECT property_entity_id FROM panda_realty.property_entities
      WHERE property_list_id = ${propertyListId} AND entity_id = ${entityId}
      LIMIT 1
    `
    if (linked.length === 0) {
      await sql`
        INSERT INTO panda_realty.property_entities (entity_id, property_list_id)
        VALUES (${entityId}, ${propertyListId})
      `
    }
  } finally {
    await sql.end({ timeout: 5 })
  }
}

export interface PandaPropertyTenantRow {
  propertyEntityId: number
  entityId: number
  entityName: string
  phoneNumber: string | null
  emailAddress: string | null
  address: string | null
  esuburb: string | null
  estate: string | null
  epostcode: string | null
  notes: string | null
}

/**
 * Returns the saved junction + entity fields for a tenant by property street address and
 * entity name, or null if not found.
 */
export async function getPandaPropertyTenantByName(
  propertyStreetAddress: string,
  entityName: string,
): Promise<PandaPropertyTenantRow | null> {
  const sql = getDb()
  try {
    const rows = await sql`
      SELECT
        pe.property_entity_id,
        e.entity_id,
        e.entity_name,
        e.contact AS phone_number,
        e.email_address,
        e.address,
        e.esuburb,
        e.estate,
        e.epostcode,
        e.notes
      FROM panda_realty.property_entities pe
      JOIN panda_realty.entities e ON e.entity_id = pe.entity_id
      JOIN panda_realty.panda_properties pp ON pp.property_list_id = pe.property_list_id
      WHERE LOWER(pp.street_address) = LOWER(${propertyStreetAddress})
        AND e.entity_name = ${entityName}
        AND e.entity_category_id = 3
      LIMIT 1
    `
    if (rows.length === 0) return null
    const r = rows[0]
    return {
      propertyEntityId: Number(r.property_entity_id),
      entityId: Number(r.entity_id),
      entityName: String(r.entity_name),
      phoneNumber: r.phone_number != null ? String(r.phone_number) : null,
      emailAddress: r.email_address != null ? String(r.email_address) : null,
      address: r.address != null ? String(r.address) : null,
      esuburb: r.esuburb != null ? String(r.esuburb) : null,
      estate: r.estate != null ? String(r.estate) : null,
      epostcode: r.epostcode != null ? String(r.epostcode) : null,
      notes: r.notes != null ? String(r.notes) : null,
    }
  } finally {
    await sql.end({ timeout: 5 })
  }
}
