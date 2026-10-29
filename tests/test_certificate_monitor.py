import copy
import json
from pathlib import Path
import ssl
import sys
import unittest
from unittest.mock import MagicMock, patch
import urllib.error
import urllib.request

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import certificate_monitor as monitor


def state(resolved=False):
    result = {"ok": True, "expires": "2030-01-01T00:00:00+00:00", "sha256": "abc"} if resolved else {"ok": False, "error": "certificate: certificate has expired"}
    return {"version": 1, "checked_at": "2026-10-29T14:20:00+00:00", "https": {
        "public": {host: copy.deepcopy(result) for host in monitor.HOSTS}, "origins": {}, "resolved": resolved},
        "pages": {"state": "approved" if resolved else "bad_authz", "expires": "2030-01-01" if resolved else "2026-10-27", "enforced": False},
        "replies": [], "errors": []}


class FakeAPI:
    def __init__(self, previous=None):
        self.issue = None if previous is None else {"number": 123, "html_url": "https://github.com/philstilwell/slugfester/issues/123", "body": monitor.issue_body(previous)}
        self.writes = []

    def find_issue(self):
        return self.issue

    def create_issue(self, body):
        self.writes.append(("create", body))
        self.issue = {"number": 123, "html_url": "https://github.com/philstilwell/slugfester/issues/123", "body": body}
        return self.issue

    def update_issue(self, number, body):
        self.writes.append(("update", body))
        self.issue["body"] = body

    def comment(self, number, body):
        self.writes.append(("comment", body))

    def finish(self, number):
        self.writes.append(("finish", number))


class StateTests(unittest.TestCase):
    def test_round_trip_issue_state(self):
        current = state()
        self.assertEqual(monitor.decode_state(monitor.issue_body(current)), current)

    def test_malformed_state_is_not_overwritten(self):
        for body in ("Human issue without a marker", '<!-- monitor-state:{"version":99} -->'):
            with self.assertRaises(ValueError):
                monitor.decode_state(body)

    def test_checked_at_is_not_a_change(self):
        old, new = state(), state()
        new["checked_at"] = "2026-10-30T14:20:00+00:00"
        self.assertEqual(monitor.changes(old, new), [])

    def test_new_reply_notified_once(self):
        old, new = state(), state()
        new["replies"] = [{"id": "reply-1", "url": "https://github.com/orgs/community/discussions/211588#discussioncomment-55", "author": "helper"}]
        self.assertEqual(len(monitor.changes(old, new)), 1)
        self.assertEqual(monitor.changes(new, copy.deepcopy(new)), [])

    def test_api_state_change_is_not_https_recovery(self):
        current = state()
        current["pages"]["state"] = "approved"
        self.assertFalse(current["https"]["resolved"])


class RunTests(unittest.TestCase):
    def test_expired_certificate_is_successful_expected_run(self):
        api = FakeAPI()
        with patch.object(monitor, "snapshot", return_value=state()):
            result = monitor.run(api)
        self.assertFalse(result["snapshot"]["https"]["resolved"])
        self.assertEqual([write[0] for write in api.writes], ["create"])

    def test_unchanged_run_does_not_write_or_notify(self):
        api = FakeAPI(state())
        with patch.object(monitor, "snapshot", return_value=state()):
            monitor.run(api)
        self.assertEqual(api.writes, [])

    def test_dry_run_never_writes(self):
        api = FakeAPI()
        with patch.object(monitor, "snapshot", return_value=state(True)):
            monitor.run(api, dry_run=True)
        self.assertEqual(api.writes, [])

    def test_recovery_updates_notifies_and_stops(self):
        api = FakeAPI(state())
        with patch.object(monitor, "snapshot", return_value=state(True)):
            monitor.run(api)
        self.assertEqual([write[0] for write in api.writes], ["update", "comment", "finish"])

    def test_already_resolved_does_not_repeat_comment(self):
        api = FakeAPI(state(True))
        with patch.object(monitor, "snapshot") as check:
            monitor.run(api)
        check.assert_not_called()
        self.assertEqual(api.writes, [("finish", 123)])

    def test_monitor_access_failure_is_not_silent(self):
        current = state()
        current["errors"] = ["Discussion replies: HTTP Error 403: Forbidden"]
        api = FakeAPI()
        with patch.object(monitor, "snapshot", return_value=current), self.assertRaises(RuntimeError):
            monitor.run(api, dry_run=True)
        self.assertEqual(api.writes, [])

    def test_reply_fetch_failure_preserves_seen_ids(self):
        old = state()
        old["replies"] = [{"id": "seen", "url": "https://github.com/orgs/community/discussions/211588#discussioncomment-55", "author": "helper"}]
        api = FakeAPI(old)
        current = state()
        current["replies"] = None
        current["errors"] = ["Discussion replies: temporary error"]
        with patch.object(monitor, "snapshot", return_value=current), self.assertRaises(RuntimeError):
            monitor.run(api)
        self.assertEqual(monitor.decode_state(api.issue["body"])["replies"], old["replies"])


