import "server-only"

import { sql } from "drizzle-orm"
import { NextResponse } from "next/server"

import { adminJsonError } from "@repo/admin/admin-api"
import { db } from "@/db"
import { getSessionUser } from "@/lib/auth/session"

/**
 * Storage for the Property Sale Timeline (see lib/sale-timeline).
 * Documents live in panda_realty.sale_timeline_docs, keyed by (collection, doc_id):
 *   sales/<id>        one sale timeline (id "property-<property_list_id>" when opened from a property)
 *   settings/agency   agency, trust account and invoice-numbering settings
 */
const COLLECTIONS = new Set(["sales", "settings"])
const ID_RE = /^[A-Za-z0-9_-]{1,80}$/
const MAX_BYTES = 2_000_000

function validKey(collection: unknown, id: unknown) {
  return typeof collection === "string" && COLLECTIONS.has(collection) && (id == null || (typeof id === "string" && ID_RE.test(id)))
}

export async function GET(request: Request) {
  if (!(await getSessionUser())) return adminJsonError("Unauthorized", 401)
  const url = new URL(request.url)
  const collection = url.searchParams.get("collection")
  const id = url.searchParams.get("id")
  if (!validKey(collection, id)) return adminJsonError("Invalid document path", 400)

  if (id) {
    const rows = await db.execute<{ data: unknown }>(
      sql`select data from panda_realty.sale_timeline_docs where collection = ${collection} and doc_id = ${id}`,
    )
    return NextResponse.json({ data: rows[0]?.data ?? null })
  }
  const rows = await db.execute<{ doc_id: string; data: unknown }>(
    sql`select doc_id, data from panda_realty.sale_timeline_docs where collection = ${collection} order by updated_at desc`,
  )
  return NextResponse.json({ docs: rows.map((r) => ({ id: r.doc_id, data: r.data })) })
}

export async function PUT(request: Request) {
  const user = await getSessionUser()
  if (!user) return adminJsonError("Unauthorized", 401)
  const text = await request.text()
  if (text.length > MAX_BYTES) return adminJsonError("Document too large", 413)
  let body: { collection?: unknown; id?: unknown; data?: unknown }
  try {
    body = JSON.parse(text)
  } catch {
    return adminJsonError("Invalid JSON body", 400)
  }
  if (!validKey(body.collection, body.id) || typeof body.id !== "string") return adminJsonError("Invalid document path", 400)
  if (body.data == null || typeof body.data !== "object") return adminJsonError("Missing data", 400)

  await db.execute(sql`
    insert into panda_realty.sale_timeline_docs (collection, doc_id, data, updated_at, updated_by)
    values (${body.collection as string}, ${body.id}, ${JSON.stringify(body.data)}::jsonb, now(), ${user.email ?? null})
    on conflict (collection, doc_id)
    do update set data = excluded.data, updated_at = now(), updated_by = excluded.updated_by`)
  return new NextResponse(null, { status: 204 })
}

export async function DELETE(request: Request) {
  if (!(await getSessionUser())) return adminJsonError("Unauthorized", 401)
  const url = new URL(request.url)
  const collection = url.searchParams.get("collection")
  const id = url.searchParams.get("id")
  if (!validKey(collection, id) || !id) return adminJsonError("Invalid document path", 400)
  await db.execute(sql`delete from panda_realty.sale_timeline_docs where collection = ${collection} and doc_id = ${id}`)
  return new NextResponse(null, { status: 204 })
}
