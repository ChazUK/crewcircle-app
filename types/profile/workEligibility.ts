export const WORK_ELIGIBILITY_REGIONS = [
  "Right to Work UK",
  "Schengen",
  "USA",
  "Canada",
  "Australia",
  "New Zealand",
  "Ireland",
  "Other",
] as const;

export type WorkEligibilityRegion = (typeof WORK_ELIGIBILITY_REGIONS)[number];
