# Multi-terminal Claude Code — when and how

Companion to `ONBOARDING-CLAUDE.md`. That doc covers the default flow: **one Cursor
window, one orchestrator, sub-agents from `.claude/agents/`**. Read it first.

This doc covers the cases where you want more than one terminal/Claude session running
at once — and, more importantly, when you should NOT.

---

## Decision tree (read this before adding terminals)

The first question is always: *can I do this with sub-agents in my current
orchestrator session?* If yes, do that. Sub-agents are cheaper, share the working
tree, and the orchestrator merges their diffs for you. Multi-terminal exists for the
cases where sub-agents are the wrong shape:

The first case is **mechanical background work** — a dev server, a test watcher, a
build-check. These aren't conversations with Claude; they're long-running processes
you watch out of the corner of your eye. Plain shell terminals, no Claude.

The second case is **truly parallel feature work on different branches**. Two
in-flight features that touch overlapping files would conflict if they shared a
working tree. Use **git worktrees** so each branch lives in its own folder; one Cursor
window per worktree.

The third case is **switching between projects**. Yappaflow + Liman + Yappaflow
Console are three separate repos. One Cursor window per repo. They never share state
so they never conflict.

The fourth case is **a long research dispatch** running while you keep coding. Spin
up a second Claude Code session in a terminal, give it the research task, let it run
for 5–10 minutes, come back to read the report. Don't let it edit code — keep it on
read-only tools.

If none of these apply, you don't need a second terminal. Use sub-agents.

---

## The four patterns

### Pattern A — Cursor + watcher terminals (default for active dev)

This is the everyday loop. Three windows total, two of them dumb.

```
Window 1 (Cursor):        Cursor with the Claude Code extension. Orchestrator lives
                          here. You prompt; it spawns sub-agents.
Terminal 2 (background):  npm run dev   # web + server hot-reload
Terminal 3 (background):  npm test --workspace=server -- --watch   (only when
                          working on server-agent tasks)
```

No second Claude session. The two extra terminals just give you live signal.
**Use this for 95% of work.**

### Pattern B — Cursor + parallel project (different repo)

Working on Yappaflow but Liman needs a quick check-in.

```
Window 1 (Cursor):  ~/Projects/Yappaflow    — main work
Window 2 (Cursor):  ~/Projects/Liman        — separate Claude session, separate repo
```

Each window has its own Claude Code session reading its own `CLAUDE.md` + `.claude/`.
They never share state because they're different filesystems.

Hazard: don't lose track of *which window you're in*. The Liman work might look like
Yappaflow work at a glance — naming overlaps. Look at the window title before
prompting.

### Pattern C — Two Cursor windows, same repo, different worktrees

You want to ship Phase 8.5 on `main` while exploring Phase 9 (LLM content pass) on a
side branch — and you want both to be live, not stashed.

```bash
# in your terminal, from the main checkout:
git worktree add ../yappaflow-phase9 feature/phase-9-content-llm
```

This creates a *second* working directory at `~/Projects/yappaflow-phase9` checked
out to a different branch. Both folders share the same `.git` database, so commits
on one are immediately visible to the other.

```
Window 1 (Cursor):  ~/Projects/Yappaflow             — branch: main          (Phase 8.5)
Window 2 (Cursor):  ~/Projects/yappaflow-phase9      — branch: phase-9       (Phase 9 spike)
```

Each window has its own Claude session with its own orchestrator. They edit
different folders so they never overwrite each other. When the spike is ready, merge
or rebase the side branch into main.

When you're done: `git worktree remove ../yappaflow-phase9`.

**This is the safest way to truly parallelize coding work on the same repo.** Use it
when the alternative would have been "stash, switch, code, stash, switch back".

### Pattern D — Cursor + read-only research session

You're mid-implementation and want a deep code audit done in the background — "find
every place we duplicate the `IProduct` shape across the monorepo, with line
numbers". That's a long Explore-agent task.

Open a terminal, `claude` (or run `claude --dangerously-skip-permissions` *only* if
you're sure the task can't write — better: don't grant write tools), give it the
research task, let it run. When you next come up for air, read its report.

Don't use this for code edits in parallel with active work. Two Claude sessions
editing the same files on the same branch is the fastest way to make a merge mess.

---

## Hazards

The first is **two Claude sessions on the same branch, same files**. Avoid. They will
re-edit each other's diffs without realizing the file changed under them. Symptom:
"why is this import gone again?" Use Pattern C (worktrees) or sub-agents instead.

The second is **forgetting to re-pull after a worktree merge**. If Window 1 commits
on `main` and Window 2 is on a feature branch, Window 2 won't see the new `main`
until you `git pull` (or `git rebase main`) inside its checkout. Stale `apps/builder`
state in one window can produce phantom build errors that don't reproduce in the
other.

The third is **node_modules drift across worktrees**. Each worktree has its own
`node_modules/` (turbo + npm don't share across worktrees automatically). If you add
a dep on Window 1, you need to `npm install` on Window 2 before it picks up. Symptom:
mysterious "Cannot find module" only in one window.

The fourth is **dev-server port collisions**. `web/` runs on `:3000`, `server/` on
`:4000`, `apps/builder/` on `:3040`. If two worktrees both try `npm run dev`, the
second will fail or steal the port. Either run dev only in one worktree, or override
ports in the second's `.env.local`.

---

## Concrete mapping for the bridge work (Phase 8.5–8.9)

The bridge plan is *sequential by design* — Phase 8.5 server work unblocks 8.6
builder loading which unblocks 8.7 web entry points. So multi-terminal **doesn't
buy speed on the critical path**. It does help in two specific places:

The first is during 8.5 itself: open a second terminal running
`npm test --workspace=server -- --watch` so the new Vitest cases hot-reload while
`server-agent` writes code. Same window for prompting, second terminal just for
signal.

The second is *after* 8.5 ships and before 8.6 starts: spin up a worktree on a Phase
9 (content-LLM) branch and let a second Cursor session start scoping it. By the time
8.6/8.7 are merged, you've already de-risked Phase 9 in parallel without disturbing
the main branch.

For the day-by-day work itself (Day 1 server foundation, Day 3 builder loading, Day
5 web entry points), you don't need two Claude sessions. One orchestrator + the
right sub-agent + a watcher terminal is the right shape.

---

## Quick reference

```bash
# Worktree for parallel feature work
git worktree add ../yappaflow-feat-x feature/x
cd ../yappaflow-feat-x && npm install
# open second Cursor window on this folder

# Remove the worktree when done
git worktree remove ../yappaflow-feat-x

# List active worktrees
git worktree list

# Watcher terminals (no Claude needed)
npm run dev                                    # web + server
npm test --workspace=server -- --watch         # backend tests
npm run build:ui --watch                       # yappaflow-ui RSC build
```

---

## TL;DR

One Cursor + sub-agents covers most days. Add watcher terminals for live test/dev
signal. Add a second Cursor window only when you're crossing repo boundaries or
running a parallel git branch via worktrees. Two Claude sessions writing to the same
files on the same branch is the failure mode to avoid — sub-agents exist precisely
to prevent it.
