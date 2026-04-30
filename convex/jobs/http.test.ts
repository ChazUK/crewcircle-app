/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import schema from "../schema";

const modules = import.meta.glob("/convex/**/*.ts");

const IDENTITY = {
  subject: "clerk_user_1",
  issuer: "https://example.clerk.test",
  tokenIdentifier: "https://example.clerk.test|clerk_user_1",
};

const OTHER_IDENTITY = {
  subject: "clerk_user_2",
  issuer: "https://example.clerk.test",
  tokenIdentifier: "https://example.clerk.test|clerk_user_2",
};

async function setupUserWithBookedJob() {
  const t = convexTest(schema, modules);

  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      externalAuthId: IDENTITY.subject,
      email: "me@example.com",
      hasCompletedOnboarding: false,
    }),
  );

  const jobId = await t.run((ctx) =>
    ctx.db.insert("jobs", {
      status: "filled",
      assignedUserId: userId,
      title: "Feature Film Shoot",
      role: "Key Grip",
      productionTitle: "The Lighthouse Project",
      location: "Pinewood Studios",
      startsAt: Date.UTC(2026, 5, 15, 8, 0, 0),
      endsAt: Date.UTC(2026, 5, 15, 18, 0, 0),
    }),
  );

  return { t, userId, jobId };
}

describe("GET /calendar/event/:id.ics", () => {
  test("returns 401 when unauthenticated", async () => {
    const { t, jobId } = await setupUserWithBookedJob();
    const response = await t.fetch(`/calendar/event/${jobId}.ics`);
    expect(response.status).toBe(401);
  });

  test("returns 200 with correct content-type when authenticated owner requests event", async () => {
    const { t, jobId } = await setupUserWithBookedJob();
    const response = await t.withIdentity(IDENTITY).fetch(`/calendar/event/${jobId}.ics`);
    expect(response.status).toBe(200);
    const contentType = response.headers.get("Content-Type");
    expect(contentType).toContain("text/calendar");
    expect(contentType).toContain("charset=utf-8");
  });

  test("returns content-disposition attachment header", async () => {
    const { t, jobId } = await setupUserWithBookedJob();
    const response = await t.withIdentity(IDENTITY).fetch(`/calendar/event/${jobId}.ics`);
    const disposition = response.headers.get("Content-Disposition");
    expect(disposition).toContain("attachment");
    expect(disposition).toContain("event.ics");
  });

  test("returns 403 when a different user requests the event", async () => {
    const { t, jobId } = await setupUserWithBookedJob();

    await t.run((ctx) =>
      ctx.db.insert("users", {
        externalAuthId: OTHER_IDENTITY.subject,
        email: "other@example.com",
        hasCompletedOnboarding: false,
      }),
    );

    const response = await t.withIdentity(OTHER_IDENTITY).fetch(`/calendar/event/${jobId}.ics`);
    expect(response.status).toBe(403);
  });

  test("returns 404 for a non-existent event id", async () => {
    const { t } = await setupUserWithBookedJob();
    const response = await t.withIdentity(IDENTITY).fetch("/calendar/event/j57fakenotarealid.ics");
    expect(response.status).toBe(404);
  });

  test("returns 404 for a job that is not filled", async () => {
    const { t, userId } = await setupUserWithBookedJob();
    const openJobId = await t.run((ctx) =>
      ctx.db.insert("jobs", {
        status: "open",
        assignedUserId: userId,
        title: "Open Shoot",
        role: "Key Grip",
        productionTitle: "The Lighthouse Project",
        startsAt: Date.UTC(2026, 5, 15, 8, 0, 0),
        endsAt: Date.UTC(2026, 5, 15, 18, 0, 0),
      }),
    );
    const response = await t.withIdentity(IDENTITY).fetch(`/calendar/event/${openJobId}.ics`);
    expect(response.status).toBe(404);
  });

  test("VEVENT contains SUMMARY populated from job title", async () => {
    const { t, jobId } = await setupUserWithBookedJob();
    const response = await t.withIdentity(IDENTITY).fetch(`/calendar/event/${jobId}.ics`);
    const body = await response.text();
    const unfolded = body.replace(/\r\n[ \t]/g, "");
    expect(unfolded).toContain("SUMMARY:Feature Film Shoot");
  });

  test("VEVENT contains DTSTART in UTC format", async () => {
    const { t, jobId } = await setupUserWithBookedJob();
    const response = await t.withIdentity(IDENTITY).fetch(`/calendar/event/${jobId}.ics`);
    const body = await response.text();
    const unfolded = body.replace(/\r\n[ \t]/g, "");
    expect(unfolded).toContain("DTSTART:20260615T080000Z");
  });

  test("VEVENT contains DTEND in UTC format", async () => {
    const { t, jobId } = await setupUserWithBookedJob();
    const response = await t.withIdentity(IDENTITY).fetch(`/calendar/event/${jobId}.ics`);
    const body = await response.text();
    const unfolded = body.replace(/\r\n[ \t]/g, "");
    expect(unfolded).toContain("DTEND:20260615T180000Z");
  });

  test("VEVENT contains LOCATION from job", async () => {
    const { t, jobId } = await setupUserWithBookedJob();
    const response = await t.withIdentity(IDENTITY).fetch(`/calendar/event/${jobId}.ics`);
    const body = await response.text();
    const unfolded = body.replace(/\r\n[ \t]/g, "");
    expect(unfolded).toContain("LOCATION:Pinewood Studios");
  });

  test("VEVENT contains DESCRIPTION with role and production title", async () => {
    const { t, jobId } = await setupUserWithBookedJob();
    const response = await t.withIdentity(IDENTITY).fetch(`/calendar/event/${jobId}.ics`);
    const body = await response.text();
    const unfolded = body.replace(/\r\n[ \t]/g, "");
    expect(unfolded).toContain("Key Grip");
    expect(unfolded).toContain("The Lighthouse Project");
  });

  test("UID is stable across two requests for the same job", async () => {
    const { t, jobId } = await setupUserWithBookedJob();

    const extractUid = (body: string) => {
      const unfolded = body.replace(/\r\n[ \t]/g, "");
      const match = /^UID:(.+)$/m.exec(unfolded);
      return match?.[1];
    };

    const first = await t.withIdentity(IDENTITY).fetch(`/calendar/event/${jobId}.ics`);
    const second = await t.withIdentity(IDENTITY).fetch(`/calendar/event/${jobId}.ics`);

    const uid1 = extractUid(await first.text());
    const uid2 = extractUid(await second.text());

    expect(uid1).toBeTruthy();
    expect(uid1).toBe(uid2);
  });
});
