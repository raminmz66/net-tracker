#!/bin/sh
# Usage: ./install.sh            install + enable (starts on every login)
#        ./install.sh uninstall  disable + remove
set -e
U=net-tracker@ramin
L="$HOME/.local/share/gnome-shell/extensions/$U"

# add/remove $U in GNOME's enabled-extensions list (this list is what makes it autostart)
setlist() {
    python3 - "$1" "$U" <<'EOF'
import ast, subprocess, sys
op, u = sys.argv[1], sys.argv[2]
cur = subprocess.check_output(['gsettings', 'get', 'org.gnome.shell', 'enabled-extensions'], text=True).strip()
lst = [] if cur.startswith('@as') else ast.literal_eval(cur)
lst = [x for x in lst if x != u] + ([u] if op == 'add' else [])
subprocess.check_call(['gsettings', 'set', 'org.gnome.shell', 'enabled-extensions', str(lst)])
EOF
}

if [ "$1" = uninstall ]; then
    gnome-extensions disable "$U" 2>/dev/null || true
    setlist remove
    rm -f "$L"
    echo "Uninstalled. It's gone from the top bar now."
else
    mkdir -p "$(dirname "$L")"
    ln -sfn "$(cd "$(dirname "$0")" && pwd)" "$L"
    setlist add
    echo "Installed and set to start on every login."
    echo "First time only: restart GNOME Shell so it shows up: Alt+F2, type r, Enter."
fi
