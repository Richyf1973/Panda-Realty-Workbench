import "server-only"

import { and, asc, eq, inArray, ne } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db"
import { entityMembers } from "@/db/schema"

export type PropertyEntityWorkspaceDbTx = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]

const boolish = z
  .union([z.boolean(), z.literal("true"), z.literal("false")])
  .transform((v) => v === true || v === "true")

const entityMemberLineSchema = z.object({
  entityMemberId: z.number().int().positive().optional(),
  memberName: z.string(),
  memberAddress: z.string().nullable().optional(),
  propertyToSellAddress: z.string().nullable().optional(),
  memberPhoneNumber: z.string().nullable().optional(),
  memberEmailAddress: z.string().nullable().optional(),
  memberNotes: z.string().nullable().optional(),
  scheduledViewingDate: z.string().nullable().optional(),
  isBuyersRepresentative: boolish.optional(),
})

export function parseEntityMembersWorkspacePayload(raw: unknown) {
  const parsed = z.array(entityMemberLineSchema).safeParse(raw)
  if (!parsed.success) {
    throw new Error("Invalid entityMembers payload")
  }
  return parsed.data.filter((l) => l.memberName.trim() !== "")
}

function parseOptionalTimestamp(raw: string | null | undefined): Date | null {
  if (raw == null || raw.trim() === "") return null
  const d = new Date(raw.trim())
  if (Number.isNaN(d.getTime())) return null
  return d
}

export async function syncEntityMembersForEntityInTx(
  tx: PropertyEntityWorkspaceDbTx,
  entityId: number,
  lines: ReturnType<typeof parseEntityMembersWorkspacePayload>,
): Promise<void> {
  const existing = await tx
    .select()
    .from(entityMembers)
    .where(eq(entityMembers.entityId, entityId))

  const keepIds = new Set(
    lines
      .map((l) => l.entityMemberId)
      .filter((x): x is number => typeof x === "number"),
  )

  for (const row of existing) {
    if (!keepIds.has(row.entityMemberId)) {
      await tx
        .delete(entityMembers)
        .where(eq(entityMembers.entityMemberId, row.entityMemberId))
    }
  }

  for (const line of lines) {
    const scheduled = parseOptionalTimestamp(line.scheduledViewingDate ?? null)
    const rep = line.isBuyersRepresentative === true
    if (line.entityMemberId != null) {
      if (rep) {
        await tx
          .update(entityMembers)
          .set({ isBuyersRepresentative: false, updatedAt: new Date() })
          .where(
            and(
              eq(entityMembers.entityId, entityId),
              ne(entityMembers.entityMemberId, line.entityMemberId),
            ),
          )
      }
      const [updated] = await tx
        .update(entityMembers)
        .set({
          memberName: line.memberName.trim(),
          memberAddress: line.memberAddress?.trim() || null,
          propertyToSellAddress: line.propertyToSellAddress?.trim() || null,
          memberPhoneNumber: line.memberPhoneNumber?.trim() || null,
          memberEmailAddress: line.memberEmailAddress?.trim() || null,
          memberNotes: line.memberNotes?.trim() || null,
          scheduledViewingDate: scheduled,
          ...(line.isBuyersRepresentative !== undefined
            ? { isBuyersRepresentative: rep }
            : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(entityMembers.entityMemberId, line.entityMemberId),
            eq(entityMembers.entityId, entityId),
          ),
        )
        .returning()
      if (!updated) {
        throw new Error(
          `Entity member ${line.entityMemberId} not found for this entity`,
        )
      }
    } else {
      if (rep) {
        await tx
          .update(entityMembers)
          .set({ isBuyersRepresentative: false, updatedAt: new Date() })
          .where(eq(entityMembers.entityId, entityId))
      }
      await tx.insert(entityMembers).values({
        entityId,
        memberName: line.memberName.trim(),
        memberAddress: line.memberAddress?.trim() || null,
        propertyToSellAddress: line.propertyToSellAddress?.trim() || null,
        memberPhoneNumber: line.memberPhoneNumber?.trim() || null,
        memberEmailAddress: line.memberEmailAddress?.trim() || null,
        memberNotes: line.memberNotes?.trim() || null,
        scheduledViewingDate: scheduled,
        isBuyersRepresentative: rep,
      })
    }
  }

  await dedupeBuyersRepresentativesForEntityInTx(tx, entityId)
}

async function dedupeBuyersRepresentativesForEntityInTx(
  tx: PropertyEntityWorkspaceDbTx,
  entityId: number,
): Promise<void> {
  const reps = await tx
    .select({ entityMemberId: entityMembers.entityMemberId })
    .from(entityMembers)
    .where(
      and(
        eq(entityMembers.entityId, entityId),
        eq(entityMembers.isBuyersRepresentative, true),
      ),
    )
    .orderBy(asc(entityMembers.entityMemberId))

  if (reps.length <= 1) return

  const [, ...rest] = reps
  await tx
    .update(entityMembers)
    .set({ isBuyersRepresentative: false, updatedAt: new Date() })
    .where(
      inArray(
        entityMembers.entityMemberId,
        rest.map((r) => r.entityMemberId),
      ),
    )
}
