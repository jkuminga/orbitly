#!/bin/zsh
set -euo pipefail
orbitly_root="$(cd "$(dirname "$0")/.." && pwd)"
swift build --package-path "$orbitly_root" -c release
orbitly_app="$orbitly_root/dist/Orbitly.app"
mkdir -p "$orbitly_app/Contents/MacOS"
cp "$orbitly_root/.build/release/Orbitly" "$orbitly_app/Contents/MacOS/Orbitly"
cp "$orbitly_root/Info.plist" "$orbitly_app/Contents/Info.plist"
mkdir -p "$orbitly_app/Contents/Resources"
cp "$orbitly_root/Resources/Orbitly.icns" "$orbitly_app/Contents/Resources/Orbitly.icns"
codesign --force --sign - "$orbitly_app"
echo "Built $orbitly_app"
