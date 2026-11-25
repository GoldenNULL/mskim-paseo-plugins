import { execFile } from "node:child_process";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import type { RpcInput } from "@getpaseo/plugin";
import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import { listTargets, type ReviewRow, startDualReview } from "../shared/review";

const run = promisify(execFile);
const TIMEOUT_MS = 60 * 60 * 1000;
// row data is capped at 64 KiB; the full text lives in merged.md.
const PREVIEW_CHARS = 8000;

// Edit these to change reviewers. Modes must not ask for permission, or the run stops at "permission".
const REVIEWERS = [
  {
    name: "claude",
    config: { provider: "claude/claude-opus-5-5", modeId: "bypassPermissions" },
    prompt: (target: string) => `/mskim:total-review ${target}`,
  },
  {
    name: "codex",
    config: { provider: "codex/gpt-6.2-sol", modeId: "full-access", thinkingOptionId: "medium" },
    prompt: (target: string) =>
      `Use the code-review skill to review this change: ${target}\nReview only. Do not edit files. End with the full review report as your final message.`,
  },
] as const;

export function startReview(input: RpcInput<typeof startDualReview>, { paseo }: PluginHandlerContext) {
  const runDir = join(input.cwd, ".paseo-dual-review", new Date().toISOString().replace(/[:.]/g, "-"));
  const rowId = `dual-review-${runDir}`;
  const timeline = paseo.agents.ref(input.agentId).timeline;
  const show = (row: ReviewRow) =>
    timeline.append({ type: "plugin", id: rowId, kind: "dual-review", version: 1, data: row });

  // Return at once; the reviews can outlive any RPC timeout.
  void (async () => {
    try {
      await mkdir(runDir, { recursive: true });
      const target = input.target || (await writeDiff(input.cwd, runDir));
      await show({ status: "running", runDir, message: `Reviewing ${target}`, preview: "" });
      const workspace = paseo.workspaces.ref(input.workspaceId);
      const results = await Promise.all(
        REVIEWERS.map(async (r) => {
          const file = join(runDir, `${r.name}.md`);
          const agent = await workspace.agents.create({
            config: r.config,
            parent: input.agentId,
            title: `dual-review: ${r.name}`,
            prompt: r.prompt(target),
          });
          const result = await agent.waitForFinish(TIMEOUT_MS);
          const text =
            result.status === "idle"
              ? (result.lastMessage ?? "")
              : `(reviewer stopped: ${result.status}${result.error ? ` - ${result.error}` : ""})\n\n${result.lastMessage ?? ""}`;
          await writeFile(file, text, "utf8");
          return { name: r.name, text };
        }),
      );
      // Verbatim concatenation: headers only, no rewriting.
      const merged = results.map((r) => `# ${r.name} review\n\n${r.text}\n`).join("\n---\n\n");
      const mergedPath = join(runDir, "merged.md");
      await writeFile(mergedPath, merged, "utf8");
      await show({ status: "done", runDir, message: mergedPath, preview: merged.slice(0, PREVIEW_CHARS) });
    } catch (error) {
      console.error("dual-review failed", error);
      await show({ status: "failed", runDir, message: String(error), preview: "" }).catch(() => {});
    }
  })();
  return { runDir };
}

async function writeDiff(cwd: string, runDir: string): Promise<string> {
  // shortcut: tracked changes only (git diff HEAD), untracked files are skipped; pass a diff file path to cover them.
  const { stdout } = await run("git", ["diff", "HEAD"], { cwd, maxBuffer: 64 * 1024 * 1024 }).catch(() => {
    throw new Error("No target given and this folder is not a git repo. Run /dual-review <diff file path>.");
  });
  if (!stdout.trim()) throw new Error("git diff HEAD is empty: nothing to review.");
  const path = join(runDir, "target.diff");
  await writeFile(path, stdout, "utf8");
  return path;
}


export async function findTargets({ cwd }: RpcInput<typeof listTargets>) {
  const branches = await run("git", ["for-each-ref", "--format=%(refname:short)", "refs/heads"], { cwd })
    .then(({ stdout }) => stdout.split("\n").filter(Boolean))
    .catch(() => null);
  // shortcut: top-level *.diff/*.patch only; type a path for files elsewhere.
  const diffFiles = (await readdir(cwd).catch(() => [] as string[]))
    .filter((name) => /\.(diff|patch)$/i.test(name))
    .map((name) => join(cwd, name));
  return { isGit: branches !== null, branches: branches ?? [], diffFiles };
}
