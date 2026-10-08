# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files under `.ai/features/`.

## Conventions

- One feature per directory: `.ai/features/<feature-slug>/`
- The spec is `.ai/features/<feature-slug>/spec.md`
- Implementation tickets are one file per ticket at `.ai/features/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a single combined tickets file
- Status is a `Status:` line near the top of each ticket file (`open` | `claimed` | `done`)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `.ai/features/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the ticket number directly.
