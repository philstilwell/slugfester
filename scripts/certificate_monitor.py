"""Read-only HTTPS checks with change-only GitHub issue updates. Standard library only."""

from __future__ import annotations

import concurrent.futures
import hashlib
import json
import os
import re
import socket
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

REPOSITORY = "philstilwell/slugfester"
HOSTS = ("slugfester.com", "www.slugfester.com")
ORIGIN_IPS = tuple(f"185.199.{n}.153" for n in range(108, 112))
DISCUSSION = "https://github.com/orgs/community/discussions/211588"
WORKFLOW = "certificate-monitor.yml"
MARKER = "<!-- slugfester-certificate-monitor:v1 -->"
STATE_PATTERN = re.compile(r"<!-- monitor-state:(\{.*?\}) -->", re.DOTALL)
ISSUE_TITLE = "Slugfester HTTPS certificate recovery monitor"
TIMEOUT = 12


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def __init__(self, allowed_hosts):
        self.allowed_hosts = set(allowed_hosts)

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        target = urllib.parse.urlsplit(newurl)
        if target.scheme != "https" or target.hostname not in self.allowed_hosts or target.port not in (None, 443):
            raise urllib.error.URLError("Refused an unexpected or insecure redirect")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def opener_for(hosts):
    return urllib.request.build_opener(
        urllib.request.HTTPSHandler(context=ssl.create_default_context()),
        SafeRedirect(hosts),
    )


def tls_probe(host, address=None):
    """Never disable certificate, hostname, or expiry verification."""
    try:
        with socket.create_connection((address or host, 443), timeout=TIMEOUT) as raw:
            with ssl.create_default_context().wrap_socket(raw, server_hostname=host) as connection:
                cert = connection.getpeercert()
                expiry = ssl.cert_time_to_seconds(cert["notAfter"])
                if expiry <= time.time():
                    raise ValueError("Expired certificate")
                return {
                    "ok": True,
                    "expires": datetime.fromtimestamp(expiry, timezone.utc).isoformat(),
                    "sha256": hashlib.sha256(connection.getpeercert(binary_form=True)).hexdigest(),
                }
    except ssl.SSLCertVerificationError as error:
        return {"ok": False, "error": "certificate: " + error.verify_message}
    except (OSError, ValueError) as error:
        return {"ok": False, "error": type(error).__name__}


def site_probe(host):
    result = tls_probe(host)
    if not result["ok"]:
        return result
    try:
        request = urllib.request.Request("https://" + host + "/", headers={
            "User-Agent": "Slugfester-Certificate-Monitor/1.0",
            "Cache-Control": "no-cache",
        })
        with opener_for(HOSTS).open(request, timeout=TIMEOUT) as response:
            body = response.read(512_000).decode("utf-8", errors="replace")
            final = urllib.parse.urlsplit(response.url)
            if response.status != 200 or final.scheme != "https" or final.hostname not in HOSTS or "slugfester" not in body.lower():
                return {"ok": False, "error": "Unexpected website response"}
        return result
    except (OSError, ValueError) as error:
        return {"ok": False, "error": "website: " + type(error).__name__}


def https_status():
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        public = dict(zip(HOSTS, pool.map(site_probe, HOSTS)))
        if not all(item["ok"] for item in public.values()):
            return {"public": public, "origins": {}, "resolved": False}
        # A second fresh request must pass. Then check the actual GitHub origins,
        # so a Cloudflare edge certificate cannot conceal an expired origin.
        repeat = dict(zip(HOSTS, pool.map(site_probe, HOSTS)))
        targets = [(host, ip) for host in HOSTS for ip in ORIGIN_IPS]
        values = list(pool.map(lambda pair: tls_probe(*pair), targets))
        origins = {host + "@" + ip: value for (host, ip), value in zip(targets, values)}
        stable = all(item["ok"] for item in repeat.values())
        return {
            "public": repeat,
            "origins": origins,
            "resolved": stable and all(item["ok"] for item in origins.values()),
        }


