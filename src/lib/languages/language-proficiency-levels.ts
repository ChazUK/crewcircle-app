export const LANGUAGE_PROFICIENCY_LEVELS = ["Native", "Fluent", "Conversational", "Basic"] as const;

export type LanguageProficiencyLevel = (typeof LANGUAGE_PROFICIENCY_LEVELS)[number];
