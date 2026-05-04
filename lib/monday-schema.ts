/**
 * Typed constants for every Monday.com board + column the app touches.
 * UI code should import from here; never hardcode raw Monday column IDs
 * outside this file.
 */

export const CRUISE = {
  boardId: "18397459741",
  groupId: "topics", // default group id; Monday uses "topics" as the default
  columns: {
    outcome: {
      id: "color_mm00mts9",
      type: "status" as const,
      labels: [
        "Planned",
        "Tentative",
        "Completed",
        "Canceled - Weather",
        "Canceled - Mechanical",
      ] as const,
    },
    weather: { id: "text_mm00nhpe", type: "text" as const },
    wind: { id: "text_mm00vhqp", type: "text" as const },
    guests: { id: "numeric_mm00pmth", type: "numbers" as const },
    crewCount: { id: "numeric_mm00d0pq", type: "numbers" as const },
    cruiseType: {
      id: "color_mm00nh83",
      type: "status" as const,
      labels: [
        "Lock-n-Lunch",
        "Dinner",
        "Private",
        "Narrated sightseeing",
        "Other",
        "Sunset/Music",
      ] as const,
    },
    captain: {
      id: "color_mm00r8dx",
      type: "status" as const,
      labels: ["Marty McConville", "George Steinbach", "Other"] as const,
    },
    departureTime: { id: "text_mm00xxw8", type: "text" as const },
    returnTime: { id: "text_mm00jf3r", type: "text" as const },
    notes: { id: "long_text_mm0047es", type: "long_text" as const },
  },
} as const;

export const CLEANING = {
  boardId: "18397481492",
  groupId: "topics",
  columns: {
    date: { id: "date4", type: "date" as const },
    crewMember: { id: "text_mm007rsw", type: "text" as const },
    cleaningType: {
      id: "color_mm004m72",
      type: "status" as const,
      labels: ["Interior", "Exterior", "Bar"] as const,
    },
    afterPictures: { id: "file_mm00y2dj", type: "file" as const },
    maintenanceNeeded: {
      id: "color_mm00gzrv",
      type: "status" as const,
      labels: ["No", "Yes"] as const,
    },
    notes: { id: "text_mm00ddhk", type: "text" as const },
  },
} as const;

export const MAINTENANCE = {
  boardId: "18397489685",
  groupId: "topics",
  columns: {
    date: { id: "date4", type: "date" as const },
    crewMember: { id: "text_mm007rsw", type: "text" as const },
    maintenanceType: {
      id: "color_mm004m72",
      type: "status" as const,
      labels: [
        "Cabin",
        "Engine",
        "Bar",
        "Hull",
        "Electrical",
        "Plumbing",
        "HVAC",
        "Other",
      ] as const,
    },
    beforePictures: { id: "file_mm00bcz5", type: "file" as const },
    afterPictures: { id: "file_mm00y2dj", type: "file" as const },
    resolved: {
      id: "color_mm00gzrv",
      type: "status" as const,
      labels: ["Yes", "Not Yet"] as const,
    },
    notes: { id: "text_mm00ddhk", type: "text" as const },
  },
} as const;

