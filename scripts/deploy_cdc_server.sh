#!/usr/bin/env bash
set -euo pipefail

cat >&2 <<'NOTICE'
This legacy CDC provisioning script is disabled.

It previously dropped the configured Frappe site without a backup, ignored
installation and migration errors, and printed fixed administrator credentials.
It is unsafe to run against a production system.

Use the documented non-destructive deployment process. CDC-specific provisioning
must be implemented as a reviewed, repeatable migration before it is re-enabled.
NOTICE

exit 2
