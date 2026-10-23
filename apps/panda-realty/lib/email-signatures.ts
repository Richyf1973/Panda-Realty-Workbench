import "server-only"

import { and, asc, desc, eq, ne, sql } from "drizzle-orm"

import { db } from "@/db"
import { emailSignatures } from "@/db/schema"
import {
  normalizeEmailSignatureHtml,
  renderEmailSignatureHtml,
  type EmailSignatureRecord,
} from "./email-signature-render"

export interface EmailSignatureInput {
  name: string
  isDefault: boolean
  htmlContent: string
}

export interface EmailSignatureDto {
  id: number
  name: string
  isDefault: boolean
  htmlContent: string
  renderedHtml: string
}

function cleanText(value: string | null | undefined): string {
  return value?.trim() ?? ""
}

export function validateEmailSignatureInput(body: Record<string, unknown>): {
  ok: true
  value: EmailSignatureInput
} | {
  ok: false
  errors: Record<string, string>
} {
  const errors: Record<string, string> = {}
  const name = cleanText(typeof body.name === "string" ? body.name : "")
  const htmlContent = normalizeEmailSignatureHtml(
    typeof body.htmlContent === "string" ? body.htmlContent : "",
  )

  if (!name) errors.name = "Name is required."

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: {
      name,
      isDefault: body.isDefault === true,
      htmlContent,
    },
  }
}

function toDto(record: EmailSignatureRecord): EmailSignatureDto {
  const htmlContent = normalizeEmailSignatureHtml(record.htmlContent)
  return {
    id: record.emailSignatureId,
    name: record.name,
    isDefault: record.isDefault,
    htmlContent,
    renderedHtml: renderEmailSignatureHtml(record),
  }
}

export async function listEmailSignatures(): Promise<EmailSignatureDto[]> {
  const records = await db
    .select()
    .from(emailSignatures)
    .orderBy(desc(emailSignatures.isDefault), asc(emailSignatures.emailSignatureId))

  return records.map((record) => toDto(record as EmailSignatureRecord))
}

export async function getEmailSignatureById(id: number): Promise<EmailSignatureDto | null> {
  const [record] = await db
    .select()
    .from(emailSignatures)
    .where(eq(emailSignatures.emailSignatureId, id))
    .limit(1)

  return record ? toDto(record as EmailSignatureRecord) : null
}

async function clearDefaultFlag(exceptId?: number) {
  const base = exceptId == null
    ? eq(emailSignatures.isDefault, true)
    : and(eq(emailSignatures.isDefault, true), ne(emailSignatures.emailSignatureId, exceptId))
  if (!base) return

  await db
    .update(emailSignatures)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(base)
}

async function ensureSomeDefault() {
  const [existingDefault] = await db
    .select({ id: emailSignatures.emailSignatureId })
    .from(emailSignatures)
    .where(eq(emailSignatures.isDefault, true))
    .limit(1)

  if (existingDefault) return

  const [first] = await db
    .select({ id: emailSignatures.emailSignatureId })
    .from(emailSignatures)
    .orderBy(asc(emailSignatures.emailSignatureId))
    .limit(1)

  if (!first) return

  await db
    .update(emailSignatures)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(eq(emailSignatures.emailSignatureId, first.id))
}

export async function createEmailSignature(input: EmailSignatureInput): Promise<EmailSignatureDto> {
  const shouldBeDefault =
    input.isDefault ||
    !(await db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailSignatures)
      .then((rows) => (rows[0]?.count ?? 0) > 0))

  if (shouldBeDefault) {
    await clearDefaultFlag()
  }

  const [record] = await db
    .insert(emailSignatures)
    .values({
      name: input.name,
      isDefault: shouldBeDefault,
      layout: "text-only",
      htmlContent: input.htmlContent,
      renderedHtml: input.htmlContent,
    })
    .returning()

  return toDto(record as EmailSignatureRecord)
}

export async function updateEmailSignature(
  id: number,
  input: EmailSignatureInput,
): Promise<EmailSignatureDto | null> {
  if (input.isDefault) {
    await clearDefaultFlag(id)
  }

  const [record] = await db
    .update(emailSignatures)
    .set({
      name: input.name,
      isDefault: input.isDefault,
      htmlContent: input.htmlContent,
      renderedHtml: input.htmlContent,
      updatedAt: new Date(),
    })
    .where(eq(emailSignatures.emailSignatureId, id))
    .returning()

  if (!record) return null

  await ensureSomeDefault()
  return toDto(record as EmailSignatureRecord)
}
