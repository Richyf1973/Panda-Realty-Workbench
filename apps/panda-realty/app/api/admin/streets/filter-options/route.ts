import { NextResponse } from "next/server"

// Placeholder options endpoint required by the admin hint filter framework.
// The actual street filter value is managed by PropertyMapFilter via URL params.
export async function GET() {
  return NextResponse.json({ options: [] })
}
