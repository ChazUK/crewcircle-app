import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { normalizeKitName } from "./normalizeKitName";

export async function findOrCreateCatalogueEntry(
  ctx: MutationCtx,
  rawName: string,
): Promise<Id<"kitCatalogue">> {
  const normalizedName = normalizeKitName(rawName);
  const existing = await ctx.db
    .query("kitCatalogue")
    .withIndex("byNormalizedName", (q) => q.eq("normalizedName", normalizedName))
    .unique();

  if (existing) return existing._id;

  return ctx.db.insert("kitCatalogue", {
    name: rawName.trim(),
    normalizedName,
  });
}
