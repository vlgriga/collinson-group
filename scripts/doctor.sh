#!/usr/bin/env bash
# Reports what this machine is missing for the project, and the command that fixes each item.
# Changes nothing. See docs/getting-started.md.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

failures=0
ok() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad() {
  printf '  \033[31m✗\033[0m %s\n      fix: %s\n' "$1" "$2"
  failures=$((failures + 1))
}
has() { command -v "$1" >/dev/null 2>&1; }

echo 'Tools'
want_node=$(cat .nvmrc)
if has node; then
  have_node=$(node --version | sed 's/^v//')
  if [[ $have_node == "$want_node" ]]; then
    ok "node $have_node"
  else
    bad "node $have_node, .nvmrc wants $want_node" 'nvm install && nvm use'
  fi
else
  bad 'node is not installed' 'install nvm (https://github.com/nvm-sh/nvm), then nvm install'
fi
for tool in npm git make; do
  if has "$tool"; then ok "$tool"; else bad "$tool is not installed" "install $tool"; fi
done

echo 'Docker'
if ! has docker; then
  bad 'docker is not installed' 'install Docker Desktop: https://docs.docker.com/get-docker/'
elif ! docker info >/dev/null 2>&1; then
  bad 'the Docker daemon is not running' 'start Docker Desktop'
elif ! docker compose version >/dev/null 2>&1; then
  bad 'docker compose (v2) is missing' 'update Docker Desktop'
else
  ok "docker, compose $(docker compose version --short)"
fi

echo 'GitHub CLI'
if ! has gh; then
  bad 'gh is not installed' 'brew install gh && gh auth login --scopes project'
elif ! gh auth status >/dev/null 2>&1; then
  bad 'gh is not logged in' 'gh auth login --scopes project'
elif ! gh auth status 2>&1 | grep -q "'project'"; then
  bad 'the gh token lacks the project scope' 'gh auth refresh --scopes project'
else
  ok 'gh, logged in with the project scope'
fi

echo 'Project'
if [[ -f .env ]]; then ok '.env'; else bad '.env is missing' 'cp .env.example .env'; fi
if [[ $(git config --local pull.rebase) == true ]]; then
  ok 'git pull.rebase'
else
  bad 'git pull does not rebase' 'git config --local pull.rebase true'
fi
if [[ -d node_modules && $(git config core.hooksPath) == .husky/_ ]]; then
  ok 'dependencies and git hooks'
else
  bad 'dependencies or git hooks are not installed' 'make install'
fi

if [[ $failures -gt 0 ]]; then
  printf '\n%s item(s) to fix.\n' "$failures"
  exit 1
fi
printf '\nAll good.\n'
