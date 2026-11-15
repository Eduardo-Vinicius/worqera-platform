#!/bin/bash
# render.sh <post-name> <n>
cd "$(dirname "$0")"; mkdir -p png
W=$(( $2 * 1080 ))
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=$W,1350 --virtual-time-budget=6000 --screenshot="png/$1.png" "file://$PWD/html/$1.html" >/dev/null 2>&1
