import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/db"
import { propertyThreadTags } from "@/db/schema"
import type { GmailThread } from "@/lib/gmail-client"

// Tagged threads always show; untagged threads are filtered to those on/after afterDate.
export async function filterThreadsByProperty(
  allThreads: GmailThread[],
  propertyListId: number,
  afterDate?: Date | null,
): Promise<{ threads: GmailThread[]; hiddenCount: number }> {
  if (afterDate == null) {
    return { threads: allThreads, hiddenCount: 0 }
  }

  const tagRows = await db
    .select({ threadId: propertyThreadTags.threadId })
    .from(propertyThreadTags)
    .where(eq(propertyThreadTags.propertyListId, propertyListId))

  const taggedThreadIds = new Set(tagRows.map((r) => r.threadId))

  const filtered = allThreads.filter((t) => {
    if (taggedThreadIds.has(t.threadId)) return true
    if (!t.date) return true
    return new Date(t.date) >= afterDate
  })

  return { threads: filtered, hiddenCount: allThreads.length - filtered.length }
}
