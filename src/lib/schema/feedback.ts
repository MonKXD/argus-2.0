import { z } from "zod";

import { idOf, Iso } from "@/lib/schema/ids";

/**
 * T-6.11 (beta feedback loop, PRD section 13). Deliberately minimal: a
 * message, where it was sent from, and who sent it — enough for the project
 * owner to read real feedback during the beta, with no in-app reader built
 * (nothing in this app reads this collection back; the owner reads it
 * directly, the same way they'd read any other operational data). Never
 * updated or deleted by the app itself once created.
 */
export const Feedback = z.object({
  id: idOf("fbk"),
  ownerId: z.string(),
  message: z.string().min(1).max(2000),
  page: z.string().max(200).optional(),
  createdAt: Iso,
});

export type Feedback = z.infer<typeof Feedback>;
