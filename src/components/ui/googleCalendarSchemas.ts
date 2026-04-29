import { z } from "zod";

export const GoogleCalendarItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  primary: z.boolean(),
  accessRole: z.string().optional(),
  backgroundColor: z.string().optional(),
});

export const GoogleCalendarListSchema = z.array(GoogleCalendarItemSchema);

export type GoogleCalendarItem = z.infer<typeof GoogleCalendarItemSchema>;
