import type { PluginTimelineItemProps } from "@getpaseo/plugin/client";
import { ScrollView, Text, View } from "react-native";
import type { ReviewRow } from "../shared/review";

const LABEL = { running: "Dual review running…", done: "Dual review done", failed: "Dual review failed" };

export function ReviewRowView({ item, theme }: PluginTimelineItemProps<ReviewRow>) {
  const { status, message, preview, runDir } = item.data;
  return (
    <View style={{ padding: 12, gap: 6, borderWidth: 1, borderRadius: 8, borderColor: theme.colors.border }}>
      <Text style={{ color: theme.colors.foreground, fontWeight: "600" }}>{LABEL[status]}</Text>
      <Text selectable style={{ color: theme.colors.foregroundMuted }}>{message}</Text>
      <Text selectable style={{ color: theme.colors.foregroundMuted }}>{runDir}</Text>
      {preview ? (
        <ScrollView style={{ maxHeight: 400 }}>
          <Text selectable style={{ color: theme.colors.foreground, fontFamily: "monospace" }}>{preview}</Text>
        </ScrollView>
      ) : null}
    </View>
  );
}
