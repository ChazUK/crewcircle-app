import { render } from "@react-email/render";
import { describe, expect, test } from "vitest";

import { ContactInviteEmail } from "./ContactInviteEmail";

const baseProps = {
  inviterName: "Jane Doe",
  inviterEmail: "jane@example.com",
  recipientEmail: "bob@example.com",
  acceptUrl: "https://crewcircle.app/invite/abc123",
};

describe("ContactInviteEmail", () => {
  test("renders inviter name, recipient email and accept link", async () => {
    const html = await render(ContactInviteEmail(baseProps));
    expect(html).toContain("Jane Doe");
    expect(html).toContain("jane@example.com");
    expect(html).toContain("bob@example.com");
    expect(html).toContain("https://crewcircle.app/invite/abc123");
    expect(html).toContain("You have been invited to join Crew Circle");
  });

  test("includes personal message when provided", async () => {
    const html = await render(ContactInviteEmail({ ...baseProps, message: "Join my crew!" }));
    expect(html).toContain("Join my crew!");
    expect(html).toContain("Personal message");
  });

  test("omits personal message section when not provided", async () => {
    const html = await render(ContactInviteEmail(baseProps));
    expect(html).not.toContain("Personal message");
  });

  test("renders a usable plain-text version", async () => {
    const text = await render(ContactInviteEmail(baseProps), { plainText: true });
    expect(text).toContain("Jane Doe");
    expect(text).toContain("https://crewcircle.app/invite/abc123");
  });
});
