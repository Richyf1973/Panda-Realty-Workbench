import "server-only"

import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { z } from "zod"

import { adminJsonError } from "@repo/admin/admin-api"
import { getSessionUser } from "@/lib/auth/session"
import { db } from "@/db"
import { pandaProperties } from "@/db/schema"

const propertyImportRowSchema = z.object({
  streetAddress: z.string().min(1),
  suburb: z.string().min(1),
  state: z.string().min(1),
  postcode: z.string().min(1),
  councilArea: z.string().nullable(),
  propertyType: z.string().min(1),
  bed: z.number().int(),
  bath: z.number().int(),
  car: z.number().int(),
  landSize: z.string().nullable(),
  buildingArea: z.number().int().nullable(),
  yearBuilt: z.number().int().nullable(),
  salePrice: z.string().nullable(),
  saleDate: z.string().nullable(),
  settlementDate: z.string().nullable(),
  saleType: z.string().nullable(),
  agency: z.string().nullable(),
  agent: z.string().nullable(),
  improve: z.string().nullable(),
  construction: z.string().nullable(),
  landUse1: z.string().nullable(),
  zoning: z.string().nullable(),
  developmentZone: z.string().nullable(),
  primaryPlan: z.string().nullable(),
  rpd: z.string().nullable(),
  valuationNo: z.string().nullable(),
  valuationType: z.string().nullable(),
  valuationAmount: z.string().nullable(),
  valuationDate: z.string().nullable(),
  owner1name: z.string().nullable(),
  owner1address: z.string().nullable(),
  owner2name: z.string().nullable(),
  owner2address: z.string().nullable(),
  owner3name: z.string().nullable(),
  owner3address: z.string().nullable(),
  ownerType: z.string().nullable(),
  vendor1name: z.string().nullable(),
  vendor1address: z.string().nullable(),
  vendor2name: z.string().nullable(),
  vendor2address: z.string().nullable(),
  vendor3name: z.string().nullable(),
  vendor3address: z.string().nullable(),
  relationship: z.string().nullable(),
  openInRpp: z.string().nullable(),
})

