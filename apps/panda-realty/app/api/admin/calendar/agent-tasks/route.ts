import { NextRequest, NextResponse } from "next/server"
import { asc, eq } from "drizzle-orm"

import { db } from "@/db"
import { agentTasks, agents } from "@/db/schema"
import { getSessionUser } from "@/lib/auth/session"
import { getGmailAccessToken, getConnectedGmailEmail, sendGmailMessage } from "@/lib/gmail-client"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await db
    .select({
      agentTaskId: agentTasks.agentTaskId,
      agentId: agentTasks.agentId,
      agentName: agents.agentName,
      title: agentTasks.title,
      dueDate: agentTasks.dueDate,
      notes: agentTasks.notes,
      createdAt: agentTasks.createdAt,
    })
    .from(agentTasks)
    .leftJoin(agents, eq(agentTasks.agentId, agents.agentId))
    .orderBy(asc(agentTasks.createdAt))

  return NextResponse.json(rows)
}

type CreateTaskBody = {
  agentId: number
  title: string
  dueDate?: string // YYYY-MM-DD
  notes?: string
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: CreateTaskBody
  try {
    body = (await req.json()) as CreateTaskBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { agentId, title, dueDate, notes } = body

  if (!agentId || typeof agentId !== "number") {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 })
  }
  if (!title || typeof title !== "string" || title.trim() === "") {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return NextResponse.json({ error: "dueDate must be YYYY-MM-DD" }, { status: 400 })
  }

  const [agent] = await db
    .select({ agentId: agents.agentId, agentName: agents.agentName, email: agents.email })
    .from(agents)
    .where(eq(agents.agentId, agentId))
    .limit(1)

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 })
  }

  const [inserted] = await db
    .insert(agentTasks)
    .values({
      agentId,
      title: title.trim(),
      dueDate: dueDate ?? null,
      notes: notes?.trim() || null,
    })
    .returning({ agentTaskId: agentTasks.agentTaskId })

  if (agent.email) {
    try {
      const accessToken = await getGmailAccessToken()
      const senderEmail = await getConnectedGmailEmail(accessToken)

      const dueDateLine = dueDate ? `Due date: ${dueDate}` : ""
      const notesLine = notes?.trim() ? `Notes: ${notes.trim()}` : ""
      const bodyLines = [
        `You have been assigned a new task:`,
        ``,
        `Task: ${title.trim()}`,
        dueDateLine,
        notesLine,
        ``,
        `Assigned by: ${senderEmail}`,
      ].filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))

      await sendGmailMessage(
        accessToken,
        agent.email,
        `New task assigned: ${title.trim()}`,
        bodyLines.join("<br>"),
      )
    } catch {
      // Email failure is non-fatal — task was already saved
    }
  }

  return NextResponse.json({ id: inserted.agentTaskId })
}
