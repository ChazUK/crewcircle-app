import { defineSchema } from "convex/server";

import { calendarsSchema } from "./calendars/schema";
import { contactsSchema } from "./contacts/schema";
import { jobsSchema } from "./jobs/schema";
import { kitSchema } from "./kit/schema";
import { notificationsSchema } from "./notifications/schema";
import { usersSchema } from "./users/schema";

export default defineSchema({
  ...usersSchema,
  ...kitSchema,
  ...calendarsSchema,
  ...jobsSchema,
  ...contactsSchema,
  ...notificationsSchema,
});
