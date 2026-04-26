#!/bin/bash
set -e

echo "=== Smalti Build Script ==="
echo ""

# Check pnpm
if ! command -v pnpm &> /dev/null; then
  echo "Error: pnpm is not installed."
  exit 1
fi

# Detect arch
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
  APP_DIR="out/Smalti-darwin-arm64"
else
  APP_DIR="out/Smalti-darwin-x64"
fi

APP_PATH="$APP_DIR/Smalti.app"
DMG_NAME="Smalti"
DMG_PATH="out/Smalti.dmg"
DMG_TMP_PATH="out/Smalti-tmp.dmg"

# Install dependencies (postinstall hook builds the Rust .node via scripts/build-native.mjs)
echo "[1/4] Installing dependencies..."
pnpm install

# Build darwin-universal native module (arm64 + x64 lipo-merged).
# This replaces the single-arch .node produced by postinstall with a fat binary
# that runs on both Apple Silicon and Intel Macs.
echo "      Building darwin-universal native module..."
pnpm run build:native:universal

# Verify the universal module was produced.
NATIVE_DIR="src/main/native"
NATIVE_NODE="$NATIVE_DIR/index.darwin-universal.node"
if [ -f "$NATIVE_NODE" ]; then
  echo "      Rust native module present: $NATIVE_NODE ($(stat -f%z "$NATIVE_NODE") bytes)"
else
  echo "::error::darwin-universal .node missing in $NATIVE_DIR/ after build:native:universal."
  echo "          Requires rustup targets: aarch64-apple-darwin + x86_64-apple-darwin"
  echo "          Run: rustup target add aarch64-apple-darwin x86_64-apple-darwin"
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
    set position of item "Smalti.app" of container window to {125, 160}
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
ZIP_PATH="out/Smalti.app.zip"
rm -f "$ZIP_PATH"
ditto -c -k --keepParent "$APP_PATH" "$ZIP_PATH"

echo ""
echo "Build complete!"
echo "Output: $DMG_PATH"
echo "        $ZIP_PATH"
