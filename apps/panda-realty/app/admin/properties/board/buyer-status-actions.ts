"use server"

import { asc } from "drizzle-orm"

import { db } from "@/db"
import { buyerStatus } from "@/db/schema"

export async function fetchAllBuyerStatuses(): Promise<
  Array<{ buyerStatusId: number; buyerStatus: string }>
> {
  return db
    .select({
      buyerStatusId: buyerStatus.buyerStatusId,
      buyerStatus: buyerStatus.buyerStatus,
    })
    .from(buyerStatus)
    .orderBy(asc(buyerStatus.buyerStatus))
}
