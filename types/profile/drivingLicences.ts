export const DRIVING_LICENCES = [
  "Car (B)",
  "Motorcycle (A)",
  "HGV/LGV (C)",
  "Bus (D)",
  "Trailer (BE/CE)",
  "Forklift",
  "Other",
] as const;

export type DrivingLicence = (typeof DRIVING_LICENCES)[number];
