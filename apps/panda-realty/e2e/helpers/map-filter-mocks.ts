/** Shared mock responses for property map filter E2E specs. */

export const MAP_FILTER_EMPTY_LIST_RESPONSE = {
  items: [],
  totalCount: 0,
  limit: 25,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

export const MAP_FILTER_STATUS_LIST_RESPONSE = {
  items: [],
  totalCount: 0,
  limit: 100,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
}

export const MAP_FILTER_MOCK_STREETS = [
  { street: "E2E Map Street", suburb: "Caboolture", state: "QLD", postcode: "4510" },
]
