import { httpRouter } from "convex/server";

import { downloadIcalHandler } from "./crewEvents/http";
import { handleClerkWebhook } from "./webhooks/clerk/handler";

const http = httpRouter();

http.route({
  path: "/webhooks/clerk",
  method: "POST",
  handler: handleClerkWebhook,
});

http.route({
  pathPrefix: "/calendar/event/",
  method: "GET",
  handler: downloadIcalHandler,
});

export default http;
