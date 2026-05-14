import { DEPARTMENT_ROLES } from "@shared/departments/departments";
import { ConvexError, v } from "convex/values";

import { mutation } from "../../_generated/server";
import { getUserByExternalId } from "../db/getUser";
import { departmentValidator } from "../schema";

export const updateDepartmentAndRoles = mutation({
  args: {
    department: departmentValidator,
    roles: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const user = await getUserByExternalId(ctx, identity.subject);
    if (!user) throw new ConvexError("User not found");

    if (args.roles.length === 0) {
      throw new ConvexError("At least one role must be selected");
    }

    const validRoles = DEPARTMENT_ROLES[args.department];
    for (const role of args.roles) {
      if (!validRoles.includes(role)) {
        throw new ConvexError(`Role "${role}" does not belong to department "${args.department}"`);
      }
    }

    await ctx.db.patch(user._id, {
      department: args.department,
      roles: args.roles,
    });
  },
});
