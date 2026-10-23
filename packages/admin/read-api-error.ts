/** Client-side TanStack Query / thrown errors shown in admin UI. */
export function formatUnknownErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return "Something went wrong"
}

export async function readApiErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string }
    return data.error ?? res.statusText
  } catch {
    return res.statusText
  }
}
