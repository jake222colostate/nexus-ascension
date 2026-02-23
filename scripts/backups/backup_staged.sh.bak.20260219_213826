#!/usr/bin/env bash
set -euo pipefail

ts="$(date +%Y%m%d_%H%M%S)"

git diff --cached --name-only --diff-filter=ACMR | while IFS= read -r f; do
  [ -f "$f" ] || continue

  dir="$(dirname "$f")"
  base="$(basename "$f")"
  stem="${base%.*}"
  ext="${base##*.}"
  [ "$ext" = "$base" ] && ext=""

  bdir="$dir/backups"
  mkdir -p "$bdir"

  if [ -n "$ext" ]; then
    out="$bdir/${stem}.bak.${ts}.${ext}"
  else
    out="$bdir/${stem}.bak.${ts}"
  fi

  cp -f "$f" "$out"
done
