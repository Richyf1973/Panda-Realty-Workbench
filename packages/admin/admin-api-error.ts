import { NextResponse } from "next/server"

export function adminJsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

/** Throw from admin entity hooks so route handlers can map to {@link adminJsonError}. */
export class AdminHttpError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "AdminHttpError"
    this.status = status
  }
}