const requestBodySchema = z.object({
  rows: z.array(propertyImportRowSchema).min(1).max(1_000),
  mode: z.enum(["insert_only", "upsert"]).default("upsert"),
})

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return adminJsonError("Invalid JSON body", 400)
  }

  const parsed = requestBodySchema.safeParse(body)
  if (!parsed.success) {
    return adminJsonError(
      `Validation failed: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
      400,
    )
  }

  const { rows, mode } = parsed.data
  const errors: Array<{ address: string; reason: string }> = []

  // Build Drizzle-compatible values, filtering out rows that will fail
  const values: Array<typeof pandaProperties.$inferInsert> = []
  for (const row of rows) {
    try {
      values.push({
        streetAddress: row.streetAddress,
        suburb: row.suburb,
        state: row.state,
        postcode: row.postcode,
        councilArea: row.councilArea,
        propertyType: row.propertyType,
        bed: row.bed,
        bath: row.bath,
        car: row.car,
        landSize: row.landSize,
        buildingArea: row.buildingArea,
        yearBuilt: row.yearBuilt,
        salePrice: row.salePrice,
        saleDate: row.saleDate ? new Date(row.saleDate) : null,
        settlementDate: row.settlementDate
          ? new Date(row.settlementDate)
          : null,
        saleType: row.saleType,
        agency: row.agency,
        agent: row.agent,
        improve: row.improve,
        construction: row.construction,
        landUse1: row.landUse1,
        zoning: row.zoning,
        developmentZone: row.developmentZone,
        primaryPlan: row.primaryPlan,
        rpd: row.rpd,
        valuationNo: row.valuationNo,
        valuationType: row.valuationType,
        valuationAmount: row.valuationAmount,
        valuationDate: row.valuationDate ? new Date(row.valuationDate) : null,
        owner1name: row.owner1name,
        owner1address: row.owner1address ?? row.streetAddress,
        owner2name: row.owner2name,
        owner2address: row.owner2address ?? row.streetAddress,
        owner3name: row.owner3name,
        owner3address: row.owner3address ?? row.streetAddress,
        ownerType: row.ownerType,
        vendor1name: row.vendor1name,
        vendor1address: row.vendor1address,
        vendor2name: row.vendor2name,
        vendor2address: row.vendor2address,
        vendor3name: row.vendor3name,
        vendor3address: row.vendor3address,
        relationship: row.relationship,
        openInRpp: row.openInRpp,
      })
    } catch (err) {
      errors.push({
        address: `${row.streetAddress}, ${row.suburb}`,
        reason: err instanceof Error ? err.message : String(err),
      })
    }
  }

  if (values.length === 0) {
    return NextResponse.json({
      inserted: 0,
      updated: 0,
      skippedExisting: 0,
      failed: errors.length,
      errors,
    })
  }

  try {
    // Rows with openInRpp: conflict on unique open_in_rpp. Rows without: plain insert.
    const keyedRows = values.filter((v) => v.openInRpp != null && v.openInRpp !== "")
    const unkeyedRows = values.filter((v) => v.openInRpp == null || v.openInRpp === "")

    let keyedInserted = 0
    let skippedExisting = 0

    if (keyedRows.length > 0) {
      if (mode === "insert_only") {
        const inserted = await db
          .insert(pandaProperties)
          .values(keyedRows)
          .onConflictDoNothing({ target: pandaProperties.openInRpp })
          .returning({ propertyListId: pandaProperties.propertyListId })
        keyedInserted = inserted.length
        skippedExisting = keyedRows.length - keyedInserted
      } else {
        await db
          .insert(pandaProperties)
          .values(keyedRows)
          .onConflictDoUpdate({
            target: pandaProperties.openInRpp,
            set: {
              streetAddress: sql`excluded.street_address`,
              suburb: sql`excluded.suburb`,
              state: sql`excluded.state`,
              postcode: sql`excluded.postcode`,
              councilArea: sql`excluded.council_area`,
              propertyType: sql`excluded.property_type`,
              bed: sql`excluded.bed`,
              bath: sql`excluded.bath`,
              car: sql`excluded.car`,
              landSize: sql`excluded.land_size`,
              buildingArea: sql`excluded.building_area`,
              yearBuilt: sql`excluded.year_built`,
              salePrice: sql`excluded.sale_price`,
              saleDate: sql`excluded.sale_date`,
              settlementDate: sql`excluded.settlement_date`,
              saleType: sql`excluded.sale_type`,
              agency: sql`excluded.agency`,
              agent: sql`excluded.agent`,
              improve: sql`excluded.improve`,
              construction: sql`excluded.construction`,
              landUse1: sql`excluded.land_use1`,
              zoning: sql`excluded.zoning`,
              developmentZone: sql`excluded.development_zone`,
              primaryPlan: sql`excluded.primary_plan`,
              rpd: sql`excluded.rpd`,
              valuationNo: sql`excluded.valuation_no`,
              valuationType: sql`excluded.valuation_type`,
              valuationAmount: sql`excluded.valuation_amount`,
              valuationDate: sql`excluded.valuation_date`,
              owner1name: sql`excluded.owner1name`,
              owner1address: sql`excluded.owner1address`,
              owner2name: sql`excluded.owner2name`,
              owner2address: sql`excluded.owner2address`,
              owner3name: sql`excluded.owner3name`,
              owner3address: sql`excluded.owner3address`,
              ownerType: sql`excluded.owner_type`,
              vendor1name: sql`excluded.vendor1name`,
              vendor1address: sql`excluded.vendor1address`,
              vendor2name: sql`excluded.vendor2name`,
              vendor2address: sql`excluded.vendor2address`,
              vendor3name: sql`excluded.vendor3name`,
              vendor3address: sql`excluded.vendor3address`,
              relationship: sql`excluded.relationship`,
              updatedAt: sql`now()`,
            },
          })
        keyedInserted = keyedRows.length
      }
    }

    let unkeyedInserted = 0
    if (unkeyedRows.length > 0) {
      await db.insert(pandaProperties).values(unkeyedRows)
      unkeyedInserted = unkeyedRows.length
    }

    if (mode === "insert_only") {
      return NextResponse.json({
        inserted: keyedInserted + unkeyedInserted,
        updated: 0,
        skippedExisting,
        failed: errors.length,
        errors,
      })
    }

    return NextResponse.json({
      inserted: keyedInserted + unkeyedInserted,
      updated: 0,
      skippedExisting: 0,
      failed: errors.length,
      errors,
    })
  } catch (err) {
    console.error("[POST /api/admin/properties/import]", err)
    return adminJsonError(
      `Import failed: ${err instanceof Error ? err.message : String(err)}`,
      500,
    )
  }
}
