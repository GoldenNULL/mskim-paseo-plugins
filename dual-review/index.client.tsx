import type { PluginClientContext } from "@getpaseo/plugin/client";
import { TargetPicker } from "./client/picker";
import { ReviewRowView } from "./client/row";
import { reviewRowSchema, startDualReview } from "./shared/review";

export default function contribute(client: PluginClientContext) {
  client.addTimelineRenderer({ kind: "dual-review", version: 1, schema: reviewRowSchema, Component: ReviewRowView });
  client.addAgentPanel({ id: "pick-target", title: "Dual review", icon: "GitCompare", Component: TargetPicker });
  client.addSlashCommand({
    name: "dual-review",
    description: "Run claude total-review and codex code-review, then merge both reports verbatim",
    argumentHint: "[diff file | branch | PR]",
    context: "agent",
    async onSubmit({ args, agent, rpc, openPanel }) {
      if (!args) return openPanel("pick-target");
      await rpc(startDualReview, { agentId: agent.id, workspaceId: agent.workspaceId, cwd: agent.cwd, target: args });
    },
  });
  return () => {};
}
