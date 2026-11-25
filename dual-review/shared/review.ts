import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const startDualReview = defineRpc({
  name: "dual-review.start",
  input: z.object({ agentId: z.string(), workspaceId: z.string(), cwd: z.string(), target: z.string() }),
  output: z.object({ runDir: z.string() }),
});

export const reviewRowSchema = z.object({
  status: z.enum(["running", "done", "failed"]),
  runDir: z.string(),
  message: z.string(),
  preview: z.string(),
});
export type ReviewRow = z.infer<typeof reviewRowSchema>;

export const listTargets = defineRpc({
  name: "dual-review.targets",
  input: z.object({ cwd: z.string() }),
  output: z.object({ isGit: z.boolean(), branches: z.array(z.string()), diffFiles: z.array(z.string()) }),
});
