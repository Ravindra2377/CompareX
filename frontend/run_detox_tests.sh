#!/bin/bash

# run_detox_tests.sh
# This script automates the process of preparing and running Detox tests for CompareZ.

set -e

# Source NVM to get node and npx
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "🚀 Preparing Detox Tests for CompareZ..."

# 1. Export Android SDK and Java paths
export ANDROID_HOME=$HOME/Library/Android/sdk
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export NODE_OPTIONS="--experimental-vm-modules"
export PATH="/Users/chethannv/.nvm/versions/node/v22.22.0/bin:$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$JAVA_HOME/bin"

# 2. Generate native folders if missing
if [ ! -d "android" ]; then
    echo "📦 Generating native folders via Expo Prebuild..."
    npx expo prebuild --platform android
fi

# 3. Build the app for Detox (defaulting to Android emulator debug)
# Available configurations: android.emu.debug, android.emu.release
CONFIG=${1:-"android.emu.debug"}

echo "🏗️ Skipping build for quick test..."
# npx detox build --configuration $CONFIG

echo "🧪 Running Detox tests ($CONFIG)..."
npx detox test --configuration "$CONFIG" --loglevel trace --record-logs all

echo "✅ Detox tests completed!"
