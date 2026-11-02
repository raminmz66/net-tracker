# Net Tracker

A tiny GNOME Shell extension that shows, in the top bar, whether your VPN really gets traffic through.

![Net Tracker in the GNOME top bar](docs/screenshot.png)

VPN apps can show "connected" while nothing gets through. Net Tracker pings `bbc.com` every 5 seconds and falls back to `youtube.com`. Both are blocked on some networks without a VPN, so a reply means the tunnel really works.

| Dot | Meaning |
|-----|---------|
| 🟢 `142 ms` | under 200 ms, no loss |
| 🟡 `231 ms` | 200–250 ms |
| 🟠 `410 ms · 20% lost` | slower than 250 ms, or packets lost |
| 🔴 `NO NET` | 3 checks in a row failed |

You get a notification when the network dies, when it stays slow for a minute, and when it's back to normal.

A check is one ping every 5 seconds, so it uses almost no CPU or bandwidth. Replies from private IPs count as failures, because some blocking networks answer with a fake local address.

## Install

Requires GNOME Shell 42 (Ubuntu 22.04).

```sh
git clone https://github.com/raminmz66/net-tracker.git
cd net-tracker
./install.sh
```

Restart GNOME Shell once. On X11, press Alt+F2, type `r`, then press Enter. On Wayland, log out and back in. After that it starts on every login.

To remove it:

```sh
./install.sh uninstall
```

## Test

```sh
gjs test.js
```

## License

MIT
