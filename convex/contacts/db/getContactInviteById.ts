import { Id } from "@convex/_generated/dataModel";
import { QueryCtx } from "@convex/_generated/server";

export const getContactInviteById = (ctx: QueryCtx, id: Id<"contactInvites">) => ctx.db.get(id);
