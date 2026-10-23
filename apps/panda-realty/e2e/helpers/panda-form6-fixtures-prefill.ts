export const PREFILL_DATA_FULL = {
  sellers: [
    {
      entityName: "John Smith",
      address: "42 Oak Street",
      suburb: "Brisbane City",
      state: "QLD",
      postcode: "4000",
      phoneNumber: "0400000000",
      mobile: "0411000000",
      emailAddress: "john@example.com",
      abn: "12 345 678 901",
    },
    {
      entityName: "Jane Smith",
      address: "42 Oak Street",
      suburb: "Brisbane City",
      state: "QLD",
      postcode: "4000",
      phoneNumber: "0400111111",
      mobile: null,
      emailAddress: "jane@example.com",
      abn: null,
    },
  ],
  propertyDescription1: "Sale of House",
  propertyStreetAddress: "42 Oak Street",
  propertySuburb: "Brisbane City",
  propertyState: "QLD",
  propertyPostcode: "4000",
  propertyLot: "12",
  propertyPlan: "RP123456",
  propertyTitleReference: null,
  commissionRate: "3.3",
  salePrice: null,
}

export const PREFILL_DATA_ONE_OWNER = {
  ...PREFILL_DATA_FULL,
  sellers: [PREFILL_DATA_FULL.sellers[0]],
}

export const PREFILL_DATA_NO_OWNERS = {
  ...PREFILL_DATA_FULL,
  sellers: [],
}

// Seller 1 has phone but no mobile — mobile stays blank (no phone fallback)
export const PREFILL_DATA_SELLER1_NO_MOBILE = {
  sellers: [
    {
      entityName: "Lawrence Baker",
      address: "195/46 AMY STREET",
      phoneNumber: "0414553034",
      mobile: null,
      emailAddress: "whitedog088@gmail.com",
      abn: null,
    },
  ],
  propertyDescription1: null,
  propertyStreetAddress: "195/46 AMY STREET",
  propertySuburb: "MORAYFIELD",
  propertyState: "QLD",
  propertyPostcode: "4506",
  propertyLot: null,
  propertyPlan: null,
  propertyTitleReference: null,
  commissionRate: null,
  salePrice: null,
}

// Has appraisedAmount for Tab 4 price pre-fill tests
export const PREFILL_DATA_WITH_PRICE = {
  ...PREFILL_DATA_FULL,
  appraisedAmount: "825000",
}

// Plan-only RPD (no slash, no L-prefix)
export const PREFILL_DATA_PLAN_ONLY = {
  ...PREFILL_DATA_FULL,
  propertyLot: "",
  propertyPlan: "SP239098",
  salePrice: null,
}

// Prefill data with all 5 new client fields populated for both sellers
export const PREFILL_DATA_WITH_EXTRA_CLIENT_FIELDS = {
  ...PREFILL_DATA_FULL,
  sellers: [
    { ...PREFILL_DATA_FULL.sellers[0], nameLine2: "Trading As JS Holdings", address2: "Unit 5", acn: "123 456 789", gstRegistered: "Yes", fax: "0700000001" },
    { ...PREFILL_DATA_FULL.sellers[1], nameLine2: "", address2: "", acn: "987 654 321", gstRegistered: "No", fax: "0700000002" },
  ],
}

// Fixture for client-prefill-fix tests — suburb embedded in address, nameLine2/ABN/ACN set, mobile null
export const PREFILL_DATA_SUBURB_IN_ADDRESS = {
  sellers: [
    {
      entityName: "JON DA ROZA",
      nameLine2: "Trading As Da Rosa Holdings",
      address: "205/46 Amy Street Morayfield, Qld. 4506.",
      address2: "",
      suburb: "Morayfield",
      state: "Qld",
      postcode: "4506",
      phoneNumber: "0433505575",
      mobile: null,
      emailAddress: "darozajon@gmail.com",
      abn: null,
      acn: "123 456 789",
      gstRegistered: "Yes",
      fax: "07 3000 0099",
    },
    {
      entityName: "LYNDA DA ROZA",
      nameLine2: "Co-Owner Holdings",
      address: "205/46 Amy Street Morayfield, Qld. 4506.",
      address2: "",
      suburb: "Morayfield",
      state: "Qld",
      postcode: "4506",
      phoneNumber: "0492931051",
      mobile: null,
      emailAddress: "lyndadaroza@hotmail.com",
      abn: "98 765 432 100",
      acn: "987 654 321",
      gstRegistered: "No",
      fax: "07 3000 0098",
    },
  ],
  propertyStreetAddress: "205/46 Amy Street",
  propertySuburb: "Morayfield",
  propertyState: "Qld",
  propertyPostcode: "4506",
  propertyLot: null,
  propertyPlan: null,
  propertyTitleReference: null,
  commissionRate: null,
  salePrice: null,
}

// Three sellers — used for multi-owner acknowledgement tests
export const PREFILL_DATA_THREE_OWNERS = {
  ...PREFILL_DATA_FULL,
  sellers: [
    PREFILL_DATA_FULL.sellers[0],
    PREFILL_DATA_FULL.sellers[1],
    {
      entityName: "Bob Jones",
      address: "42 Oak Street",
      suburb: "Brisbane City",
      state: "QLD",
      postcode: "4000",
      phoneNumber: "0422000000",
      mobile: "0433000000",
      emailAddress: "bob@example.com",
      abn: null,
    },
  ],
}

export const RECIPIENTS_WITH_EMAIL = {
  items: [{
    propertyEntityId: 301,
    entityId: 201,
    entityName: "John Smith",
    emailAddress: "john@example.com",
    phoneNumber: "0400000000",
    address: "42 Oak Street",
  }],
}
