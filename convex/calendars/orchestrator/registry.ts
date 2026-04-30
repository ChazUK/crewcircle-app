"use node";

import { GoogleCalendarAdapter } from "../adapters/google";
import { ICalAdapter } from "../adapters/ical";
import { MicrosoftCalendarAdapter } from "../adapters/microsoft";
import { createCalendarOrchestrator } from "./index";

const adapterRegistry = {
  google: GoogleCalendarAdapter,
  ical: ICalAdapter,
  microsoft: MicrosoftCalendarAdapter,
};

export const orchestrator = createCalendarOrchestrator(adapterRegistry);
