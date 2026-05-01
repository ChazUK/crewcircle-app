"use node";

import { GoogleCalendarProvider } from "../providers/google";
import { ICalProvider } from "../providers/ical";
import { MicrosoftCalendarProvider } from "../providers/microsoft";
import { NativeCalendarProvider } from "../providers/native";
import { createCalendarService } from "./index";

export const providerRegistry = {
  google: GoogleCalendarProvider,
  ical: ICalProvider,
  microsoft: MicrosoftCalendarProvider,
  native: NativeCalendarProvider,
};

export const calendarService = createCalendarService(providerRegistry);