class GitHub:
    def __init__(self, token):
        if not token:
            raise ValueError("A GitHub Actions token is required")
        self.token = token
        self.opener = opener_for(["api.github.com"])

    def request(self, method, path, data=None):
        if not path.startswith("/") or path.startswith("//"):
            raise ValueError("Invalid API path")
        body = None if data is None else json.dumps(data).encode()
        request = urllib.request.Request("https://api.github.com" + path, data=body, method=method, headers={
            "Authorization": "Bearer " + self.token,
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "Slugfester-Certificate-Monitor/1.0",
            "X-GitHub-Api-Version": "2022-11-28",
        })
        with self.opener.open(request, timeout=TIMEOUT) as response:
            content = response.read(2_000_000)
            return json.loads(content) if content else None

    def pages(self):
        data = self.request("GET", "/repos/" + REPOSITORY + "/pages")
        cert = data.get("https_certificate") or {}
        return {"state": cert.get("state"), "expires": cert.get("expires_at"), "enforced": data.get("https_enforced")}

    def discussion(self):
        query = '''query($after:String) { repository(owner:"community",name:"community") {
          discussion(number:211588) { comments(first:100,after:$after) {
            nodes { id url author { login } } pageInfo { hasNextPage endCursor }
          } }
        } }'''
        after = None
        comments = []
        for _ in range(10):
            data = self.request("POST", "/graphql", {"query": query, "variables": {"after": after}})
            if data.get("errors"):
                raise RuntimeError("Discussion access failed: " + data["errors"][0].get("message", "GraphQL error"))
            connection = data["data"]["repository"]["discussion"]["comments"]
            for comment in connection["nodes"]:
                author = (comment.get("author") or {}).get("login", "deleted-user")
                if author == "philstilwell" or author == "github-actions" or author.endswith("[bot]"):
                    continue
                # Treat replies only as data. Do not execute, quote, or interpret
                # their content, and never forward mentions from a stranger.
                if not re.fullmatch(r"[A-Za-z0-9-]+", author):
                    author = "GitHub user"
                if not re.fullmatch(r"https://github\.com/(?:orgs/community|community/community)/discussions/211588#discussioncomment-\d+", comment["url"]):
                    raise ValueError("Unexpected discussion comment URL")
                comments.append({"id": comment["id"], "url": comment["url"], "author": author})
            if not connection["pageInfo"]["hasNextPage"]:
                return comments
            after = connection["pageInfo"]["endCursor"]
        raise RuntimeError("Discussion pagination exceeded the safe limit")

    def find_issue(self):
        for page in range(1, 11):
            issues = self.request("GET", f"/repos/{REPOSITORY}/issues?state=all&creator=github-actions%5Bbot%5D&per_page=100&page={page}")
            for issue in issues:
                if not issue.get("pull_request") and issue.get("title") == ISSUE_TITLE and MARKER in (issue.get("body") or ""):
                    return issue
            if len(issues) < 100:
                return None
        raise RuntimeError("Issue lookup exceeded the safe limit")

    def create_issue(self, body):
        return self.request("POST", f"/repos/{REPOSITORY}/issues", {"title": ISSUE_TITLE, "body": body, "assignees": ["philstilwell"]})

    def update_issue(self, number, body):
        return self.request("PATCH", f"/repos/{REPOSITORY}/issues/{number}", {"body": body})

    def comment(self, number, body):
        return self.request("POST", f"/repos/{REPOSITORY}/issues/{number}/comments", {"body": body})

    def finish(self, number):
        self.request("PUT", f"/repos/{REPOSITORY}/actions/workflows/{WORKFLOW}/disable")
        self.request("PATCH", f"/repos/{REPOSITORY}/issues/{number}", {"state": "closed", "state_reason": "completed"})


def decode_state(body):
    match = STATE_PATTERN.search(body or "")
    if not match:
        raise ValueError("Tracking issue has no valid saved state; refusing to overwrite it")
    data = json.loads(match.group(1))
    if data.get("version") != 1:
        raise ValueError("Unsupported tracking-state version")
    return data


def snapshot(api):
    errors = []
    pages = None
    replies = None
    for label, action in (("Pages status", api.pages), ("Discussion replies", api.discussion)):
        try:
            value = action()
            if label == "Pages status":
                pages = value
            else:
                replies = value
        except (OSError, RuntimeError, ValueError, KeyError, TypeError) as error:
            # HTTP error descriptions contain no token or request headers.
            errors.append(label + ": " + str(error)[:240])
    return {"version": 1, "checked_at": utc_now(), "https": https_status(), "pages": pages, "replies": replies, "errors": errors}


