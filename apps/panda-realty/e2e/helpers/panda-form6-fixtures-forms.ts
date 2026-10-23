export const FORMS_LIST_FORM6 = {
  items: [{
    propertyFormId: 3,
    formName: "Form 6",
    category: "Listing",
    isActive: true,
    prefillStrategy: "form-6",
    fileLink: "https://drive.google.com/view?id=form6master",
    fileName: "Form 6.pdf",
  }],
  totalCount: 1, limit: 25, totalPages: 1, hasNextPage: false, hasPreviousPage: false,
  startCursor: null, endCursor: null,
}

export const FORMS_LIST_NO_PREFILL = {
  items: [{
    propertyFormId: 2, formName: "Generic Form", category: null,
    isActive: true, prefillStrategy: null,
    fileLink: "https://drive.google.com/view?id=gen456", fileName: "Generic Form.pdf",
  }],
  totalCount: 1, limit: 25, totalPages: 1, hasNextPage: false, hasPreviousPage: false,
  startCursor: null, endCursor: null,
}

export const FORMS_LIST_PRO_FORMA = {
  items: [{
    propertyFormId: 2,
    formName: "Pro Forma Contract 2026",
    category: "Contract",
    isActive: true,
    prefillStrategy: "pro-forma-2026",
    fileLink: "https://drive.google.com/view?id=proforma2026",
    fileName: "Pro Forma Contract 2026.pdf",
  }],
  totalCount: 1, limit: 25, totalPages: 1, hasNextPage: false, hasPreviousPage: false,
  startCursor: null, endCursor: null,
}

// Simulates a previously saved Form 6 template
export const TEMPLATE_VALUES_SAVED = {
  templateValues: {
    agencyTypeExclusive: "true",
    agencyTypeOpen: "false",
    agencyTypeSole: "false",
    commission: "2.75% of sale price",
    commissionWhenSettlement: "true",
    termTypeContinuing: "true",
    serviceTypeSale: "true",
    // Stale seller/property values that should be overridden by DB prefill
    seller1Name: "Stale Template Seller",
    seller1Email: "stale@template.com",
    propertyStreetAddress: "999 Stale Template Street",
    advertisingText: "Domain + REA standard package",
    advertisingAmount: "3500",
    otherFee1Desc: "Photography",
    otherFee1Amount: "450",
  },
}

export const TEMPLATE_RESPONSE_EMPTY = { templateValues: null }

// Template with custom agent/licensee values distinct from AGENTS_LIST[0] — used to verify
// that auto-select does not overwrite template-provided agent fields on re-open.
export const TEMPLATE_VALUES_WITH_AGENT = {
  templateValues: {
    agentTradingName: "Template Custom Agency",
    agentName: "Saved Template Agent",
    agentLicenceNumber: "SAVED-999",
    agentAbn: "99 999 999 999",
    agentAcn: "",
    agentPhone: "07 9999 9999",
    agentFax: "",
    agentMobile: "0499 999 999",
    agentEmail: "saved@template.com",
    agentAddress: "1 Template Street",
    agentSuburb: "Template City",
    agentState: "QLD",
    agentPostcode: "9999",
    agentLicenceExpiry: "2027-12-31",
    agentLicenseeType: "real-estate-agent",
    agencyTypeExclusive: "true",
    commission: "2.75% of sale price",
  },
}
