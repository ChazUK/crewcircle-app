import { internal } from "../_generated/api";
import { type Id } from "../_generated/dataModel";
import { httpAction } from "../_generated/server";
import { generateIcs } from "./domain/generateIcs";

export const downloadIcalHandler = httpAction(async (ctx, req) => {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const filename = segments[segments.length - 1] ?? "";

  if (!filename.endsWith(".ics")) {
    return new Response("Not found", { status: 404 });
  }

  const crewEventId = filename.slice(0, -4);

  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return new Response("Unauthorized", { status: 401 });
  }

  let result;
  try {
    result = await ctx.runQuery(internal.crewEvents.queries.getByIdForUser, {
      id: crewEventId as Id<"crewEvents">,
      externalAuthId: identity.subject,
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }

  if (result.kind === "not_found") {
    return new Response("Not found", { status: 404 });
  }

  if (result.kind === "forbidden") {
    return new Response("Forbidden", { status: 403 });
  }

  const { event } = result;
  const uid = `${crewEventId}@crewcircle.app`;
  const description = `Role: ${event.role}\nProduction: ${event.productionTitle}`;

  const ics = generateIcs({
    uid,
    dtstamp: Date.now(),
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    title: event.title,
    description,
    location: event.location,
  });

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="event.ics"',
    },
  });
});
