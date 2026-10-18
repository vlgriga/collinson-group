#!/usr/bin/env bash
# The issue → worktree → pull request → main flow behind the Makefile targets.
# See docs/workflow-lifecycle.md and docs/git-flow.md. Run through make, which sets
# BRANCH_TYPES and BRANCH_PATTERN.
set -euo pipefail

die() {
  printf 'error: %b\n' "$*" >&2
  exit 1
}

main_checkout() { git worktree list --porcelain | sed -n '1s/^worktree //p'; }
worktrees_dir() {
  local root
  root=$(main_checkout)
  printf '%s/%s-worktrees' "$(dirname "$root")" "$(basename "$root")"
}
board() { "$(git rev-parse --show-toplevel)/scripts/board.sh" "$@"; }
issue_of() { sed -E 's|^[a-z]+/([0-9]+)-.*|\1|' <<<"$1"; }
slugify() {
  tr '[:upper:]' '[:lower:]' <<<"$1" | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' | cut -c1-40 |
    sed -E 's/-+$//'
}

branch_check() {
  local branch=${BRANCH:-$(git branch --show-current)}
  # main carries no prefix, and a detached HEAD (mid-rebase) has no branch at all.
  if [[ -z $branch || $branch == main ]]; then return 0; fi
  [[ $branch =~ $BRANCH_PATTERN ]] ||
    die "branch '$branch' does not match <type>/<issue>-<slug> (types: $BRANCH_TYPES), see docs/git-flow.md#branches"
}

# The issue branch this command runs on; refuses main and misnamed branches.
issue_branch() {
  local branch
  branch=$(git branch --show-current)
  [[ -n $branch && $branch != main ]] || die "run this on an issue branch, not '${branch:-detached HEAD}'"
  BRANCH=$branch branch_check
  printf '%s' "$branch"
}

start() {
  local issue=${ISSUE:-} type=${TYPE:-feature} title=${TITLE:-}
  [[ $issue =~ ^[0-9]+$ ]] || die 'usage: make start ISSUE=<n> [TYPE=feature] [TITLE=...]'
  [[ " $BRANCH_TYPES " == *" $type "* ]] || die "TYPE must be one of: $BRANCH_TYPES"
  if [[ -z $title ]]; then title=$(gh issue view "$issue" --json title --jq .title); fi

  local slug branch root dir
  slug=$(slugify "$title")
  [[ -n $slug ]] || die "no slug can be made from the title '$title'; pass TITLE=..."
  branch="$type/$issue-$slug"
  BRANCH=$branch branch_check
  root=$(main_checkout)
  dir="$(worktrees_dir)/$issue-$slug"

  git -C "$root" fetch origin main
  # --no-track: the branch's upstream is its own remote branch, set by the first push, not main.
  git -C "$root" worktree add --no-track -b "$branch" "$dir" origin/main
  if [[ -f $root/.env ]]; then ln -s "$root/.env" "$dir/.env"; fi
  board move "$issue" 'In Progress'
  printf '\nWorktree ready on %s:\n  cd %s && make install\n' "$branch" "$dir"
}

pr() {
  local branch issue title body
  branch=$(issue_branch)
  issue=$(issue_of "$branch")
  title=${TITLE:-$(git log --reverse --format=%s origin/main..HEAD | head -n1)}
  [[ -n $title ]] || die "no commits on $branch beyond origin/main"
  printf '%s\n' "$title" | npx --no -- commitlint ||
    die "the PR title '$title' does not follow docs/git-flow.md#commits; pass TITLE=..."

  make --no-print-directory gate
  # The gate has just passed; the pre-push hook would only run it a second time.
  git push --no-verify --set-upstream origin HEAD

  body=$(mktemp)
  sed "s/#<issue>/#$issue/" .github/pull_request_template.md >"$body"
  gh pr create --draft --base main --title "$title" --body-file "$body"
  rm -f "$body"
  printf '\nFill in every section of the description: gh pr edit --body-file <file>, or on GitHub.\n'
}

ready() {
  local issue
  issue=$(issue_of "$(issue_branch)")
  gh pr ready
  board move "$issue" 'In Review'
}

