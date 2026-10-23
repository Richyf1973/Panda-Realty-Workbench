export const STATUS_MIN = {
  items: [{ propertyStatusId: 1, propertyStatusCode: "ACTIVE", propertyStatus: "Active" }],
  totalCount: 1, limit: 100, totalPages: 1, hasNextPage: false, hasPreviousPage: false,
  startCursor: null, endCursor: null,
}

export const EMPTY_ENTITIES = { items: [] }
export const SEND_HISTORY_EMPTY = { items: [] }

export const AGENTS_LIST = [
  {
    agentId: 20,
    agentName: "Richard Falzon",
    email: "richard@pandarealty.com",
    phone: "0490456959",
    tradingName: "My Panda Realty",
    licenceNumber: "12345",
    abn: "12 345 678 901",
    acn: "123 456 789",
    address: "123 Queen Street",
    suburb: "Brisbane City",
    state: "QLD",
    postcode: "4000",
    fax: "07 3000 0001",
    mobile: "0490456959",
    licenceExpiry: "2026-12-31",
    licenseeType: "real-estate-agent",
  },
  {
    agentId: 21,
    agentName: "Maria Koch",
    email: "maria@pandarealty.com",
    phone: "0493635666",
    tradingName: "My Panda Realty",
    licenceNumber: "67890",
    abn: "98 765 432 100",
    acn: null,
    address: null,
    suburb: null,
    state: null,
    postcode: null,
    fax: null,
    mobile: null,
    licenceExpiry: null,
    licenseeType: "real-estate-agent",
  },
]