export const DRAWER_CLOSE = {
  boardId: "18410139206",
  groups: {
    needsReview: "topics",
    approved: "group_mm2q32gh",
    readyToDeposit: "group_mm2qm32t",
    thisWeek: "group_mm2qw75t",
    deposited: "group_mm2qewe0",
    archive: "group_mm2qdfbz",
  },
  columns: {
    bartender: {
      id: "color_mm2q9kms",
      type: "status" as const,
      labels: [
        "Bailey Burke",
        "Bailey Simpson",
        "Saralynn Simpson",
        "Sharon Weber",
        "Kelly Shymanski",
      ] as const,
    },
    shiftDate: { id: "date_mm2qqz7", type: "date" as const },
    shiftType: {
      id: "color_mm2q500k",
      type: "status" as const,
      labels: [
        "Public Sunset with Food",
        "Public Sunset without Food",
        "Sightseeing",
        "Private Cruise",
        "Default",
        "Lock n Lunch",
      ] as const,
    },
    drawer: {
      id: "color_mm2qytc4",
      type: "status" as const,
      labels: ["Patio Bar", "Main Bar"] as const,
    },
    openingAmount: { id: "numeric_mm2qwrqd", type: "numbers" as const },
    posSales: { id: "numeric_mm2qseap", type: "numbers" as const },
    creditCardSales: { id: "numeric_mm2q6281", type: "numbers" as const },
    cashSales: { id: "numeric_mm2qx0wn", type: "numbers" as const },
    tipsCreditCard: { id: "numeric_mm2qpqa3", type: "numbers" as const },
    payouts: { id: "numeric_mm2qqazz", type: "numbers" as const },
    // Main Bar only: cash transferred to and returned from Patio
    transferredToPatio: { id: "numeric_mm2q3ger", type: "numbers" as const },
    returnedFromPatio: { id: "numeric_mm2q6qvr", type: "numbers" as const },
    expectedCash: { id: "numeric_mm2qtsy", type: "numbers" as const },
    closingCount: { id: "numeric_mm2qbhz2", type: "numbers" as const },
    variance: { id: "numeric_mm2qgzap", type: "numbers" as const },
    status: {
      id: "color_mm2qkmas",
      type: "status" as const,
      labels: [
        "Needs Review",
        "Balanced",
        "Short",
        "Over",
        "Approved",
        "Ready to Deposit",
        "Deposited",
      ] as const,
    },
    posPhoto: { id: "file_mm2q4aq6", type: "file" as const },
    notes: { id: "long_text_mm2qntms", type: "long_text" as const },
    // Admin-only
    adminReviewNotes: { id: "long_text_mm2qd3ng", type: "long_text" as const },
    // Deposit phase
    toDeposit: { id: "numeric_mm2q20rg", type: "numbers" as const },
    deposited: { id: "numeric_mm2qt4t2", type: "numbers" as const },
    bankReceiptPhoto: { id: "file_mm2qnvmp", type: "file" as const },
    depositDate: { id: "date_mm2qm269", type: "date" as const },
    depositVariance: { id: "numeric_mm2q9ww6", type: "numbers" as const },
    depositedBy: {
      id: "color_mm2qpcgq",
      type: "status" as const,
      labels: ["Gentry", "Laura", "Sharon", "Bailey Burke", "Other"] as const,
    },
  },
} as const;

export const TRANSACTIONS = {
  boardId: "18397491329",
  groupId: "topics",
  columns: {
    receipts: { id: "file_mm00sn82", type: "file" as const },
    date: { id: "date_mm00t8aw", type: "date" as const },
    transactionName: { id: "text_mm0066ar", type: "text" as const },
    amount: { id: "numeric_mm2qje00", type: "numbers" as const },
    currency: {
      id: "dropdown_mm00waad",
      type: "dropdown" as const,
      labels: ["Cash", "Credit Card", "Check"] as const,
    },
    transactionType: {
      id: "dropdown_mm00zvjr",
      type: "dropdown" as const,
      labels: ["Income", "Expense"] as const,
    },
    person: {
      id: "dropdown_mm002bs9",
      type: "dropdown" as const,
      labels: ["Laura", "Gentry", "Sharon", "Jeff"] as const,
    },
    // Record Status intentionally omitted — new items get Monday default "New"
    payeePayer: { id: "text_mm00egcr", type: "text" as const },
    category: {
      id: "color_mm00ypb6",
      type: "status" as const,
      labels: [
        "Private Event Sales",
        "Public Ticket Sales",
        "Bar Deposit",
        "Liquor Expense",
        "Supply/Material Expense",
        "Boat Maintenance",
        "Software",
        "Cruise Entertainment",
        "Cruise Food",
        "Crew Food",
        "Fuel",
        "Utilities",
        "Rent",
        "Marketing",
        "Payroll",
        "Payroll Taxes",
        "Sales Tax",
        "Insurance",
        "Other",
      ] as const,
    },
    notes: { id: "long_text_mm009gnd", type: "long_text" as const },
  },
} as const;

export const TRAINING = {
  boardId: "18410848889",
  /** Legacy default; `create_item` uses `resolveGroupIdFromSnapshot` + `MONDAY_TRAINING_GROUP_ID`. */
  groupId: "topics",
  columns: {
    submittedBy: { id: "text_mm2w4aqt", type: "text" as const },
    trainingType: { id: "dropdown_mm2wwq7f", type: "dropdown" as const },
    attachments: { id: "file_mm31a1xr", type: "file" as const },
  },
} as const;
