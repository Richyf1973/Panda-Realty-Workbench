import { createHash } from "node:crypto"

import { NextResponse } from "next/server"

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim()
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const OPENROUTER_MODEL = "anthropic/claude-haiku-4.5:online"

function extractJsonObject(content: string): string {
  const trimmed = content.trim()
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const candidate = (fenceMatch?.[1] ?? trimmed).trim()
  const firstBrace = candidate.indexOf("{")
  const lastBrace = candidate.lastIndexOf("}")
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return candidate
  }
  return candidate.slice(firstBrace, lastBrace + 1)
}

interface LlmItem {
  name?: string
  phone?: string
  email?: string
  address?: string
  suburb?: string
  state?: string
  postcode?: string
}

interface BusinessSearchItem {
  placeId: string
  name: string
  phone: string
  email: string
  address: string
  suburb: string
  state: string
  postcode: string
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const q = url.searchParams.get("q")?.trim()

  if (!q) {
    return NextResponse.json({ items: [] })
  }

  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY not configured" },
      { status: 400 },
    )
  }

  const systemPrompt =
    "You are a business contact lookup assistant for Australia. " +
    "Given a business name or contact person, search the web and return up to 5 best-matching Australian businesses or people. " +
    "Respond with ONLY a JSON object of the form: " +
    '{"items":[{"name":string,"phone":string,"email":string,"address":string,"suburb":string,"state":string,"postcode":string}]}. ' +
    "Use empty strings for any field you cannot determine. " +
    "Address should be the street address only (no suburb/state/postcode). State should be the AU state abbreviation (NSW, VIC, QLD, WA, SA, TAS, ACT, NT). " +
    "Do not include any prose, only the JSON object."

  const userPrompt = `Find Australian business or contact info for: ${q}`

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "")
      console.error("OpenRouter API error:", {
        query: q,
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
      })
      return NextResponse.json(
        { error: "Business search request failed" },
        { status: 502 },
      )
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }

    const content = data.choices?.[0]?.message?.content ?? ""
    const jsonText = extractJsonObject(content)

    let parsed: { items?: LlmItem[] }
    try {
      parsed = JSON.parse(jsonText) as { items?: LlmItem[] }
    } catch (err) {
      console.error("OpenRouter JSON parse error:", {
        query: q,
        content,
        error: err instanceof Error ? err.message : err,
      })
      return NextResponse.json({ items: [] })
    }

    const items = (parsed.items ?? []).map((raw): BusinessSearchItem => {
      const name = raw.name ?? ""
      const phone = raw.phone ?? ""
      return {
        placeId: createHash("sha1").update(`${name}|${phone}`).digest("hex").slice(0, 16),
        name,
        phone,
        email: raw.email ?? "",
        address: raw.address ?? "",
        suburb: raw.suburb ?? "",
        state: raw.state ?? "",
        postcode: raw.postcode ?? "",
      }
    })

    return NextResponse.json({ items })
  } catch (err) {
    console.error("Business search error:", {
      query: q,
      error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err,
    })
    return NextResponse.json(
      { error: "Business search request failed" },
      { status: 502 },
    )
  }
}
