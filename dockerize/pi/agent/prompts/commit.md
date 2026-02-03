---
description: Commit changes made in this session
---
Follow /skill:commit to commit changes with these strict constraints:

- **Only** commit changes made by you (pi) during this session. Call `get_files_changed` to list files read, written, or edited by you in this session and only stage/commit these files.
- **Never** commit changes made by the user before the session started.
- Review `git diff` for the files identified by `get_files_changed` to understand your changes.
- Split changes into multiple logical commits if useful.
- Do **NOT** push.

Additional instructions: $ARGUMENTS
