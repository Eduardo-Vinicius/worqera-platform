#!/bin/sh
# Xcode 27: Simulator.app saiu. O DeviceHub abre o simulador já criado.
set -e
UDID="${1:-5FEA2D30-D62D-40F5-B2D3-EE984CFF3E8F}"
open -a DeviceHub
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b
echo "Simulador pronto: $UDID"
