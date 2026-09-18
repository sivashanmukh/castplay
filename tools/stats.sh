#!/usr/bin/env bash
# Where castplay is being found and used. Appends one row to stats/history.csv
# and prints it. GitHub traffic is only kept for 14 days upstream, which is the
# reason this runs on a schedule instead of being read on demand.
#
#   ./tools/stats.sh            # needs gh (authenticated) for the GitHub numbers
set -euo pipefail

REPO=${REPO:-sivashanmukh/castplay}
PKG=${PKG:-castplay}
OUT=${OUT:-stats/history.csv}

num() { local v; v=$(cat); [[ $v =~ ^-?[0-9]+$ ]] && echo "$v" || echo 0; }
jq_get() { jq -r "$1 // 0" 2>/dev/null | num; }

# npm: installs. Absent until the package is published.
npm_week=$({ curl -sf "https://api.npmjs.org/downloads/point/last-week/$PKG" || true; } | jq_get '.downloads')
npm_month=$({ curl -sf "https://api.npmjs.org/downloads/point/last-month/$PKG" || true; } | jq_get '.downloads')

# jsDelivr: CDN hits, i.e. pages actually loading the file, which npm counts miss.
cdn=$({ curl -sf "https://data.jsdelivr.com/v1/stats/packages/npm/$PKG?period=month" || true; } | jq_get '.hits.total')

# GitHub: interest, and where it came from.
# Traffic needs a token with repo administration:read — the Actions GITHUB_TOKEN
# does NOT have it and 403s, so in CI these stay blank unless STATS_TOKEN is set.
# Blank means "not collected"; 0 would claim nobody visited.
stars=0; forks=0; views=""; uniques=""; clones=""; referrers=""
gh_get() { gh api "$1" --jq "$2" 2>/dev/null || true; }
if command -v gh >/dev/null 2>&1; then
  read -r stars forks < <(gh_get "repos/$REPO" '[.stargazers_count, .forks_count] | @tsv')
  stars=$(echo "${stars:-0}" | num); forks=$(echo "${forks:-0}" | num)
  views=$(gh_get "repos/$REPO/traffic/views" '.count')
  uniques=$(gh_get "repos/$REPO/traffic/views" '.uniques')
  clones=$(gh_get "repos/$REPO/traffic/clones" '.count')
  referrers=$(gh_get "repos/$REPO/traffic/popular/referrers" '[.[] | "\(.referrer):\(.count)"] | join(" ")')
  [ -n "$views" ] || echo "note: traffic not readable with this token (needs administration:read); leaving those columns blank" >&2
fi

mkdir -p "$(dirname "$OUT")"
[ -s "$OUT" ] || echo "date,npm_week,npm_month,cdn_hits_month,stars,forks,views_14d,unique_visitors_14d,clones_14d,referrers" > "$OUT"
row="$(date -u +%Y-%m-%d),$npm_week,$npm_month,$cdn,$stars,$forks,$views,$uniques,$clones,\"$referrers\""
echo "$row" >> "$OUT"
echo "$row"
