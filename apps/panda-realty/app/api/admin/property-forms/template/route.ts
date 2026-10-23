import "server-only"

import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"
import { db } from "@/db"
import { pandaProperties, propertyForms } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const { searchParams } = new URL(request.url)
  const propertyFormId = Number(searchParams.get("propertyFormId"))
  if (!propertyFormId) return adminJsonError("Missing propertyFormId", 400)

  const row = await db
    .select({ templateValues: propertyForms.templateValues })
    .from(propertyForms)
    .where(eq(propertyForms.propertyFormId, propertyFormId))
    .then((rows) => rows[0] ?? null)

  return NextResponse.json({ templateValues: row?.templateValues ?? null })
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)

  const body = (await request.json()) as {
    propertyFormId: number
    propertyListId?: number
    prefillStrategy?: string
    templateValues: Record<string, string>
  }
  const { propertyFormId, propertyListId, prefillStrategy, templateValues } = body
  if (!propertyFormId || !templateValues) return adminJsonError("Missing fields", 400)

  await db
    .update(propertyForms)
    .set({ templateValues })
    .where(eq(propertyForms.propertyFormId, propertyFormId))

  if (prefillStrategy === "form-6" && propertyListId) {
    type UpdateSet = Partial<typeof pandaProperties.$inferInsert>
    const upd: UpdateSet = {}
    const pick = (formKey: string, dbKey: keyof UpdateSet) => {
      const v = templateValues[formKey]
      if (v) (upd as Record<string, string>)[dbKey as string] = v
    }
    pick("seller1Name", "owner1name")
    pick("seller1NameLine2", "owner1nameLine2")
    pick("seller1Address", "owner1address")
    pick("seller1Address2", "owner1address2")
    pick("seller1Acn", "owner1acn")
    pick("seller1GstRegistered", "owner1gstRegistered")
    pick("seller1Fax", "owner1fax")
    pick("seller2Name", "owner2name")
    pick("seller2NameLine2", "owner2nameLine2")
    pick("seller2Address", "owner2address")
    pick("seller2Address2", "owner2address2")
    pick("seller2Acn", "owner2acn")
    pick("seller2GstRegistered", "owner2gstRegistered")
    pick("seller2Fax", "owner2fax")
    if (Object.keys(upd).length > 0) {
      await db.update(pandaProperties).set(upd).where(eq(pandaProperties.propertyListId, propertyListId))
    }
  }

  return NextResponse.json({ ok: true })
}
