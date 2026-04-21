#!/bin/bash
set -e

echo "=== AIDE Build Script ==="
echo ""

# Check pnpm
if ! command -v pnpm &> /dev/null; then
  echo "Error: pnpm is not installed."
  exit 1
fi

# Detect arch
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
  APP_DIR="out/AIDE-darwin-arm64"
else
  APP_DIR="out/AIDE-darwin-x64"
fi

APP_PATH="$APP_DIR/AIDE.app"
DMG_NAME="AIDE"
DMG_PATH="out/AIDE.dmg"
DMG_TMP_PATH="out/AIDE-tmp.dmg"

# Install dependencies
echo "[1/4] Installing dependencies..."
pnpm install

# Force-run native module install scripts so node-pty's prebuild download is
# triggered even when pnpm restores from cache.
echo "      Rebuilding native modules..."
pnpm rebuild node-pty

# node-pty's loader (lib/utils.js) resolves the native binary from either
# build/Release, build/Debug, or prebuilds/<platform>-<arch>. Accept any of
# these; only fail if none exist.
PTY_BUILT="node_modules/node-pty/build/Release/pty.node"
PTY_PREBUILD_DIR="node_modules/node-pty/prebuilds/$(uname -s | tr 'A-Z' 'a-z')-$(uname -m | sed 's/x86_64/x64/;s/aarch64/arm64/')"
PTY_PREBUILD="$PTY_PREBUILD_DIR/pty.node"
if [ -f "$PTY_BUILT" ]; then
  echo "      pty.node (built) present ($(stat -f%z "$PTY_BUILT") bytes)"
elif [ -f "$PTY_PREBUILD" ]; then
  echo "      pty.node (prebuild) present at $PTY_PREBUILD ($(stat -f%z "$PTY_PREBUILD") bytes)"
else
  echo "::error::pty.node missing: neither $PTY_BUILT nor $PTY_PREBUILD exists."
  exit 1
fi

# Lint
echo "[2/4] Running lint..."
pnpm run lint

# Package app
echo "[3/4] Packaging app..."
pnpm run package

# Create DMG with drag-and-drop installer layout
echo "[4/4] Creating DMG..."
rm -f "$DMG_PATH" "$DMG_TMP_PATH"

# Staging: app + /Applications symlink
STAGING=$(mktemp -d)
cp -R "$APP_PATH" "$STAGING/"
ln -s /Applications "$STAGING/Applications"

# Create a writable DMG first (so we can set icon layout via AppleScript)
echo "  Creating writable DMG..."
hdiutil create \
  -volname "$DMG_NAME" \
  -srcfolder "$STAGING" \
  -ov \
  -format UDRW \
  "$DMG_TMP_PATH"

rm -rf "$STAGING"

# Mount the writable DMG
echo "  Mounting DMG for layout customization..."
MOUNT_DIR="/Volumes/$DMG_NAME"
# Detach any existing mount first (stale leftover from a previous failed run)
hdiutil detach "$MOUNT_DIR" -quiet 2>/dev/null || true
hdiutil attach "$DMG_TMP_PATH" -mountpoint "$MOUNT_DIR" -noautoopen -quiet

# Wait for Finder to register the volume
sleep 3

# Set icon positions and window layout via AppleScript.
# Finder automation may be blocked by macOS privacy settings on first run —
# if it fails, skip the layout step and continue with a plain DMG.
echo "  Applying icon layout (AppleScript Finder automation)..."
if ! osascript <<EOF
tell application "Finder"
  tell disk "$DMG_NAME"
    open
    set current view of container window to icon view
    set toolbar visible of container window to false
    set statusbar visible of container window to false
    set the bounds of container window to {400, 100, 900, 430}
    set viewOptions to the icon view options of container window
    set arrangement of viewOptions to not arranged
    set icon size of viewOptions to 100
    set position of item "AIDE.app" of container window to {125, 160}
    set position of item "Applications" of container window to {375, 160}
    close
    open
    update without registering applications
    delay 2
  end tell
end tell
EOF
then
  echo "  ⚠️  AppleScript layout failed (Finder automation may be blocked)."
  echo "      Grant permission: System Settings → Privacy & Security → Automation → Terminal → Finder"
  echo "      Continuing without custom layout..."
fi

# Unmount (force if necessary)
echo "  Unmounting DMG..."
hdiutil detach "$MOUNT_DIR" -quiet || hdiutil detach "$MOUNT_DIR" -force -quiet

# Convert to compressed read-only DMG
echo "  Converting to compressed DMG..."
hdiutil convert "$DMG_TMP_PATH" -format UDZO -o "$DMG_PATH"
rm -f "$DMG_TMP_PATH"

# Create .app.zip for in-place auto-update
echo "[+] Creating app.zip for auto-update..."
ZIP_PATH="out/AIDE.app.zip"
rm -f "$ZIP_PATH"
ditto -c -k --keepParent "$APP_PATH" "$ZIP_PATH"

echo ""
echo "Build complete!"
echo "Output: $DMG_PATH"
echo "        $ZIP_PATH"
