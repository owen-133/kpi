#!/bin/sh
# Install the pinned graft code-map CLI from this repo and build the code map.
#
# Usage: sh scripts/setup-graft.sh
#
# The pin lives in tools/graft/package.json + package-lock.json. The CLI is
# installed into tools/graft/node_modules of the checkout this script sits in
# (already ignored by .gitignore). A linked worktree is its own checkout, so
# run the script there once as well; nothing is read from a global graft.
# The map is written to <checkout>/graft/, and "/graft/" is added to the
# shared .git/info/exclude (one file for the main checkout and all worktrees).
#
# Exit codes:
#   0  installed, pinned version verified, map built
#   2  node or npm is missing
#   3  `npm ci --ignore-scripts` failed
#   4  installed graft version is not the pinned one
#   5  `graft build` failed
#   6  graft wrote a .gitignore or .ignore into the repo, or graft/ is not ignored
set -eu

repo_root=$(cd "$(dirname "$0")/.." && pwd)
tool_dir="$repo_root/tools/graft"
graft_bin="$tool_dir/node_modules/.bin/graft"

for required_command in node npm git; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    echo "setup-graft: '$required_command' not found on PATH" >&2
    exit 2
  fi
done

# Native install scripts are skipped on purpose: graft builds an identical map without them.
if ! (cd "$tool_dir" && npm ci --ignore-scripts); then
  echo "setup-graft: 'npm ci --ignore-scripts' failed in $tool_dir" >&2
  exit 3
fi

pinned_version=$(node -p "require('$tool_dir/package.json').dependencies['@nanonets/graft']")
installed_version=$(node -p "require('$tool_dir/node_modules/@nanonets/graft/package.json').version")
if [ "$installed_version" != "$pinned_version" ]; then
  echo "setup-graft: installed graft $installed_version, pinned $pinned_version" >&2
  exit 4
fi

# Exclude first so the map never shows up as an untracked path.
exclude_file=$(cd "$repo_root" && git rev-parse --git-path info/exclude)
case "$exclude_file" in
  /*) ;;
  *) exclude_file="$repo_root/$exclude_file" ;;
esac
mkdir -p "$(dirname "$exclude_file")"
if ! /usr/bin/grep -qxF '/graft/' "$exclude_file" 2>/dev/null; then
  echo '/graft/' >>"$exclude_file"
fi

if ! (cd "$repo_root" && DO_NOT_TRACK=1 GRAFT_NO_GITIGNORE=1 GRAFT_NO_IGNORE=1 "$graft_bin" build); then
  echo "setup-graft: 'graft build' failed" >&2
  exit 5
fi

# graft must not leave ignore files behind; graft/ must be excluded.
touched_ignore_files=$(cd "$repo_root" && git status --porcelain -- .gitignore .ignore)
if [ -n "$touched_ignore_files" ]; then
  echo "setup-graft: graft changed ignore files:" >&2
  echo "$touched_ignore_files" >&2
  exit 6
fi
if ! (cd "$repo_root" && git check-ignore -q graft/); then
  echo "setup-graft: graft/ is not ignored by git" >&2
  exit 6
fi

echo "setup-graft: graft $installed_version ready; use 'sh scripts/graft <command>'"
