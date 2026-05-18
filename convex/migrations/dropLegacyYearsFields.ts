import { internalMutation } from "../_generated/server";

export const dropLegacyYearsFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let updated = 0;
    for (const user of users) {
      const doc = user as Record<string, unknown>;
      if ("yearsExperience" in doc || "yearsInRole" in doc) {
        await ctx.db.patch(user._id, {
          yearsExperience: undefined,
          yearsInRole: undefined,
        });
        updated++;
      }
    }
    return { updated };
  },
});
