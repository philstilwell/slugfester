# Certificate recovery monitor

This temporary monitor runs on GitHub's standard Ubuntu runner, not Phil's Mac.
It runs at minute 37 every three hours (UTC), plus optional manual runs from
Actions → Slugfester certificate monitor → Run workflow. GitHub can delay
scheduled jobs; this is not an exact-time availability guarantee. Public
repository schedules can also be disabled after 60 days without activity.

## What it checks

- Strict certificate, hostname, expiry and HTTPS checks for both Slugfester names.
- The expected website content and safe HTTPS-only redirects.
- GitHub Pages certificate status and new human replies on Community report 211588.
- On apparent recovery, a second fresh public check and strict certificate checks
  for both names on all four GitHub Pages IPv4 origin addresses. A working
  Cloudflare edge certificate alone is not enough.
- After migration to Cloudflare Pages hosting, both public names must instead
  return the same valid Pages-only deployment marker, in addition to passing the
  repeated website and certificate checks. An unused GitHub origin certificate
  no longer determines recovery. The GitHub Pages status API is then skipped.

No certificate verification is disabled. The monitor never changes DNS, website
content, Pages settings, or the public support discussion.

## Notifications and state

One repository issue, assigned to philstilwell, records the initial state.
Later runs comment only when HTTPS, Pages, monitoring-access status changes, or
another human replies on the Community report. It does not use AI to judge the
reply's advice. Own replies and bots are ignored. Delivery by email or other
channels depends on the user's GitHub notification settings.

An unchanged expired certificate is an expected successful check, not a red
workflow failure. A broken monitor (such as missing API access) is a failure
requiring attention. Each run also has a summary in Actions.

After confirmed recovery the workflow disables itself and closes the tracking
issue. If stopping the schedule fails, the run fails visibly instead of silently
claiming it stopped. The workflow can also be disabled manually in Actions.

The state is stored in a machine-readable comment in the issue body; leave that
comment intact. No commits, artifacts, caches, packages, permanent credentials,
or third-party Actions are needed. The short-lived GITHUB_TOKEN has contents,
Pages and discussion read access, plus issue write access for reporting and
Actions write access solely to disable this workflow. It has no contents-write
permission. Downloaded scripts are tied to the workflow's exact commit.

## Tests

Run `python3 -m unittest discover -s tests -p test_certificate_monitor.py -v`.
The dedicated workflow also runs these dependency-free tests on relevant pull
requests, with read-only permissions. A manual run with `dry_run` selected tests
real cloud network and API access without writing an issue or disabling anything.

Standard GitHub-hosted runners are free in this public repository. No artifacts
or caches are uploaded by this monitor.
