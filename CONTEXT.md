# CrewCircle

CrewCircle is a UK film and TV production crew coordination platform. Crew Members use it to manage availability, broadcast job requests to trusted circles, and keep their working schedule in one place.

_This file is the single canonical domain glossary. It supersedes `UBIQUITOUS_LANGUAGE.md`. All code, UI copy, and documentation should use these terms exactly._

---

## People

**Crew Member**:
A user who can broadcast Jobs to their Circles, receive Job requests, and manage their own schedule and profile.
_Avoid_: Worker, freelancer, crew

**Production Manager**:
A distinct account type that can only post Jobs and receive a selected Applicant's contact details once a Job is filled. Cannot broadcast to Circles or receive Job requests.
_Avoid_: PM, producer, coordinator

**Requester**:
The Crew Member who broadcasts a Job to one of their Circles to find a replacement.
_Avoid_: Sender, poster, dispatcher

**Applicant**:
A Circle Member who has responded as available to a specific Job broadcast.
_Avoid_: Respondent, candidate

**Circle Owner**:
The Crew Member who created and manages a Circle; the only person who can see and manage its membership.
_Avoid_: Admin, manager

**Circle Member**:
A Crew Member who has accepted an invitation to belong to a Circle.
_Avoid_: Member, contact

---

## Circles

**Circle**:
A private, owner-managed group of Crew Members who share the same department or role type.
_Avoid_: Group, team, list, network

**Invite**:
A request sent by a Circle Owner via email or phone number to add a Crew Member to a Circle.
_Avoid_: Request, link

---

## Jobs

**Job**:
A broadcast request sent to a Circle seeking an available Crew Member to fill a vacant role on a production.
_Avoid_: Booking, gig, request, shift

**Production Title**:
The name or codename of the production associated with a Job.
_Avoid_: Show name, project name

**Role**:
The specific crew position required for a Job (e.g. Key Grip, Focus Puller).
_Avoid_: Position, title, job title

**Day Rate**:
The offered daily pay rate for a Job, expressed in GBP.
_Avoid_: Rate, fee, salary

**Shoot Type**:
Whether a Job takes place indoors or outdoors: `interior` or `exterior`.
_Avoid_: Location type

**Day Type**:
The working hours pattern for a Job: `day`, `night`, or `split day`.
_Avoid_: Shift type

**Job Status**:
The current state of a Job: `open`, `filled`, or `cancelled`.
_Avoid_: State, stage

**Availability Response**:
A Circle Member's reply to a Job broadcast: `available` or `not available`, optionally with a message.
_Avoid_: Application, reply, RSVP

**Location Base**:
The geographic areas a Crew Member is willing to work from or travel to.
_Avoid_: Work location, base

---

## Profile

**Nickname**:
The professional "known-as" name a Crew Member chooses to be addressed by, distinct from their legal first/last name. Self-declared, visible to everyone who can view the profile. Displayed in brackets after the legal name (e.g. "Jonathan (Joey) Smith"). Common in film/TV where many crew go by a working name.
_Avoid_: Alias, handle, preferred name, nick

**Profile**:
The single page that displays a Crew Member's identity, credentials, and working details. Reusable across two contexts: viewing your own (with edit affordances) or viewing another's (read-only). What's shown depends on the viewer's relationship to the subject — see **Profile Visibility**.
_Avoid_: User page, about

**Profile Visibility**:
The rule that controls what fields of a Profile a viewer can see. Depends on the subject's user type:

For **Crew Member** Profiles, three viewer relationships:

