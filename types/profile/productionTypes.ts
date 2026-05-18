export const PRODUCTION_TYPES = [
  "Feature Film",
  "TV Drama",
  "TV Comedy",
  "Documentary",
  "Commercial",
  "Music Video",
  "Corporate",
  "Short Film",
  "Streaming Series",
  "Reality TV",
  "Other",
] as const;

export type ProductionType = (typeof PRODUCTION_TYPES)[number];
