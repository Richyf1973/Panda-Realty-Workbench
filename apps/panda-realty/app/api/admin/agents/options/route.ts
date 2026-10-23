import { NextResponse } from "next/server"
import { asc } from "drizzle-orm"

import { db } from "@/db"
import { agents } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await db
    .select({
      agentId: agents.agentId,
      agentName: agents.agentName,
      email: agents.email,
      phone: agents.phone,
      tradingName: agents.tradingName,
      abn: agents.abn,
      licenceNumber: agents.licenceNumber,
      acn: agents.acn,
      fax: agents.fax,
      mobile: agents.mobile,
      address: agents.address,
      suburb: agents.suburb,
      state: agents.state,
      postcode: agents.postcode,
      licenceExpiry: agents.licenceExpiry,
      licenseeType: agents.licenseeType,
    })
    .from(agents)
    .orderBy(asc(agents.agentName))

  return NextResponse.json(rows)
}
