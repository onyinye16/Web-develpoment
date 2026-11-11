#!/data/data/com.termux/files/usr/bin/sh
# Starts Parle privately on this phone (Termux). Nothing is put online:
# the app is served only to this phone at http://localhost:8080
cd "$(dirname "$0")" || exit 1
command -v python >/dev/null 2>&1 || pkg install -y python
command -v termux-wake-lock >/dev/null 2>&1 && termux-wake-lock
echo ""
echo "  Parle is running. Open Chrome and go to:"
echo ""
echo "      http://localhost:8080"
echo ""
echo "  Keep this window open while you load the app. Press Ctrl+C to stop."
echo ""
exec python -m http.server 8080 --bind 127.0.0.1
