export type VisibilityMode =
  | "self"
  | "contact"
  | "public-card"
  | "pm-self"
  | "pm-job-linked"
  | "hidden";

export type ProfileVisibility =
  | { mode: "self" }
  | { mode: "contact" }
  | { mode: "public-card" }
  | { mode: "pm-self" }
  | { mode: "pm-job-linked" }
  | { mode: "hidden" };
