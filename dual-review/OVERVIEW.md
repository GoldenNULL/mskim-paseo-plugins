Adds a `/dual-review [target]` slash command. It starts two reviewer agents in the current workspace, Claude running `/mskim:total-review` and Codex running its `code-review` skill, waits for both, and joins their final reports verbatim into one file. No model rewrites or summarizes the merged result.

The target is passed to both reviewers as is (a diff file, branch, or PR). With no target, a "Dual review" tab opens next to the agent. It lists uncommitted changes, local branches, and `*.diff`/`*.patch` files in the working directory, and has a text field for any other target. Picking uncommitted changes writes `git diff HEAD` to `target.diff` and reviews that file.

Each run writes `claude.md`, `codex.md`, and `merged.md` under `.paseo-dual-review/<timestamp>/` in the agent's working directory. A row in the calling agent's timeline shows progress, the file path, and the first 8,000 characters. The row disappears when the daemon restarts; the files stay.

The reviewers run in `bypassPermissions` (Claude) and `full-access` (Codex) modes so they never stop for a permission prompt. Providers, models, modes, and prompts are set in `server/review.ts`.
