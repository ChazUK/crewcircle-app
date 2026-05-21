import { defineSchema } from "convex/server";

import { calendarsSchema } from "./calendars/schema";
import { certificationsSchema } from "./certifications/schema";
import { contactsSchema } from "./contacts/schema";
import { jobsSchema } from "./jobs/schema";
import { kitSchema } from "./kit/schema";
import { membershipsSchema } from "./memberships/schema";
import { notificationsSchema } from "./notifications/schema";
import { usersSchema } from "./users/schema";

export default defineSchema({
  ...usersSchema,
  ...kitSchema,
  ...calendarsSchema,
  ...jobsSchema,
  ...contactsSchema,
  ...notificationsSchema,
  ...certificationsSchema,
  ...membershipsSchema,
});
