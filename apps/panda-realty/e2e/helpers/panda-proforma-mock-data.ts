export { STATUS_MIN, EMPTY_ENTITIES, SEND_HISTORY_EMPTY, FORMS_LIST_NO_PREFILL } from "./panda-form6-mock-data"

export const EMPTY_PROPERTY_ENTITIES = {
  items: [], totalCount: 0, limit: 20, totalPages: 0,
  hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null,
}

/** Pro Forma Contract 2026 — triggers the two-step prefill wizard.
 * Uses "pro-forma-legacy" strategy (not "pro-forma-2026") so the forms tab routes
 * to openSendDialog (the prefill wizard) rather than openSendLinkDialog. */
export const FORMS_LIST_PREFILL = {
  items: [
    {
      propertyFormId: 1,
      formName: "PRO FORMA CONTRACT 2026",
      category: "Contract",
      description: "Pro forma contract sent to enquirers",
      isActive: true,
      prefillStrategy: "pro-forma-legacy",
      fileLink: "https://drive.google.com/view?id=master123",
      fileName: "PRO FORMA CONTRACT 2026.pdf",
      fileSize: 231936,
      googleDriveFileId: "master123",
      createdAt: "2026-04-30T10:00:00.000Z",
      updatedAt: null,
    },
  ],
  totalCount: 1, limit: 25, totalPages: 1, hasNextPage: false, hasPreviousPage: false,
  startCursor: null, endCursor: null,
}

export const PREFILL_DATA = {
  buyers: [
    {
      entityId: 201,
      entityName: "John Smith",
      members: [
        { memberName: "John Smith", memberAddress: "10 Main St, Brisbane", memberPhoneNumber: "0400111111" },
        { memberName: "Jane Smith", memberAddress: "10 Main St, Brisbane", memberPhoneNumber: "0400111112" },
      ],
      address: "42 Oak St, Brisbane",
      phoneNumber: "0400000001",
      emailAddress: "john@example.com",
    },
    {
      entityId: 202,
      entityName: "Jane Smith",
      address: null,
      phoneNumber: null,
      emailAddress: "jane@example.com",
    },
  ],
  solicitor: {
    entityId: 301,
    entityName: "Smith Legal",
    address: "Level 1, 10 Law St",
    phoneNumber: "07 3000 0000",
    emailAddress: "sol@smithlegal.com.au",
  },
}

export const PREFILL_DATA_NO_SOLICITOR = {
  buyers: [
    {
      entityId: 201,
      entityName: "John Smith",
      members: [
        { memberName: "John Smith", memberAddress: "10 Main St, Brisbane", memberPhoneNumber: "0400111111" },
        { memberName: "Jane Smith", memberAddress: "10 Main St, Brisbane", memberPhoneNumber: "0400111112" },
      ],
      address: "42 Oak St, Brisbane",
      phoneNumber: "0400000001",
      emailAddress: "john@example.com",
    },
  ],
  solicitor: null,
}

export const PREFILL_DATA_EMPTY = { buyers: [], solicitor: null }

export const BUYERS_WITH_EMAIL = {
  items: [
    {
      propertyEntityId: 501,
      entityId: 201,
      entityName: "John Smith",
      phoneNumber: "0400000001",
      emailAddress: "john@example.com",
      address: "42 Oak St, Brisbane",
    },
    {
      propertyEntityId: 502,
      entityId: 202,
      entityName: "Jane Smith",
      phoneNumber: null,
      emailAddress: "jane@example.com",
      address: null,
    },
  ],
}
