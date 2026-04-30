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

**Kit**:
Equipment owned by a Crew Member that is available for use on productions.
_Avoid_: Gear, equipment

**Department**:
The broad production area a Crew Member works within (e.g. Camera, Grip, Sound).
_Avoid_: Division, team

**Spoken Language**:
A language a Crew Member can communicate in, with an associated fluency level.
_Avoid_: Language

**Passport**:
A travel document held by a Crew Member, indicating international work eligibility.
_Avoid_: Travel document

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
