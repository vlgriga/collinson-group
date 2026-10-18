#!/usr/bin/env bash
# The GitHub Project board and the repository's labels, see docs/workflow-lifecycle.md#board.
#   scripts/board.sh move <issue> <status>
#   scripts/board.sh cancel <issue>
#   scripts/board.sh labels
set -euo pipefail

# The board, declared once. The number is in `gh project list --owner <owner>`; the project,
# field and option IDs in `gh project field-list <number> --owner <owner> --format json`
# and `gh project view <number> --owner <owner> --format json`.
OWNER=vlgriga
PROJECT_NUMBER=
PROJECT_ID=
STATUS_FIELD_ID=
status_option_id() {
  case $1 in
    'Backlog') echo '' ;;
    'Selected for Development') echo '' ;;
    'In Progress') echo '' ;;
    'In Review') echo '' ;;
    'Done') echo '' ;;
    'Cancelled') echo '' ;;
    *) die "unknown status '$1'" ;;
  esac
}

LABELS_FILE="$(dirname "$0")/../.github/labels.yml"

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

move() {
  local issue=${1:-} status=${2:-} option item
  [[ $issue =~ ^[0-9]+$ && -n $status ]] || die 'usage: scripts/board.sh move <issue> <status>'
  option=$(status_option_id "$status")
  [[ -n $PROJECT_NUMBER && -n $PROJECT_ID && -n $STATUS_FIELD_ID && -n $option ]] ||
    die "the board IDs at the top of $0 are not filled in"

  item=$(gh api graphql -F owner='{owner}' -F repo='{repo}' -F issue="$issue" -f query='
    query($owner: String!, $repo: String!, $issue: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $issue) { projectItems(first: 20) { nodes { id project { id } } } }
      }
    }' --jq ".data.repository.issue.projectItems.nodes[] | select(.project.id == \"$PROJECT_ID\") | .id")
  if [[ -z $item ]]; then
    item=$(gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" \
      --url "$(gh issue view "$issue" --json url --jq .url)" --format json --jq .id)
  fi
  gh project item-edit --id "$item" --project-id "$PROJECT_ID" --field-id "$STATUS_FIELD_ID" \
    --single-select-option-id "$option" >/dev/null
  printf '#%s → %s\n' "$issue" "$status"
}

cancel() {
  local issue=${1:-}
  [[ $issue =~ ^[0-9]+$ ]] || die 'usage: scripts/board.sh cancel <issue>'
  move "$issue" 'Cancelled'
  gh issue close "$issue" --reason 'not planned'
}

# labels.yml as name<TAB>color<TAB>description lines.
read_labels() {
  awk '
    function value(line) { sub(/^[^:]*: */, "", line); gsub(/^["\047]|["\047]$/, "", line); return line }
    function flush() { if (name != "") print name "\t" color "\t" description; name = color = description = "" }
    /^- name:/ { flush(); name = value($0); next }
    /^  color:/ { color = value($0); next }
    /^  description:/ { description = value($0); next }
    END { flush() }
  ' "$LABELS_FILE"
}

# Creates or updates every declared label; reports, but does not delete, the undeclared ones.
labels() {
  local name color description declared extra
  while IFS=$'\t' read -r name color description; do
    gh label create "$name" --color "$color" --description "$description" --force
  done < <(read_labels)

  declared=$(read_labels | cut -f1)
  while read -r extra; do
    if ! grep -qxF "$extra" <<<"$declared"; then
      printf 'not in labels.yml: %s (gh label delete "%s" if it should go)\n' "$extra" "$extra"
    fi
  done < <(gh label list --limit 200 --json name --jq '.[].name')
}

case ${1:-} in
  move) move "${2:-}" "${3:-}" ;;
  cancel) cancel "${2:-}" ;;
  labels) labels ;;
  *) die 'usage: scripts/board.sh move <issue> <status> | cancel <issue> | labels' ;;
esac
