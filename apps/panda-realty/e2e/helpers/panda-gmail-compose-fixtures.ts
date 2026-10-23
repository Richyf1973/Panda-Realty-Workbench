export type ComposeSignature = {
  id: number
  name: string
  isDefault: boolean
  htmlContent: string
  renderedHtml: string
}

export const PROPERTY_SUBJECT = "12 Test Street, Testville"
export const CONTACT_EMAIL = "caboolture@vantage.com.au"

export const STATUS_MIN = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1,
  limit: 100,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

export const BUYER_WITH_EMAIL = {
  items: [
    {
      propertyEntityId: 501,
      entityId: 201,
      entityName: "Ash D",
      phoneNumber: "0475770513",
      emailAddress: "dhungelashok33@gmail.com",
      address: null,
      esuburb: null,
      estate: null,
      epostcode: null,
      notes: null,
      buyerPipelineStatusId: null,
      pipelineStatusLabel: "Active Buyers",
    },
  ],
}

export const CONTACT_WITH_EMAIL = {
  items: [
    {
      propertyEntityId: 601,
      entityId: 301,
      entityName: "Vantage Caboolture Riverfront",
      phoneNumber: "0458550540",
      emailAddress: CONTACT_EMAIL,
      address: "176 Torrens Road",
      contactCategoryName: "Property Manager",
      association: "Seller",
    },
  ],
}

export const EMPTY_PANEL_RESPONSE = { items: [] }

export const ENTITY_EMAILS_ALL = {
  items: [
    { type: "owner", entityName: "Smith, John", emailAddress: "john@example.com" },
    { type: "buyer", entityName: "Ash D", emailAddress: "dhungelashok33@gmail.com" },
    { type: "contact", entityName: "Jane Smith", emailAddress: "jane@example.com" },
    { type: "tenant", entityName: "Bob Tenant", emailAddress: "bob@tenant.com" },
    { type: "member", entityName: "Chris Matthews", emailAddress: "chris@matthews.com" },
  ],
}

export const THREAD_LIST_RESPONSE = {
  threads: [
    {
      threadId: "thread-1",
      subject: "Re: Welcome Pack Request For 12/176 Torrens Rd",
      from: `Vantage Caboolture <${CONTACT_EMAIL}>`,
      date: "2026-04-27T00:00:00.000Z",
      snippet: "Hi Richard, Thank you for your email...",
      attachmentCount: 0,
    },
  ],
}

export const THREAD_BODY_RESPONSE = {
  messages: [
    {
      messageId: "msg-contact-1",
      from: `Vantage Caboolture <${CONTACT_EMAIL}>`,
      date: "2026-04-27T00:00:00.000Z",
      subject: "Re: Welcome Pack Request For 12/176 Torrens Rd",
      body: "Hi Richard,\nThank you for your email.",
      attachments: [],
    },
  ],
}

export function makeSignature(overrides: Partial<ComposeSignature> = {}): ComposeSignature {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? "Office default",
    isDefault: overrides.isDefault ?? true,
    htmlContent:
      overrides.htmlContent ??
      `<p>Regards,</p><p>Richard Falzon</p><p><img src="https://example.com/default-signature.png" alt="Office default signature"></p>`,
    renderedHtml:
      overrides.renderedHtml ??
      `<p>Regards,</p><p>Richard Falzon</p><p><img src="https://example.com/default-signature.png" alt="Office default signature"></p>`,
  }
}
