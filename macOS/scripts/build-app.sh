#!/bin/zsh
set -euo pipefail
orbitly_root="$(cd "$(dirname "$0")/.." && pwd)"
project_root="$(cd "$orbitly_root/.." && pwd)"
env_file="$project_root/.env.local"

if [[ ! -f "$env_file" ]]; then
  echo "Missing $env_file. Add the Supabase URL and Publishable key before building Orbitly." >&2
  exit 1
fi

# env_value: .env.local에서 지정한 한 개의 값을 읽습니다. 출력하지 않아 키가 터미널 기록에 남지 않습니다.
env_value() {
  local name="$1"
  local value
  value="$(sed -n "s/^${name}=//p" "$env_file" | tail -n 1)"
  value="${value#\"}"
  value="${value%\"}"
  value="${value#\'}"
  value="${value%\'}"
  print -r -- "$value"
}

supabase_url="$(env_value NEXT_PUBLIC_SUPABASE_URL)"
supabase_key="$(env_value NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)"
if [[ -z "$supabase_url" || -z "$supabase_key" ]]; then
  echo "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required in $env_file." >&2
  exit 1
fi

swift build --package-path "$orbitly_root" -c release
orbitly_app="$orbitly_root/dist.noindex/Orbitly.app"
mkdir -p "$orbitly_app/Contents/MacOS"
cp "$orbitly_root/.build/release/Orbitly" "$orbitly_app/Contents/MacOS/Orbitly"
cp "$orbitly_root/Info.plist" "$orbitly_app/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :OrbitlySupabaseURL $supabase_url" "$orbitly_app/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :OrbitlySupabasePublishableKey $supabase_key" "$orbitly_app/Contents/Info.plist"
mkdir -p "$orbitly_app/Contents/Resources"
cp "$orbitly_root/Resources/Orbitly.icns" "$orbitly_app/Contents/Resources/Orbitly.icns"
codesign --force --sign - "$orbitly_app"
echo "Built $orbitly_app"
