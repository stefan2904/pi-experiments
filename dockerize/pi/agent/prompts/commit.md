---
description: Commit changes made in this session, splitting into logical commits if needed
---
Review the changes you made in this session. 

Follow these steps:
1. Use `git status` and `git diff` to identify all changes.
2. If there are multiple logical sets of changes (e.g., a feature and an unrelated bug fix), split them into separate commits.
3. For each commit:
    - Stage only the relevant files or hunks.
    - Follow the Conventional Commits style: `<type>(<scope>): <summary>`.
    - Keep the summary short (<= 72 chars) and imperative.
    - Use `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, or `perf` as the type.
    - Provide a short body if more context is needed.
4. Only commit changes you actually made. Ignore other changes (e.g. if files like settings.json were modified automatically or by other processes and not by your explicit actions).
5. Do NOT push.

Additional instructions: $ARGUMENTS