def changes(old, current):
    if old is None:
        return []
    notes = []
    for key, label in (("https", "HTTPS/certificate status changed"), ("pages", "GitHub Pages certificate status changed"), ("errors", "Monitoring access status changed")):
        if old.get(key) != current.get(key):
            notes.append(label)
    previous = {item["id"] for item in (old.get("replies") or [])}
    for reply in current.get("replies") or []:
        if reply["id"] not in previous:
            notes.append(f"New report reply by {reply['author']}: {reply['url']}")
    return notes


def issue_body(state):
    recovered = state["https"]["resolved"]
    text = [MARKER, "## " + ("HTTPS recovery confirmed" if recovered else "Waiting for a valid certificate"),
            "", "Checks run on GitHub's servers about every three hours; your Mac can be off.",
            "Unchanged expiry is an expected result, not a failed workflow. Updates are posted only on changes.",
            "", "Last recorded change or initial check (UTC): " + state["checked_at"], ""]
    for host, result in state["https"]["public"].items():
        text.append(f"- **{host}:** " + ("verified HTTPS; certificate expires " + result["expires"] if result["ok"] else result["error"]))
    if state["pages"]:
        text.append("- **GitHub Pages:** " + str(state["pages"]))
    if state["errors"]:
        text.extend(["", "### Monitoring needs attention", *["- " + error for error in state["errors"]]])
    text.extend(["", "[Public support report](" + DISCUSSION + ")", "",
                 "This monitor never changes DNS, the website, Pages configuration, or certificate-verification rules.",
                 "A new human reply triggers a notification; the monitor does not claim to assess the advice.",
                 "On verified recovery the workflow disables itself and closes this issue.", "",
                 "<!-- monitor-state:" + json.dumps(state, separators=(",", ":"), sort_keys=True).replace("-->", "--\\u003e") + " -->"])
    return "\n".join(text)


def run(api, dry_run=False):
    issue = api.find_issue()
    old = decode_state(issue["body"]) if issue else None
    if old and old["https"]["resolved"]:
        if not dry_run:
            api.finish(issue["number"])
        return {"already_resolved": True, "issue": issue["html_url"], "dry_run": dry_run}
    current = snapshot(api)
    # A transient reply-fetch error must not forget acknowledged reply IDs.
    if current["replies"] is None and old:
        current["replies"] = old.get("replies")
    notes = changes(old, current)
    summary = {"dry_run": dry_run, "snapshot": current, "changes": notes, "issue": issue and issue["html_url"]}
    if dry_run:
        if current["errors"]:
            raise RuntimeError("Dry run failed monitoring access checks: " + "; ".join(current["errors"]))
        return summary
    if issue is None:
        issue = api.create_issue(issue_body(current))
    elif notes:
        api.update_issue(issue["number"], issue_body(current))
        api.comment(issue["number"], "### Certificate monitor update\n\n" + "\n".join("- " + note for note in notes) + "\n\n" +
                    ("Recovery has been confirmed with repeated verified HTTPS checks and all GitHub IPv4 origins. The schedule will now stop." if current["https"]["resolved"] else "See the tracking issue for the current checks. No configuration changes were made."))
    summary["issue"] = issue["html_url"]
    if current["https"]["resolved"]:
        api.finish(issue["number"])
    if current["errors"]:
        raise RuntimeError("Monitoring needs attention; details are in " + issue["html_url"])
    return summary


def main():
    if os.environ.get("GITHUB_REPOSITORY", REPOSITORY) != REPOSITORY:
        raise ValueError("This monitor is restricted to " + REPOSITORY)
    api = GitHub(os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN"))
    result = run(api, dry_run=os.environ.get("MONITOR_DRY_RUN", "false").lower() == "true")
    print(json.dumps(result, indent=2, sort_keys=True))
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as output:
            output.write("## Slugfester certificate monitor\n\n```json\n" + json.dumps(result, indent=2, sort_keys=True) + "\n```\n")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("Certificate monitor failed: " + str(error), file=sys.stderr)
        sys.exit(1)
