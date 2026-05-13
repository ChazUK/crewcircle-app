import { Workpool } from "@convex-dev/workpool";

import { components } from "../_generated/api";

export const emailWorkpool = new Workpool(components.emailWorkpool, {
  maxParallelism: 5,
  retryActionsByDefault: true,
  defaultRetryBehavior: {
    maxAttempts: 5,
    initialBackoffMs: 1000,
    base: 2,
  },
});
