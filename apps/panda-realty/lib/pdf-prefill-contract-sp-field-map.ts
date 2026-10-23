export type TextField = {
  page: number
  x: number
  y: number
  size?: number
  bgWidth?: number
}

// Coordinates calibrated from tools/calibrate-contract-sp-all-pages.mjs.
// Text fields: drawn y = underline_y + 2 (text baseline sits 2pt above each field underline).
export const FIELD_MAP: Record<string, TextField> = {
  // Contract Date — page 1 (index 0); white background box covers the pre-printed date placeholder
  contractDate: { page: 0, x: 135, y: 618, bgWidth: 410 },

  // Seller 1 — page 1 (index 0)
  seller1Name:     { page: 0, x: 152, y: 571 },
  seller1Abn:      { page: 0, x: 495, y: 571 },
  seller1Address:  { page: 0, x: 152, y: 555 },
  seller1Suburb:   { page: 0, x: 152, y: 538 },
  seller1State:    { page: 0, x: 332, y: 538 },
  seller1Postcode: { page: 0, x: 520, y: 538 },
  seller1Phone:    { page: 0, x: 152, y: 522 },
  seller1Mobile:   { page: 0, x: 326, y: 522 },
  seller1Email:    { page: 0, x: 435, y: 522 },

  // Seller 2 — page 1 (index 0)
  seller2Name:     { page: 0, x: 152, y: 501 },
  seller2Abn:      { page: 0, x: 495, y: 501 },
  seller2Address:  { page: 0, x: 152, y: 484 },
  seller2Suburb:   { page: 0, x: 152, y: 468 },
  seller2State:    { page: 0, x: 332, y: 468 },
  seller2Postcode: { page: 0, x: 520, y: 468 },
  seller2Phone:    { page: 0, x: 152, y: 452 },
  seller2Mobile:   { page: 0, x: 326, y: 452 },
  seller2Email:    { page: 0, x: 435, y: 452 },

  // Seller's Agent — page 1 (index 0)
  agentName:          { page: 0, x: 152, y: 418 },
  agentAbn:           { page: 0, x: 152, y: 386 },
  agentLicenceNumber: { page: 0, x: 400, y: 386 },
  agentAddress:       { page: 0, x: 152, y: 369 },
  agentSuburb:        { page: 0, x: 152, y: 353 },
  agentState:         { page: 0, x: 332, y: 353 },
  agentPostcode:      { page: 0, x: 520, y: 353 },
  agentPhone:         { page: 0, x: 152, y: 337 },
  agentMobile:        { page: 0, x: 326, y: 337 },
  agentEmail:         { page: 0, x: 435, y: 337 },

  // Seller's Solicitor — page 1 (index 0)
  sellerSolicitorName:     { page: 0, x: 152, y: 303 },
  sellerSolicitorRef:      { page: 0, x: 152, y: 287 },
  sellerSolicitorAddress:  { page: 0, x: 152, y: 270 },
  sellerSolicitorSuburb:   { page: 0, x: 152, y: 254 },
  sellerSolicitorState:    { page: 0, x: 332, y: 254 },
  sellerSolicitorPostcode: { page: 0, x: 520, y: 254 },
  sellerSolicitorPhone:    { page: 0, x: 152, y: 238 },
  sellerSolicitorMobile:   { page: 0, x: 326, y: 238 },
  sellerSolicitorEmail:    { page: 0, x: 435, y: 238 },

  // Buyer 1 — page 1 (index 0)
  buyer1Name:     { page: 0, x: 152, y: 204 },
  buyer1Abn:      { page: 0, x: 495, y: 204 },
  buyer1Address:  { page: 0, x: 152, y: 188 },
  buyer1Suburb:   { page: 0, x: 152, y: 171 },
  buyer1State:    { page: 0, x: 332, y: 171 },
  buyer1Postcode: { page: 0, x: 520, y: 171 },
  buyer1Phone:    { page: 0, x: 152, y: 155 },
  buyer1Mobile:   { page: 0, x: 326, y: 155 },
  buyer1Email:    { page: 0, x: 435, y: 155 },

  // Buyer 2 — page 1 (index 0)
  buyer2Name:     { page: 0, x: 152, y: 133 },
  buyer2Abn:      { page: 0, x: 495, y: 133 },
  buyer2Address:  { page: 0, x: 152, y: 117 },
  buyer2Suburb:   { page: 0, x: 152, y: 101 },
  buyer2State:    { page: 0, x: 332, y: 101 },
  buyer2Postcode: { page: 0, x: 520, y: 101 },
  buyer2Phone:    { page: 0, x: 152, y: 85  },
  buyer2Mobile:   { page: 0, x: 326, y: 85  },
  buyer2Email:    { page: 0, x: 435, y: 85  },

  // Buyer's Agent — page 2 (index 1)
  buyerAgentName:          { page: 1, x: 152, y: 790 },
  buyerAgentAbn:           { page: 1, x: 152, y: 760 },
  buyerAgentLicenceNumber: { page: 1, x: 400, y: 760 },
  buyerAgentAddress:       { page: 1, x: 152, y: 743 },
  buyerAgentSuburb:        { page: 1, x: 152, y: 725 },
  buyerAgentState:         { page: 1, x: 332, y: 725 },
  buyerAgentPostcode:      { page: 1, x: 520, y: 725 },
  buyerAgentPhone:         { page: 1, x: 152, y: 710 },
  buyerAgentMobile:        { page: 1, x: 326, y: 710 },
  buyerAgentEmail:         { page: 1, x: 435, y: 710 },

  // Buyer's Solicitor — page 2 (index 1)
  buyerSolicitorName:     { page: 1, x: 152, y: 676 },
  buyerSolicitorRef:      { page: 1, x: 152, y: 660 },
  buyerSolicitorAddress:  { page: 1, x: 152, y: 644 },
  buyerSolicitorSuburb:   { page: 1, x: 152, y: 626 },
  buyerSolicitorState:    { page: 1, x: 332, y: 626 },
  buyerSolicitorPostcode: { page: 1, x: 520, y: 626 },
  buyerSolicitorPhone:    { page: 1, x: 152, y: 611 },
  buyerSolicitorMobile:   { page: 1, x: 326, y: 611 },
  buyerSolicitorEmail:    { page: 1, x: 435, y: 611 },

  // The Property — page 2 (index 1)
  address:        { page: 1, x: 152, y: 561 },
  suburb:         { page: 1, x: 152, y: 545 },
  state:          { page: 1, x: 332, y: 545 },
  postcode:       { page: 1, x: 520, y: 545 },
  lot:            { page: 1, x: 152, y: 507 },
  plan:           { page: 1, x: 332, y: 507 },
  area:           { page: 1, x: 425, y: 507 },
  titleReference: { page: 1, x: 195, y: 491 },
  presentUse:       { page: 1, x: 195, y: 440 },
  localGovernment:  { page: 1, x: 195, y: 425 },
  excludedFixtures: { page: 1, x: 195, y: 410 },
  includedChattels: { page: 1, x: 195, y: 378 },

  // The Price — page 2 (index 1)
  purchasePrice:             { page: 1, x: 152, y: 264 },
  depositInitial:            { page: 1, x: 152, y: 208 },
  depositBalance:            { page: 1, x: 165, y: 143 },
  depositPayableOn:          { page: 1, x: 155, y: 120 },
  depositHolder:             { page: 1, x: 400, y: 260 },
  depositHolderTrustAccount: { page: 1, x: 400, y: 225 },
  depositBank:               { page: 1, x: 400, y: 175 },
  depositBsb:                { page: 1, x: 380, y: 143 },
  depositAccountNo:          { page: 1, x: 505, y: 143 },
  defaultInterestRate:       { page: 1, x: 470, y: 120 },

  // Settlement Date — page 3 (index 2)
  settlementDate: { page: 2, x: 166, y: 776 },

  // Conditions — page 3 (index 2)
  financeAmount:  { page: 2, x: 157, y: 215 },
  financier:      { page: 2, x: 145, y: 200 },
  financeDate:    { page: 2, x: 145, y: 162 },
  inspectionDate: { page: 2, x: 390, y: 217 },

  // Matters Affecting Property / Encumbrances text — page 4 (index 3)
  encumbrancesText: { page: 3, x: 95,  y: 600 },

  // Rental History last rent increase date — page 4 (index 3)
  lastRentDate:     { page: 3, x: 300, y: 390 },

  // Community Titles (a–g) right-column text — page 5 (index 4)
  communityTitlesA: { page: 4, x: 273, y: 705 },
  communityTitlesB: { page: 4, x: 273, y: 670 },
  communityTitlesC: { page: 4, x: 273, y: 630 },
  communityTitlesD: { page: 4, x: 273, y: 595 },
  communityTitlesE: { page: 4, x: 273, y: 557 },
  communityTitlesF: { page: 4, x: 273, y: 520 },
  communityTitlesG: { page: 4, x: 273, y: 487 },

  // Records Inspection Date — page 5 (index 4)
  recordsInspectionDate: { page: 4, x: 190, y: 420 },

  // Building Units & Group Titles Act notice items (a–d) — page 5 (index 4)
  buildingUnitsNoticeA: { page: 4, x: 273, y: 320 },
  buildingUnitsNoticeB: { page: 4, x: 273, y: 280 },
  buildingUnitsNoticeC: { page: 4, x: 273, y: 245 },
  buildingUnitsNoticeD: { page: 4, x: 273, y: 210 },
  buildingUnitsInspectionDate: { page: 4, x: 190, y: 145 },

  // Signing fields — page 6 (index 5)
  buyer1SigningName: { page: 5, x: 100, y: 443 },
  buyer1SigningDate: { page: 5, x: 235, y: 443 },
  buyer1Witness:     { page: 5, x: 363, y: 443 },
  buyer2SigningName: { page: 5, x: 100, y: 404 },
  buyer2SigningDate: { page: 5, x: 235, y: 404 },
  buyer2Witness:     { page: 5, x: 363, y: 404 },
  seller1SigningName: { page: 5, x: 100, y: 348 },
  seller1SigningDate: { page: 5, x: 235, y: 348 },
  seller1Witness:     { page: 5, x: 363, y: 348 },
  seller2SigningName: { page: 5, x: 100, y: 308 },
  seller2SigningDate: { page: 5, x: 235, y: 308 },
  seller2Witness:     { page: 5, x: 363, y: 308 },
}
