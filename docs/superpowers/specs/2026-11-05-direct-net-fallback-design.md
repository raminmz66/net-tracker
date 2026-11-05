# Direct Network Fallback (Smart Mode) Design Spec

**Date:** 2026-11-05  
**Topic:** Net Tracker Smart Mode & Direct Internet Detection  
**Status:** Approved  

## 1. Intent & Problem Statement

Net Tracker is a GNOME Shell 42 indicator designed to verify that network traffic genuinely flows through a VPN tunnel. It periodically pings hosts that are censored/blocked on restricted networks without a VPN (`bbc.com`, `youtube.com`).

**Problem:** When a user legitimately turns off their VPN (for local browsing, banking, or direct internet usage), those blocked hosts fail to respond. Currently, Net Tracker treats this as a total network outage, showing `🔴 NO NET` and sending a "Network dead" notification. This is a false alarm because direct/domestic internet is operating normally.

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Eliminate false alarms:** Net Tracker must not claim `NO NET` or send outage alerts when direct internet is functioning normally.
- **Smart distinction:** Automatically distinguish between:
  1. VPN active and passing traffic (`🟢 142 ms`, `🟡 231 ms`, etc.).
  2. Direct internet active without VPN (`⚪ DIRECT` in neutral grey).
  3. Real outage where all internet connectivity is dead (`🔴 NO NET` + alert).
- **Zero manual overhead:** Fully automatic detection; no manual pause/resume required from the user when toggling VPN.

### Non-Goals
- Full VPN tunnel lifecycle management (starting/stopping WireGuard or VPN profiles).
- Replacing system network indicator.

### Anti-Goals
- Annoying notifications when switching between VPN and direct internet.
- High ping overhead or flooding domestic targets.

## 3. Approaches Considered & Tradeoffs

1. **Option A: Smart Mode — Direct Internet Fallback (Selected)**
   - *Design:* Ping VPN hosts first. If both fail, immediately check direct unblocked targets (`google.com`, fallback `aparat.com`).
   - *Tradeoff:* Adds a fallback check only when VPN hosts fail. Solves the false alarm seamlessly without requiring user intervention.
2. **Option B: Manual Pause / Mute via Popup Menu**
   - *Design:* Add a menu with "Pause checking".
   - *Tradeoff:* Predictable and simple, but requires the user to remember to pause/resume every time they turn off/on VPN.
3. **Option C: VPN Network Interface Detection (TUN / WireGuard)**
   - *Design:* Inspect `/sys/class/net` or NetworkManager for `tun*` or `wg*`.
   - *Tradeoff:* Breaks when users run proxy clients (V2Ray, Sing-box, Clash, Nekoray) in system proxy mode without creating a TUN device.

**Decision:** Option A (Smart Mode) was selected and approved.

## 4. Detailed Design & Architecture

### 4.1 Target Hosts
- **VPN Hosts:** `['bbc.com', 'youtube.com']` (proves VPN tunnel passes traffic).
- **Direct Fallback Hosts:** `['google.com', 'aparat.com']` (proves underlying direct/domestic internet is alive; `google.com` is unblocked in Iran, `aparat.com` covers domestic intranet).

### 4.2 Check Cycle in `extension.js`
In each 5-second interval:
1. Ping `VPN_HOSTS` in order using existing `_ping(hosts, cancellable)`.
2. If any VPN host responds with numeric latency `ms`:
   - Append `ms` to the sliding window: `this._win.push(ms)`.
3. If all VPN hosts fail:
   - Ping `DIRECT_HOSTS` in order.
   - If any direct host responds with latency `ms`:
     - Append `'direct'` (or `{ direct: true, ms }`) to sliding window.
   - If direct hosts also fail:
     - Append `null` to sliding window (real dropped cycle).
4. Window is kept at last 6 results (`this._win.slice(-6)`).

### 4.3 State Logic in `state.js`
- **Status function `status(w)`:**
  - If `!w.length`: `{ color: 'grey', label: '…' }`
  - If `w.length >= 3 && w.slice(-3).every(r => r === null)`: `{ color: 'red', label: 'NO NET' }` (real total outage).
  - If the latest result is direct (or window is dominated by direct without recent VPN):
    - When latest entry is direct: `{ color: 'grey', label: 'DIRECT' }`.
    - If window contains mixed direct and drops, but not 3 dead drops in a row: still `{ color: 'grey', label: 'DIRECT' }` without false `NO NET`.
  - When latest entry is numeric (VPN active):
    - Compute average latency and packet loss among VPN entries.
    - If loss > 0 or avg > 250: `{ color: 'orange', label: ... }`
    - Else avg >= 200: `{ color: 'yellow', label: ... }`
    - Else: `{ color: 'green', label: ... }`
- **Notification step `step(t, st, now)`:**
  - Transition into `st.color === 'red'` fires `Network dead: No reply from bbc.com, youtube.com, or direct internet.`
  - Transition from `t.bad === true` back to `green`, `yellow`, or `grey` (recovered to direct) fires `Back to normal`.
  - Normal transitions between VPN (green/yellow) and Direct (grey) fire **no notifications**.

## 5. Metadata and Versioning
- Update `metadata.json` version and description to reflect direct network fallback.
- Update `README.md` to document the `DIRECT` status state and fallback hosts.
