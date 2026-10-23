export interface ParsedLeadEmail {
  advertisementId: string
  entityName: string
  emailAddress: string
  phoneNumber: string | undefined
  notes: string
}

/**
 * Parses the plain-text body of a realestate.com.au enquiry email.
 *
 * Expected format (loosely):
 *   Property id: 150505420
 *   ...
 *   Name: Rochelle Austria
 *   Email: niceche8080@gmail.com
 *   Phone: 0412164052
 *   About me: ...
 *   Comments: ...
 */
export function parseLeadEmail(text: string): ParsedLeadEmail {
  const lines = text.split(/\r?\n/)

  const get = (prefix: string): string | undefined => {
    const lower = prefix.toLowerCase()
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.toLowerCase().startsWith(lower)) {
        return trimmed.slice(prefix.length).trim()
      }
    }
    return undefined
  }

  const advertisementId = get("Property id:")
  if (!advertisementId) throw new Error("Could not find 'Property id:' in the email text.")

  const entityName = get("Name:")
  if (!entityName) throw new Error("Could not find 'Name:' in the email text.")

  const emailAddress = get("Email:")
  if (!emailAddress) throw new Error("Could not find 'Email:' in the email text.")

  const phoneNumber = get("Phone:")

  // Notes = all lines after the last known header field (Phone if present, else Email)
  let anchorLineIndex = -1
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].trim().toLowerCase()
    if (lower.startsWith("phone:") || lower.startsWith("email:")) {
      anchorLineIndex = i
    }
  }

  const noteLines =
    anchorLineIndex >= 0
      ? lines
          .slice(anchorLineIndex + 1)
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
      : []

  const notes = stripRealestateBoilerplate(noteLines.join("\n"))

  return { advertisementId, entityName, emailAddress, phoneNumber, notes }
}

const REALESTATE_BOILERPLATE_MARKER =
  "You can only use the personal information contained in this email enquiry"

function stripRealestateBoilerplate(text: string): string {
  const idx = text.indexOf(REALESTATE_BOILERPLATE_MARKER)
  return idx === -1 ? text : text.slice(0, idx).trimEnd()
}
