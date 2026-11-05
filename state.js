// Pure logic, no gi imports.
var COLORS = { green: '#3fbf5f', yellow: '#e8c33a', orange: '#ef8a2b', red: '#e5484d', grey: '#888' };

function isPrivate(ip) {
    let [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) || (a === 169 && b === 254);
}

// ping stdout -> latency in ms (rounded) or null if failed / fake local reply
function parsePing(out) {
    let m = /from (\d+\.\d+\.\d+\.\d+).*time=([\d.]+) ms/.exec(out || '');
    return m && !isPrivate(m[1]) ? Math.round(parseFloat(m[2])) : null;
}

// window: last 6 results (number | 'direct' | null). Returns {color, label}.
function status(w) {
    if (!w.length) return { color: 'grey', label: '…' };
    if (w.length >= 3 && w.slice(-3).every(r => r === null)) return { color: 'red', label: 'NO NET' };
    let last = [...w].reverse().find(r => r !== null);
    if (last === 'direct') return { color: 'grey', label: 'DIRECT' };
    let vpnWindow = w.slice(w.lastIndexOf('direct') + 1);
    let ok = vpnWindow.filter(r => r !== null);
    let avg = ok.length ? ok.reduce((s, r) => s + r, 0) / ok.length : 0;
    let loss = vpnWindow.length ? Math.round(100 * (vpnWindow.length - ok.length) / vpnWindow.length) : 0;
    let label = ok.length ? `${ok[ok.length - 1]} ms` : '—';
    if (loss > 0 || avg > 250) return { color: 'orange', label: label + (loss > 0 ? ` · ${loss}% lost` : '') };
    return { color: avg >= 200 ? 'yellow' : 'green', label };
}

// track: {color, since, slow, bad}; returns {track, note}
function step(t, st, now) {
    t = Object.assign({ color: 'grey', since: null, slow: false, bad: false }, t);
    let note = null, c = st.color;
    if (c === 'red' && t.color !== 'red') {
        note = { title: 'Network dead', body: 'No reply from bbc.com, youtube.com, or direct internet.' };
        t.bad = true;
    } else if (c === 'orange') {
        if (t.color !== 'orange') t.since = now;
        if (!t.slow && now - t.since >= 60000) {
            note = { title: 'Network slow', body: st.label };
            t.slow = t.bad = true;
        }
    } else if ((c === 'green' || c === 'yellow' || c === 'grey') && t.bad) {
        note = { title: 'Back to normal', body: st.label };
        t.slow = t.bad = false;
    }
    t.color = c;
    return { track: t, note };
}