# Refuses a pull request that is not ready to merge (docs/git-flow.md#ready-to-merge).
ensure_mergeable() {
  local pr=$1 draft mergeable checks failing unresolved
  read -r draft mergeable < <(gh pr view "$pr" --json isDraft,mergeable --jq '"\(.isDraft) \(.mergeable)"')
  [[ $draft == false ]] || die "#$pr is still a draft; make ready first"
  [[ $mergeable == MERGEABLE ]] || die "#$pr is not mergeable ($mergeable); rebase on main"

  checks=$(gh pr view "$pr" --json statusCheckRollup --jq '.statusCheckRollup | length')
  failing=$(gh pr view "$pr" --json statusCheckRollup \
    --jq '[.statusCheckRollup[] | select((.conclusion // .state) != "SUCCESS")] | length')
  [[ $checks -gt 0 && $failing -eq 0 ]] || die "#$pr: CI is not green in full ($failing of $checks checks)"

  unresolved=$(gh api graphql -F owner='{owner}' -F repo='{repo}' -F pr="$pr" -f query='
    query($owner: String!, $repo: String!, $pr: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $pr) { reviewThreads(first: 100) { nodes { isResolved } } }
      }
    }' --jq '[.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved | not)] | length')
  [[ $unresolved -eq 0 ]] || die "#$pr has $unresolved open review conversations"
}

merge() {
  local branch issue pr title decisions msg subject body
  branch=$(issue_branch)
  issue=$(issue_of "$branch")
  pr=$(gh pr view --json number --jq .number)
  ensure_mergeable "$pr"

  title=$(gh pr view "$pr" --json title --jq .title)
  subject="$title (#$pr)"
  # Every Decision: footer of the branch, with its indented continuation lines.
  decisions=$(git log --reverse --format=%B origin/main..HEAD |
    awk '/^Decision:/ { keep = 1; print; next } keep && /^[[:space:]]+[^[:space:]]/ { print; next } { keep = 0 }')

  msg=$(mktemp)
  {
    printf '%s\n\n' "$subject"
    if [[ -n ${MSG:-} ]]; then
      cat "$MSG"
    else
      printf '# The body: a summary written afresh from the whole pull request\n'
      printf '# (docs/git-flow.md#the-squash-message). Lines starting with "# " are dropped.\n'
    fi
    printf '\nRefs: #%s\n' "$issue"
    if [[ -n $decisions ]]; then printf '%s\n' "$decisions"; fi
  } >"$msg"
  if [[ -z ${MSG:-} ]]; then "${EDITOR:-vi}" "$msg"; fi
  sed -i.bak -E '/^#( |$)/d' "$msg" && rm -f "$msg.bak"
  npx --no -- commitlint <"$msg" || die "the squash message does not follow docs/git-flow.md#commits"

  body=$(tail -n +3 "$msg")
  gh pr merge "$pr" --squash --subject "$subject" --body "$body"
  rm -f "$msg"
  if git ls-remote --exit-code --heads origin "$branch" >/dev/null; then
    git push origin --delete "$branch"
  fi
  NAME=$(basename "$(git rev-parse --show-toplevel)") FORCE=1 cleanup
}

cleanup() {
  local root dir branch unpushed
  root=$(main_checkout)
  if [[ -n ${NAME:-} ]]; then dir="$(worktrees_dir)/$NAME"; else dir=$(git rev-parse --show-toplevel); fi
  [[ $dir != "$root" ]] || die 'this is the main checkout, not a worktree; pass NAME=<directory>'
  [[ -d $dir ]] || die "no worktree at $dir"
  branch=$(git -C "$dir" branch --show-current)

  if [[ ${FORCE:-} == 1 ]]; then
    git -C "$root" worktree remove --force "$dir"
  else
    [[ -z $(git -C "$dir" status --porcelain) ]] ||
      die "uncommitted changes in $dir; commit them, or FORCE=1 to throw them away"
    unpushed=$(git -C "$dir" log --oneline HEAD --not --remotes=origin)
    [[ -z $unpushed ]] || die "commits not on origin:\n$unpushed\npush them, or FORCE=1 to throw them away"
    git -C "$root" worktree remove "$dir"
  fi
  if [[ -n $branch ]]; then git -C "$root" branch -D "$branch"; fi
  printf 'Removed %s\n' "$dir"
}

case ${1:-} in
  start | pr | ready | merge | cleanup) "$1" ;;
  branch-check) branch_check ;;
  *) die 'usage: scripts/flow.sh start|pr|ready|merge|cleanup|branch-check' ;;
esac
