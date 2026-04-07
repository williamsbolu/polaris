// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://6db5b8cc8bc052ff0076e98156fbaaf9@o4509298970329088.ingest.de.sentry.io/4511161297600592",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
  integrations: [
    Sentry.vercelAIIntegration(),
    // send console.log, console.warn and console.error calls as logs to sentry
    Sentry.consoleLoggingIntegration({
      levels: ["log", "warn", "error"],
    }),
  ],
});