- **Self** — sees all fields plus edit affordances (section-level edit pencils, profile-picture upload control).
- **Contact** (the viewer is in the subject's Contacts) — sees all fields, read-only.
- **Non-contact** — sees only the Public Card. Only viewable at all if the subject's `isPublic` flag is `true`; otherwise the Profile returns "not found."

For **Production Manager** Profiles, two viewer relationships:

- **Self** — sees all PM fields plus edit affordances.
- **Job-linked Viewer** — a Crew Member who shares a Job with the Production Manager (Requester of that Job, Applicant to it, or Circle Member of the Circle it was broadcast to) sees the PM Profile read-only.
- **Anyone else** — the Profile returns "not found." Production Manager Profiles are never publicly discoverable; their identity is revealed only in the context of a specific Job. (Enforcement of the Job-linkage check depends on `Job.productionManagerId` and Circle-exposure tracking, both of which are not yet in the schema — until those land, the query treats any non-Self PM Profile view as "not found.")

**Public Card**:
The minimal subset of Crew Member Profile fields shown to a Non-contact viewer: profile picture, legal first name, legal last name, Nickname, City, Country, Department, Roles. No bio, links, kit, languages, or credentials.
_Avoid_: Basic profile, preview, summary card

**Production Manager Profile**:
A reduced Profile rendered for Production Manager accounts. Fields: profile picture, legal first name, legal last name, City, Country, Production Company, Bio, Website. No Nickname, Department, Roles, Kit, Certifications, Memberships, Driving Licences, Work Eligibility, Passports, Spoken Languages, Production Types, IMDB, CV, or Years in Department — those fields are Crew-only. Visibility governed by **Profile Visibility** (Job-linked).
_Avoid_: PM profile (in code/UI copy)

**Production Company**:
The organisation a Production Manager currently works under. A free-text field on the user record, shown only on Production Manager Profiles.
_Avoid_: Employer, studio, company

**isPublic**:
A flag on the Crew Member's user record. When `true`, the Crew Member is discoverable in user search and their Public Card is viewable by Non-contacts. When `false`, the Crew Member does not appear in user search and any direct attempt to load their Profile by a Non-contact returns "not found."

**Profile File**:
Any binary asset attached to a Profile — currently the profile picture, the CV PDF, and Certification evidence. All Profile Files live in Convex storage and are referenced from data rows as `Id<"_storage">`. The legacy URL-string fields (`users.profilePictureUrl`, `users.cvUrl`) are replaced by `profilePictureFileId` and `cvFileId`. On signup, if Clerk provides an OAuth profile image, it is copied once into Convex storage as a one-time seed; thereafter Clerk's image is ignored. Viewers receive short-lived signed URLs via `ctx.storage.getUrl`; visibility follows **Profile Visibility** (Non-contacts never receive a URL for a CV or evidence file).
_Avoid_: Asset, attachment, blob

**Kit**:
Equipment owned by a Crew Member that is available for use on productions. Two tables: `kitCatalogue` is the shared canonical list of equipment names (organically grown — users can add new entries, deduped against existing rows by normalized name on insert), and `userKit` is the per-user ownership join `{ userId, kitCatalogueId }`. The legacy `users.kit` string array is removed.
_Avoid_: Gear, equipment

**Department**:
The broad production area a Crew Member works within. A Crew Member belongs to exactly one Department and must have one set once onboarding is complete (`hasCompletedOnboarding === true` implies `department` is set and at least one Role is selected). Drawn from a fixed, curated list in `types/departments/departments.ts`. Free-text Departments are not allowed. Production Manager accounts do not have a Department.
_Avoid_: Division, team

**Spoken Language**:
A language a Crew Member can communicate in, with an associated fluency level. Stored as a nested array on the user: `{ language: ISO639_1Code, fluency: "native" | "fluent" | "conversational" | "basic" }`. Drawn from a closed list in `types/profile/languages.ts`; free-text languages are not allowed.
_Avoid_: Language

**Passport**:
A travel document held by a Crew Member, indicating international work eligibility. Stored as an array of ISO 3166-1 alpha-2 country codes on the user. Drawn from a closed list in `types/profile/countries.ts`; free-text countries are not allowed.
_Avoid_: Travel document

**Work Eligibility**:
A region or scheme under which a Crew Member is legally permitted to accept paid work. Multi-select from a fixed list in `types/profile/workEligibility.ts`. Stored as a string array on the user. No visa expiry is tracked; the flag means "I am currently eligible." Initial list: Right to Work UK, Schengen, Right to Work USA, Right to Work Canada, Right to Work Australia, Right to Work Ireland.
_Avoid_: Visa, right to work (alone — qualify with region)

**Driving Licence**:
A UK driving qualification a Crew Member holds. Multi-select from a fixed list in `types/profile/drivingLicences.ts`. No expiry tracked. Initial list: Car (B), Motorcycle (A), Minibus (D1), Bus (D), HGV Class 2 (C), HGV Class 1 (C+E), Forklift, Trailer (B+E), International Driving Permit.
_Avoid_: Licence (alone), driving cert

**Certification**:
A training or safety credential a Crew Member holds (e.g. First Aid at Work, IPAF 3a, PASMA, ScreenSkills Production Safety Passport). Each Certification is a separate entity in the `certifications` table, owned by a Crew Member via `userId`. Fields: name, optional issuer, optional reference number, optional expiry date, optional evidence file (Convex storage). Managed through dedicated screens (list / add / edit / view).
_Avoid_: Training, ticket, qualification

**Professional Membership**:
A trade body or guild a Crew Member belongs to (e.g. BECTU, BSC, GBCT, BAFTA). Each Membership is a separate entity in the `memberships` table, owned by a Crew Member via `userId`. Fields: name, optional member number. No expiry. No evidence.
_Avoid_: Guild, union, body (alone)

---

## Calendar

**Diary**:
The Crew Member's personal schedule view, combining Calendar Events synced from external providers with Jobs that have been added to their calendar. The canonical term for this feature and its screen.
_Avoid_: Calendar, schedule, planner

**Calendar Connection**:
A Crew Member's configured link to an external Calendar Provider, storing credentials and sync state. A Crew Member may have multiple Calendar Connections (e.g. a personal Google account and a work iCal feed).
_Avoid_: Calendar account, integration, feed

**Calendar Provider**:
An external calendar system that a Crew Member can connect to: Google Calendar, iCal URL, Native Calendar, or Microsoft Calendar. Each provider has a distinct connection and sync mechanism.
_Avoid_: Calendar source, calendar service

**Google Calendar**:
The Calendar Provider that uses OAuth and the Google Calendar API. Supports bidirectional sync — events are pulled from Google and Jobs can be written back. One Google account may contain multiple Sub-Calendars.
_Avoid_: Google, GCal

**iCal URL**:
A Calendar Provider that uses a subscription URL conforming to the iCalendar standard (RFC 5545). Read-only — events are pulled but nothing can be written back to an iCal feed.
_Avoid_: iCal feed, ICS feed, webcal

**Native Calendar**:
A Calendar Provider that reads the device's built-in calendar app via the platform API (Calendar.app on iOS, Google Calendar on Android). Events are read on-device and pushed to CrewCircle; Jobs can also be written back to the device calendar. Each device calendar selected by the user becomes its own Calendar Connection.
_Avoid_: Apple Calendar, device calendar (acceptable in documentation but not in code or UI copy)

**Microsoft Calendar**:
A Calendar Provider that uses OAuth and the Microsoft Graph API (covers Microsoft 365, Outlook.com, and Exchange). Bidirectional sync, not yet implemented — reserved in the schema.
_Avoid_: Outlook, Exchange

**Sub-Calendar**:
A named calendar within a Calendar Provider account that can be individually enabled or disabled for sync (e.g. "Work" and "Personal" within a single Google account, or separate device calendars on a phone). Not applicable to iCal URL connections, which are opaque single feeds.
_Avoid_: Calendar list entry, calendar source

**Calendar Event**:
A single event stored in CrewCircle, pulled from an external Calendar Provider via a Calendar Connection. Owned by the Calendar Connection that produced it; replaced in full on each sync.
_Avoid_: Event, appointment, entry

**iCal Download**:
A one-off `.ics` file generated server-side for a specific Booked Job or Requested Job and delivered to the device so the Crew Member can import the event into any calendar app. Distinct from Calendar Sync — this is a one-time, user-triggered action, not an ongoing connection.
_Avoid_: Calendar export, event export

**Booked Job**:
A Job a Crew Member has been confirmed for; appears in their Diary.
_Avoid_: Confirmed booking, accepted job

**Requested Job**:
A Job a Crew Member has been invited to apply for but has not yet been filled; appears in their Diary.
_Avoid_: Pending job, open request

**Calendar Sync**:
The process of fetching Calendar Events from an external Calendar Provider and updating the stored Calendar Events for a Calendar Connection. Server-initiated for Google Calendar, iCal URL, and Microsoft Calendar; device-initiated for Native Calendar.
_Avoid_: Import, refresh, update

**Sync Window**:
The fixed time range within which Calendar Events are fetched and stored: 30 days in the past to 180 days in the future from the moment of sync. The same window applies to all Calendar Providers so Diary views are consistent.
_Avoid_: Date range, fetch window, sync range

---

## Shared types

Types that must be used by both `convex/` (server) and `src/` (client) live in `types/` at the repo root and are imported via the `@shared/*` alias (e.g. `import type { IncomingEvent } from "@shared/calendars"`).

`types/` files must contain **only pure TypeScript type definitions** — no runtime imports. This boundary is what prevents server and client code from mixing. See `CLAUDE.md` → Code Boundaries for the full rules.

## Industry Context

**Diary Service**:
A third-party paid service where a human operator manages a Crew Member's schedule and puts them forward for short-notice roles.
_Avoid_: Agency, booking service

---

## Relationships

- A **Circle** belongs to exactly one **Circle Owner**
- A **Circle** contains one or more **Circle Members**
- A **Circle Member** cannot see other **Circle Members** within the same **Circle**
- A **Job** is broadcast by a **Requester** to exactly one **Circle**
- A **Job** may optionally be assigned a **Production Manager**
- A **Job** receives zero or more **Availability Responses** from **Circle Members**
- An **Applicant** is a **Circle Member** who has submitted an `available` **Availability Response**
- A **Requester** selects exactly one **Applicant** to fill a **Job**, changing its **Job Status** to `filled`
- A **Production Manager** receives the selected **Applicant**'s contact details once a **Job** is `filled`
- A filled **Job** may be re-opened if the selected **Applicant** cannot fulfil it
- A **Crew Member** has zero or more **Calendar Connections**
- A **Calendar Connection** belongs to exactly one **Calendar Provider**
- A **Calendar Connection** contains zero or more **Sub-Calendars**; the subset enabled by the Crew Member are actively synced
- A **Calendar Connection** produces zero or more **Calendar Events**, replaced in full on each **Calendar Sync**
- A **Booked Job** or **Requested Job** can be added to a **Calendar Connection** by the **Crew Member**; each addition is a user-initiated action, not automatic
- The **Diary** displays **Calendar Events** and **Jobs** together within the **Sync Window**

---

## Example dialogue

> **Dev:** "When a **Requester** broadcasts a **Job** to a **Circle**, do all **Circle Members** get notified?"
> **Domain expert:** "Yes — every **Circle Member** gets a push notification and can submit an **Availability Response**."

> **Dev:** "Once the **Requester** picks someone, do the other **Applicants** get told they weren't selected?"
> **Domain expert:** "Only via the **Job Status** changing to `filled` — no push notification goes out unless they actively responded as available."

> **Dev:** "What if the selected person falls through — does the **Job** reopen?"
> **Domain expert:** "Yes, the **Requester** can reopen the **Job** and the process starts again. The existing **Availability Responses** are still visible."

> **Dev:** "Can a **Circle Member** see who else is in their **Circle**?"
> **Domain expert:** "No. A **Circle** is private to the **Circle Owner**. A **Circle Member** can only remove themselves if they're getting too many notifications."

> **Dev:** "If a user connects their Google account, do all their calendars sync?"
> **Domain expert:** "No — they pick which **Sub-Calendars** to enable. Only the enabled ones produce **Calendar Events** in the **Diary**."

> **Dev:** "If a user connects their iPhone calendar, is that a Google Calendar connection or a Native Calendar connection?"
> **Domain expert:** "It's a **Native Calendar** connection — we read from the device via the platform API. If that device calendar happens to be backed by Google, that's invisible to us; we treat it as a **Native Calendar**."

> **Dev:** "Can a user add a **Booked Job** to their iCal feed?"
> **Domain expert:** "No — **iCal URL** is read-only. They can only add it to a **Google Calendar** or **Native Calendar** connection."

---

## Flagged ambiguities

- **"Job" vs "Booking"**: "Booking" implies confirmation; in CrewCircle a Job is a broadcast request that may or may not result in a hire. Use **Job** until confirmed, then **Booked Job**.
- **"Production Manager" vs "user type"**: Production Manager is a distinct account type with restricted permissions (post-only), not just a role label on a standard Crew Member profile. Treat as a separate user type.
- **"Circle" vs "Group"**: "Group" is generic and used by every social platform. **Circle** is the canonical term and should be used in all UI copy and code.
- **"Rate"**: Could refer to a day rate, hourly rate, or weekly rate. Canonical term is **Day Rate** until other rate types are introduced.
- **"apple" in the schema vs Native Calendar**: The `calendarConnections` schema currently uses `"apple"` as the provider literal. The canonical domain term is **Native Calendar** — the connection mechanism is platform-native device calendar access, not Apple-branded. The `"apple"` literal should be migrated to `"native"` when the Native Calendar feature is built out.
- **"outlook" in the schema vs Microsoft Calendar**: The schema uses `"outlook"` as a provider literal. The canonical term is **Microsoft Calendar** (covers Microsoft 365, Outlook.com, and Exchange). The literal should be `"microsoft"` to match when implemented.
- **"Calendar" vs "Diary"**: In code, the feature directory is `convex/calendars/` and the screen is `diary.tsx`. The feature directory name is a code convention; the user-facing concept is the **Diary**. Do not use "Calendar" in UI copy or domain discussions.
- **"Nickname" vs `contacts.nickname` field**: The schema field `contacts.nickname` is a per-viewer private alias (e.g. an owner labelling a contact "Big Dave"), not the canonical **Nickname** which is the Crew Member's self-declared professional known-as name. Decision: `contacts.nickname` is being removed; **Nickname** moves to `users` as the single source of truth.
