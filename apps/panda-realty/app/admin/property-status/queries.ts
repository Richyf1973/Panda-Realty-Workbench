import "server-only"

import { asc } from "drizzle-orm"

import { db } from "@/db"
import { propertyStatus } from "@/db/schema"

export type PropertyStatusRow = {
  propertyStatusId: number
  propertyStatusCode: string
  propertyStatus: string | null
  isShownOnFavorite: boolean
  pipeline: string | null
  sortOrder: number | null
}

export async function fetchAllPropertyStatuses(): Promise<PropertyStatusRow[]> {
  return db
    .select({
      propertyStatusId: propertyStatus.propertyStatusId,
      propertyStatusCode: propertyStatus.propertyStatusCode,
      propertyStatus: propertyStatus.propertyStatus,
      isShownOnFavorite: propertyStatus.isShownOnFavorite,
      pipeline: propertyStatus.pipeline,
      sortOrder: propertyStatus.sortOrder,
    })
    .from(propertyStatus)
    .orderBy(asc(propertyStatus.sortOrder), asc(propertyStatus.propertyStatusId))
}
