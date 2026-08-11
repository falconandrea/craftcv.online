# AI Agent Operating System

> **READ THIS FIRST**: This file tells AI how to work with this project.
> 
> 💡 **Note for Developers**: This project uses the shared AI agents/skills workflow from [agent-brains](https://github.com/falconandrea/agent-brains). 
> If you want to enable the custom slash commands (`/start`, `/feature`) and the specialized skills, clone `agent-brains` on your local system and run `./setup.sh .` inside this project directory.

## Skills

This project uses the skills.sh system for procedural best practices.
To see installed skills: `npx skills list`
To update: `npx skills update`

## Code Rules

- TypeScript strict mode, no `any` types
- No `useEffect` for data fetching — use Server Components or React Query
- Follow naming conventions from TECH_STACK.md
- All `.ai/` markdown files and code comments MUST be in English

---

## 🎯 Core Directives

## Context Routing

Load context **by area**, not "everything upfront". Read a file only if the task touches that area.

| Task area | Read / activate |
|---|---|
| General orientation | `AGENTS.md`, `.ai/context/TECH_STACK.md`, `.ai/memory/progress.md`, `.ai/memory/lessons.md` |
| Next.js API / server code | `.ai/context/TECH_STACK.md` + `next-best-practices` |
| React / Tailwind / JSX UI | `.ai/context/FRONTEND_GUIDELINES.md` (mandatory) + `frontend-design` + the one relevant UI skill |
| Hard bug / regression | `diagnosing-bugs` |
| Completion claim | `verification-before-completion` only when the user asked for verification |

`.ai/context/APP_FLOW.md`, `GLOSSARY.md`, and `database_schema.mmd` are read **only** when the requested area needs them. Do not preload them.

## Verification Policy

**Default — minimal and proportional:**

- For a behavior change, run only the smallest verification that proves it: one targeted test, the affected route, or a typecheck on the touched area.
- **Never** run the full suite, lint everything, or rebuild unless the user asks or the change clearly requires it.
- No "while I'm here" extra checks — they add cost without value.

**Manual mode** — when the user says "verifica manuale" / "manual verify" / "don't run anything":

- Do **not** run tests, lint, typecheck, build, or browser checks.
- Output the exact commands the user should run, explain what each command verifies and what success looks like, and wait for failures before touching code again.

### Session Start Protocol
1. Read `.ai/memory/progress.md` - current state
2. Read `.ai/memory/lessons.md` - past mistakes
3. Check `.ai/memory/blockers.md` - current issues
4. Check `.ai/context/TECH_STACK.md` - which stack (Next.js)
5. Ask: "Ready to continue with [current task]?"

### Operating Modes

#### 🧠 PLANNING MODE (default)
**Trigger**: Start of session, new feature request, architectural decision

**Actions**:
- Ask questions using `.ai/prompts/create_prd.md` for new features
- Propose solutions, DON'T implement
- Update `.ai/context/` files with decisions
- Get explicit "approved to implement" before switching to ACTING MODE

**Exit**: User says "Approved" or "Start implementing"

#### ⚡ ACTING MODE
**Trigger**: After planning approval, or for small changes

**Actions**:
- Write code following `.ai/context/TECH_STACK.md` versions STRICTLY
- Apply the `frontend-design` skill guidelines when creating or modifying UI components
- Update `.ai/memory/progress.md` after each completed task
- Mark tasks `[x]` in feature task files

#### 🔍 REVIEW MODE
**Trigger**: After implementation, or when user says "review"

**Actions**:
- Run the `react-doctor` skill to perform health checks and catch React issues early
- Check for violations of `.ai/memory/lessons.md`
- Verify against `.ai/context/PRD.md` acceptance criteria
- Propose improvements

#### 🐛 DEBUG MODE
**Trigger**: When user says "debug this" or reports a bug

**Actions**:
- Use `systematic-debugging` skill framework
- Check `.ai/memory/lessons.md` for similar past issues
- Document solution in `.ai/memory/lessons.md` if it's a novel fix

---

## 📚 File Reference Map

### Session Start
1. `AGENTS.md` (this file)
2. `.ai/memory/progress.md` - what's done
3. `.ai/memory/lessons.md` - what not to do
4. `.ai/context/TECH_STACK.md` - which stack

### New Feature Workflow
1. Use `.ai/prompts/create_prd.md` → Creates PRD
2. Use `.ai/prompts/generate_tasks.md` → Creates task list
3. Work through tasks, marking `[x]` on completion
4. Feature files saved in `.ai/features/[feature-name]/`

### Writing Code

- `.ai/context/FRONTEND_GUIDELINES.md` - Frontend and UI specs

---

## 🚨 Red Flags - Stop and Ask
- Feature not in PRD.md
- Library version different from TECH_STACK.md
- Making breaking changes to API
- Repeating a mistake from lessons.md
- **Next.js**: Using Pages Router when App Router is specified

---

## 🔄 Update Loop
After every task:
- Update `.ai/memory/progress.md` with what was completed
- If mistake made, update `.ai/memory/lessons.md`
- If blocked, update `.ai/memory/blockers.md`
- Mark feature task as `[x]` if applicable

---

## 💬 Quick Commands
- "Start planning" → Enter PLANNING MODE
- "Show progress" → Read progress.md
- "What's next?" → Read next uncompleted task
- "Review this" → Enter REVIEW MODE
- "Any lessons?" → Read lessons.md
- "Debug this" → Enter DEBUG MODE
- "New feature: [description]" → Use create_prd prompt

---

## 🔁 Antigravity Workflows

These slash commands are available when using the **Antigravity AI agent**. Each maps to a workflow file in `.agents/workflows/`.

| Command | Workflow File | When to Use |
|---------|--------------|-------------|
| `/start` | `workflows/start.md` | Beginning of every work session — reads all memory files and summarises the project state |
| `/setup` | `workflows/setup.md` | Starting a brand-new project — runs the full 8-phase interrogation and generates all `.ai/context/` docs |
| `/feature` | `workflows/feature.md` | Adding a new feature — creates a PRD with clarifying questions, gets approval, then generates tasks |

### When the agent should trigger each workflow automatically:
- **Session start** → remind the user to run `/start` if memory files haven't been read yet
- **New project detected** (empty `TECH_STACK.md` or `progress.md`) → suggest `/setup`
- **Feature request** ("add X", "build Y", "implement Z") → suggest `/feature` before writing any code

---

## ⚠️ Critical Rules

### Never Break These
1. **NO assumptions** - ask before acting
2. **ALWAYS** check TECH_STACK.md for versions
3. **ALWAYS** update progress.md after completing work
4. **NEVER** use deprecated patterns from lessons.md
5. **NEVER** skip error handling
7. **Next.js**: NEVER mix client/server components incorrectly
8. **ALL `.ai/` markdown files MUST be written in English** - No exceptions
9. **ALL code comments MUST be written in English** - No exceptions
