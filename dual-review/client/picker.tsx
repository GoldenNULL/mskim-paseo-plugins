import { type PluginAgentPanelProps, useAgent, useRpc } from "@getpaseo/plugin/client";
import { ScrollView, TextInput } from "@getpaseo/plugin/client/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { listTargets, startDualReview } from "../shared/review";

export function TargetPicker({ params, theme, layout }: PluginAgentPanelProps) {
  const agent = useAgent(params.agentId, (a) => ({ cwd: a.cwd, workspaceId: a.workspaceId }));
  const fetchTargets = useRpc(listTargets);
  const start = useRpc(startDualReview);
  const [text, setText] = useState("");
  const targets = useQuery({
    queryKey: ["dual-review-targets", agent?.cwd],
    queryFn: () => fetchTargets({ cwd: agent!.cwd }),
    enabled: !!agent,
  });
  const run = useMutation({
    mutationFn: (target: string) =>
      start({ agentId: params.agentId, workspaceId: agent!.workspaceId, cwd: agent!.cwd, target }),
  });

  const fg = { color: theme.colors.foreground };
  const muted = { color: theme.colors.foregroundMuted };
  const option = (label: string, target: string) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={`Review ${label}`}
      disabled={run.isPending}
      onPress={() => run.mutate(target)}
      style={{ padding: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border }}
    >
      <Text style={fg}>{label}</Text>
    </Pressable>
  );

  const data = targets.data;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.surface0 }}
      contentContainerStyle={{ padding: layout.compact ? 16 : 24, gap: 8 }}
    >
      <Text style={[fg, { fontSize: 18, fontWeight: "600" }]}>Choose what to review</Text>
      {!agent || targets.isLoading ? <Text style={muted}>Loading…</Text> : null}
      {targets.error ? <Text style={muted}>{String(targets.error)}</Text> : null}
      {data?.isGit ? option("Uncommitted changes (git diff HEAD)", "") : null}
      {data?.branches.length ? <Text style={muted}>Branches</Text> : null}
      {data?.branches.map((b) => option(b, b))}
      {data?.diffFiles.length ? <Text style={muted}>Diff files</Text> : null}
      {data?.diffFiles.map((f) => option(f, f))}
      <Text style={muted}>Or type a diff file path, branch, A..B range, or PR number</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => text.trim() && run.mutate(text.trim())}
        placeholder="e.g. C:\work\change.diff or 42"
        placeholderTextColor={theme.colors.foregroundMuted}
        accessibilityLabel="Review target"
        style={[fg, { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border }]}
      />
      {option("Start review", text.trim())}
      {run.isPending ? <Text style={muted}>Starting…</Text> : null}
      {run.error ? <Text style={muted}>{String(run.error)}</Text> : null}
      {run.data ? <Text style={muted}>Started. Results: {run.data.runDir}</Text> : null}
    </ScrollView>
  );
}
