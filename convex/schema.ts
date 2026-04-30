import { defineSchema } from "convex/server";

import { calendarsSchema } from "./calendars/schema";
import { crewEventsSchema } from "./crewEvents/schema";
import { kitSchema } from "./kit/schema";
import { usersSchema } from "./users/schema";

export default defineSchema({
  ...usersSchema,
  ...kitSchema,
  ...calendarsSchema,
  ...crewEventsSchema,
});
