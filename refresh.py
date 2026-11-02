#!/usr/bin/env python3
"""Re-pull the API-derived telemetry block in data.js.

Only the region between /*__TELEMETRY_START__*/ and /*__TELEMETRY_END__*/ is
rewritten. Hand-written prose elsewhere is left alone on purpose: a figure that
quietly drifts from its surrounding claim is worse than a stale one with a date
on it.

Usage:
    export GH_TOKEN=...      # fine-grained token, public read-only is enough
    python3 refresh.py       # --check to verify without writing

Exits non-zero if the numbers in data.js disagree with the API, so this can be
run as a gate.
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request

OWNER = "saadcyber21"
API = "https://api.github.com"
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data.js")

START = "/*__TELEMETRY_START__*/"
END = "/*__TELEMETRY_END__*/"


def token() -> str:
    t = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if not t:
        sys.exit("GH_TOKEN is not set. A fine-grained token with public read-only "
                 "access is enough — do not use a classic token with write scope.")
    return t


def get(url: str, tok: str):
    req = urllib.request.Request(url, headers={
        "Authorization": f"token {tok}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "saadcyber21.github.io/refresh",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, None
    except Exception as e:  # network, DNS, timeout
        return -1, str(e)


def commit_count(repo: str, tok: str) -> int:
    """Total commits on the default branch, read from the Link header's last page."""
    req = urllib.request.Request(
        f"{API}/repos/{OWNER}/{repo}/commits?per_page=1",
        headers={"Authorization": f"token {tok}", "Accept": "application/vnd.github+json",
                 "User-Agent": "saadcyber21.github.io/refresh"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            link = r.headers.get("Link", "")
            body = json.loads(r.read().decode())
    except urllib.error.HTTPError:
        return 0
    except Exception:
        return 0
    m = re.search(r"[&?]page=(\d+)>; rel=\"last\"", link)
    if m:
        return int(m.group(1))
    return len(body) if isinstance(body, list) else 0


def main() -> int:
    check = "--check" in sys.argv
    tok = token()

    st, user = get(f"{API}/users/{OWNER}", tok)
    if st != 200:
        sys.exit(f"could not read {OWNER}: HTTP {st}")

    repos, page = [], 1
    while True:
        st, batch = get(f"{API}/users/{OWNER}/repos?per_page=100&page={page}&type=owner", tok)
        if st != 200 or not isinstance(batch, list) or not batch:
            break
        repos.extend(batch)
        if len(batch) < 100:
            break
        page += 1

    owned = [r for r in repos if not r.get("fork")]
    total_commits = sum(commit_count(r["name"], tok) for r in owned)
    pushes = sorted(r["pushed_at"][:10] for r in owned if r.get("pushed_at"))
    created = sorted(r["created_at"][:10] for r in owned if r.get("created_at"))

    block = "\n".join([
        START,
        "    /* Re-pull with: python3 refresh.py   (needs GH_TOKEN, public read-only is enough) */",
        f'    publicRepos: {user.get("public_repos", len(repos))},',
        f"    ownedRepos: {len(owned)},",
        f"    totalCommits: {total_commits},",
        f'    accountSince: "{user.get("created_at", "")[:10]}",',
        f'    activeWindow: "{created[0] if created else "?"} \u2192 {pushes[-1] if pushes else "?"}",',
        END,
    ])

    src = open(DATA, encoding="utf-8").read()
    if START not in src or END not in src:
        sys.exit(f"{DATA} is missing the telemetry markers; refusing to guess where to write.")
    new = re.sub(re.escape(START) + r".*?" + re.escape(END), lambda _: block, src, flags=re.S)

    old_block = src[src.index(START):src.index(END) + len(END)]
    if old_block == block:
        print("telemetry already current — nothing to write")
        return 0

    print("--- was ---")
    print(old_block)
    print("--- now ---")
    print(block)

    if check:
        print("\n--check: data.js is out of date", file=sys.stderr)
        return 1

    open(DATA, "w", encoding="utf-8").write(new)
    print(f"\nwrote {DATA}")
    print("remember: the build date in index.html and the header stamp are NOT "
          "updated by this script. Change them deliberately or not at all.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
