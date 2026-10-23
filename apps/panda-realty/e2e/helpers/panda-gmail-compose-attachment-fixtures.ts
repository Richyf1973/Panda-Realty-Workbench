import { BASE_PROPERTY } from "./panda-properties-owners-helpers"

export const PROPERTY_WITH_OWNER_EMAIL = {
  ...BASE_PROPERTY,
  propertyListId: 1001,
  owner1name: "Smith, John",
  owner1phone: "0412345678",
  owner1email: "john@example.com",
  owner2name: null,
  owner2phone: null,
  owner2email: null,
  owner3name: null,
  owner3phone: null,
  owner3email: null,
  combinedOwner: "Smith, John",
}

export const LIST_WITH_OWNER_EMAIL = {
  items: [PROPERTY_WITH_OWNER_EMAIL],
  totalCount: 1,
  limit: 25,
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
      emailAddress: "ash@example.com",
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

export const EMPTY_PANEL = { items: [] }

export const SMALL_PDF = { name: "document.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(50_000, "a") }
export const SMALL_JPG = { name: "photo.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(100_000, "b") }
export const LARGE_FILE_A = { name: "large-a.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(11 * 1024 * 1024, "x") }
export const LARGE_FILE_B = { name: "large-b.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(11 * 1024 * 1024, "y") }
