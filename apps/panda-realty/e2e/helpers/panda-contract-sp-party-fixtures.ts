/** Full prefill: two sellers, one buyer, seller's solicitor, property + price */
export const CSP_PREFILL_DATA_FULL = {
  sellers: [
    {
      entityName: "John Smith",
      address: "42 Oak Street",
      phoneNumber: "0400000000",
      mobile: "0411000000",
      emailAddress: "john@example.com",
      abn: "12 345 678 901",
    },
    {
      entityName: "Jane Smith",
      address: "42 Oak Street",
      phoneNumber: "0400111111",
      mobile: null,
      emailAddress: "jane@example.com",
      abn: null,
    },
  ],
  buyers: [
    {
      entityId: 101,
      entityName: "Alice Buyer",
      address: "88 Buyer Street",
      suburb: "Newstead",
      state: "QLD",
      postcode: "4006",
      phoneNumber: "0422000000",
      mobile: "0433000000",
      emailAddress: "alice@buyer.com",
      abn: null,
    },
  ],
  sellerSolicitor: {
    entityName: "Smith Legal",
    ref: "SL-001",
    address: "1 Legal Lane",
    phoneNumber: "07 3000 9999",
    emailAddress: "info@smithlegal.com",
  },
  buyerSolicitor: null,
  propertyStreetAddress: "42 Oak Street",
  propertySuburb: "Brisbane City",
  propertyState: "QLD",
  propertyPostcode: "4000",
  propertyLot: "12",
  propertyPlan: "RP123456",
  propertyTitleReference: null,
  salePrice: "825000",
}

/** One seller, one buyer, no solicitors, no price */
export const CSP_PREFILL_DATA_MINIMAL = {
  sellers: [
    {
      entityName: "John Smith",
      address: "42 Oak Street",
      phoneNumber: "0400000000",
      mobile: null,
      emailAddress: "john@example.com",
      abn: null,
    },
  ],
  buyers: [
    {
      entityId: 101,
      entityName: "Alice Buyer",
      address: "88 Buyer Street",
      suburb: "Newstead",
      state: "QLD",
      postcode: "4006",
      phoneNumber: "0422000000",
      mobile: null,
      emailAddress: "alice@buyer.com",
      abn: null,
    },
  ],
  sellerSolicitor: null,
  buyerSolicitor: null,
  propertyStreetAddress: "42 Oak Street",
  propertySuburb: "Brisbane City",
  propertyState: "QLD",
  propertyPostcode: "4000",
  propertyLot: "5",
  propertyPlan: "SP100200",
  propertyTitleReference: null,
  salePrice: null,
}

/** No sellers and no buyers — all party fields blank */
export const CSP_PREFILL_DATA_NO_PARTIES = {
  sellers: [],
  buyers: [],
  sellerSolicitor: null,
  buyerSolicitor: null,
  propertyStreetAddress: "99 Empty Road",
  propertySuburb: "Springfield",
  propertyState: "QLD",
  propertyPostcode: "4300",
  propertyLot: "",
  propertyPlan: "",
  propertyTitleReference: null,
  salePrice: null,
}

/** Both seller and buyer solicitors present */
export const CSP_PREFILL_DATA_BOTH_SOLICITORS = {
  ...CSP_PREFILL_DATA_FULL,
  buyerSolicitor: {
    entityName: "Buyer Legal Co",
    ref: "BLC-007",
    contact: "Sue Legal",
    address: "5 Buyer Law Street",
    suburb: "Fortitude Valley",
    state: "QLD",
    postcode: "4006",
    phoneNumber: "07 3001 1111",
    emailAddress: "sue@buyerlegal.com",
  },
}

/** Sellers whose addresses end with a known suburb; API returns parsed suburb/state/postcode */
export const CSP_PREFILL_DATA_SELLER_WITH_SUBURB = {
  ...CSP_PREFILL_DATA_FULL,
  sellers: [
    {
      entityName: "MARGARET CHRISTINE ROYAL",
      address: "180/46 AMY STREET MORAYFIELD",
      suburb: "Morayfield",
      state: "QLD",
      postcode: "4506",
      phoneNumber: "0458975180",
      mobile: "0458975180",
      emailAddress: "margaret@example.com",
      abn: null,
    },
    {
      entityName: "STEPHEN DOUGLAS ROYAL",
      address: "180/46 AMY STREET MORAYFIELD",
      suburb: "Morayfield",
      state: "QLD",
      postcode: "4506",
      phoneNumber: "0458975180",
      mobile: "0458975180",
      emailAddress: "stephen@example.com",
      abn: null,
    },
  ],
  buyers: [
    {
      entityId: 101,
      entityName: "JULENE ENID KELLS",
      address: "27 AZZURRA DRIVE",
      suburb: "Varsity Lakes",
      state: "QLD",
      postcode: "4227",
      phoneNumber: "0400000000",
      mobile: null,
      emailAddress: "julene@example.com",
      abn: null,
    },
    {
      entityId: 102,
      entityName: "Second Buyer",
      address: "5 Second Street",
      suburb: "Caboolture",
      state: "QLD",
      postcode: "4510",
      phoneNumber: "0400000001",
      mobile: null,
      emailAddress: "second@example.com",
      abn: null,
    },
  ],
  propertyStreetAddress: "180 /46 AMY STREET",
  propertySuburb: "Morayfield",
  propertyState: "QLD",
  propertyPostcode: "4506",
}

/** Seller address has no recognisable suburb — server falls back to property suburb/state/postcode */
export const CSP_PREFILL_DATA_SELLER_SUBURB_FALLBACK = {
  ...CSP_PREFILL_DATA_FULL,
  sellers: [
    {
      entityName: "John Smith",
      address: "42 Oak Street",
      suburb: "Brisbane City",
      state: "QLD",
      postcode: "4000",
      phoneNumber: "0400000000",
      mobile: null,
      emailAddress: "john@example.com",
      abn: null,
    },
  ],
  buyers: [
    {
      entityId: 101,
      entityName: "Buyer No Suburb",
      address: "10 Nowhere Street",
      suburb: "Brisbane City",
      state: "QLD",
      postcode: "4000",
      phoneNumber: "0400000002",
      mobile: null,
      emailAddress: "buyer@example.com",
      abn: null,
    },
  ],
  propertySuburb: "Brisbane City",
  propertyState: "QLD",
  propertyPostcode: "4000",
}
