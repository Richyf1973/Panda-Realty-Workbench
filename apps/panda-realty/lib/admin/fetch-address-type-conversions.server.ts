"use server"

import { asc } from "drizzle-orm"

import { db } from "@/db"
import { pandaAddressTypeConversions } from "@/db/schema"

export interface AddressTypeConversion {
  addressText: string
  variant: string
}

export async function fetchAddressTypeConversions(): Promise<AddressTypeConversion[]> {
  const rows = await db
    .select({
      addressText: pandaAddressTypeConversions.addressText,
      variant: pandaAddressTypeConversions.variant,
    })
    .from(pandaAddressTypeConversions)
    .orderBy(asc(pandaAddressTypeConversions.addressText))

  return rows
}
