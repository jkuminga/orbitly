#!/bin/zsh
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
project_root="$(cd "$script_dir/../.." && pwd)"
build_script="$script_dir/build-app.sh"
source_app="$project_root/macOS/dist.noindex/Orbitly.app"
install_dir="$HOME/Applications"
installed_app="$install_dir/Orbitly.app"
backup_app="$install_dir/Orbitly.previous.app"
skip_pull=false
build_only=false

for argument in "$@"; do
  case "$argument" in
    --skip-pull)
      skip_pull=true
      ;;
    --build-only)
      build_only=true
      ;;
    *)
      echo "Usage: macOS/scripts/update-local.sh [--skip-pull] [--build-only]" >&2
      exit 1
      ;;
  esac
done

if ! $skip_pull; then
  echo "Fetching the latest Orbitly source…"
  git -C "$project_root" pull --ff-only
fi

echo "Building Orbitly…"
"$build_script"

if $build_only; then
  echo "Build finished. App bundle: $source_app"
  exit 0
fi

if [[ ! -d "$source_app" ]]; then
  echo "Build did not produce Orbitly.app: $source_app" >&2
  exit 1
fi

mkdir -p "$install_dir"

if [[ -d "$installed_app" ]]; then
  if [[ -d "$backup_app" ]]; then
    archived_backup="$install_dir/Orbitly.previous.$(date +%Y%m%d-%H%M%S).app"
    mv "$backup_app" "$archived_backup"
  fi

  mv "$installed_app" "$backup_app"
  echo "Previous app backed up to $backup_app"
fi

ditto "$source_app" "$installed_app"
open "$installed_app"

echo "Orbitly updated and opened: $installed_app"