class VerificationTests(unittest.TestCase):
    def test_expired_certificate_never_counts_as_recovered(self):
        error = ssl.SSLCertVerificationError(1, "certificate has expired")
        error.verify_message = "certificate has expired"
        with patch.object(monitor.socket, "create_connection", side_effect=error):
            self.assertEqual(monitor.tls_probe("slugfester.com"), {"ok": False, "error": "certificate: certificate has expired"})

    def test_default_https_context_is_strict(self):
        opener = monitor.opener_for(monitor.HOSTS)
        handler = next(h for h in opener.handlers if isinstance(h, urllib.request.HTTPSHandler))
        self.assertEqual(handler._context.verify_mode, ssl.CERT_REQUIRED)
        self.assertTrue(handler._context.check_hostname)

    def test_redirect_cannot_downgrade_or_leave_site(self):
        handler = monitor.SafeRedirect(monitor.HOSTS)
        request = urllib.request.Request("https://www.slugfester.com/")
        for url in ("http://slugfester.com/", "https://attacker.example/", "https://slugfester.com:8443/"):
            with self.assertRaises(urllib.error.URLError):
                handler.redirect_request(request, None, 301, "Moved", {}, url)
        self.assertIsNotNone(handler.redirect_request(request, None, 301, "Moved", {}, "https://slugfester.com/"))

    def test_edge_only_recovery_is_not_enough(self):
        good = {"ok": True, "expires": "2030-01-01", "sha256": "new"}
        with patch.object(monitor, "site_probe", return_value=good), patch.object(monitor, "tls_probe", return_value={"ok": False, "error": "origin expired"}) as origin:
            result = monitor.https_status()
        self.assertFalse(result["resolved"])
        self.assertEqual(origin.call_count, 8)

    def test_both_names_are_checked_twice_on_recovery(self):
        good = {"ok": True, "expires": "2030-01-01", "sha256": "new"}
        with patch.object(monitor, "site_probe", return_value=good) as site, patch.object(monitor, "tls_probe", return_value=good):
            result = monitor.https_status()
        self.assertTrue(result["resolved"])
        self.assertEqual(site.call_count, 4)


class DiscussionTests(unittest.TestCase):
    def test_finish_disables_only_this_workflow_then_closes_issue(self):
        api = monitor.GitHub("test-token")
        with patch.object(api, "request") as request:
            api.finish(123)
        self.assertEqual(request.call_args_list[0].args, ("PUT", "/repos/philstilwell/slugfester/actions/workflows/certificate-monitor.yml/disable"))
        self.assertEqual(request.call_args_list[1].args, ("PATCH", "/repos/philstilwell/slugfester/issues/123", {"state": "closed", "state_reason": "completed"}))

    def response(self, authors, more=False):
        return {"data": {"repository": {"discussion": {"comments": {
            "nodes": [{"id": author, "author": {"login": author}, "url": "https://github.com/orgs/community/discussions/211588#discussioncomment-55"} for author in authors],
            "pageInfo": {"hasNextPage": more, "endCursor": "next"}}}}}}

    def test_skip_own_posts_and_bots_with_pagination(self):
        api = monitor.GitHub("test-token")
        with patch.object(api, "request", side_effect=[self.response(["philstilwell", "github-actions", "helper-bot[bot]"], True), self.response(["helper"])]) as request:
            replies = api.discussion()
        self.assertEqual([r["author"] for r in replies], ["helper"])
        self.assertEqual(request.call_args_list[1].args[2]["variables"]["after"], "next")

    def test_graphql_permission_error_is_explicit(self):
        api = monitor.GitHub("test-token")
        with patch.object(api, "request", return_value={"errors": [{"message": "Resource not accessible by integration"}]}), self.assertRaisesRegex(RuntimeError, "Discussion access failed"):
            api.discussion()

    def test_refuse_unexpected_reply_link(self):
        api = monitor.GitHub("test-token")
        response = self.response(["helper"])
        response["data"]["repository"]["discussion"]["comments"]["nodes"][0]["url"] = "https://attacker.example/"
        with patch.object(api, "request", return_value=response), self.assertRaises(ValueError):
            api.discussion()


if __name__ == "__main__":
    unittest.main()
