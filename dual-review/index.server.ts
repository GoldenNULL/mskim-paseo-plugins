import type { PluginServerContext } from "@getpaseo/plugin/server";
import { findTargets, startReview } from "./server/review";
import { listTargets, startDualReview } from "./shared/review";

export default function contribute(server: PluginServerContext) {
  server.handle(startDualReview, startReview);
  server.handle(listTargets, findTargets);
  return () => {};
}
