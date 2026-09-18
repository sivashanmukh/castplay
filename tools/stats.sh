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
stars=0; forks=0; views=0; uniques=0; clones=0; referrers=""
if command -v gh >/dev/null 2>&1; then
  read -r stars forks < <(gh api "repos/$REPO" --jq '[.stargazers_count, .forks_count] | @tsv' 2>/dev/null || echo "0	0")
  views=$(gh api "repos/$REPO/traffic/views" --jq '.count' 2>/dev/null | num)
  uniques=$(gh api "repos/$REPO/traffic/views" --jq '.uniques' 2>/dev/null | num)
  clones=$(gh api "repos/$REPO/traffic/clones" --jq '.count' 2>/dev/null | num)
  referrers=$(gh api "repos/$REPO/traffic/popular/referrers" \
    --jq '[.[] | "\(.referrer):\(.count)"] | join(" ")' 2>/dev/null || true)
fi

mkdir -p "$(dirname "$OUT")"
[ -s "$OUT" ] || echo "date,npm_week,npm_month,cdn_hits_month,stars,forks,views_14d,unique_visitors_14d,clones_14d,referrers" > "$OUT"
row="$(date -u +%Y-%m-%d),$npm_week,$npm_month,$cdn,$stars,$forks,$views,$uniques,$clones,\"$referrers\""
echo "$row" >> "$OUT"
echo "$row"
