imports.searchPath.unshift('.');
const S = imports.state;
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`); };

// parsing + private IPs
const ok = ip => `64 bytes from ${ip}: icmp_seq=1 ttl=57 time=12.6 ms`;
eq(S.parsePing(ok('151.101.0.81')), 13, 'parse');
for (const ip of ['10.1.1.1', '172.16.0.1', '172.31.9.9', '192.168.1.1', '127.0.0.1', '169.254.1.1', '0.0.0.0'])
    eq(S.parsePing(ok(ip)), null, 'private ' + ip);
eq(S.parsePing(ok('172.32.0.1')), 13, '172.32 public');
eq(S.parsePing(''), null, 'empty');
eq(S.parsePing('100% packet loss'), null, 'loss');

// colors
eq(S.status([]), { color: 'grey', label: '…' }, 'grey');
eq(S.status([50, 60]), { color: 'green', label: '60 ms' }, 'green');
eq(S.status([210, 220]), { color: 'yellow', label: '220 ms' }, 'yellow');
eq(S.status([300, 300]), { color: 'orange', label: '300 ms' }, 'orange slow');
eq(S.status([50, null, 60]), { color: 'orange', label: '60 ms · 33% lost' }, 'orange loss');
eq(S.status([50, 60, null, null]), { color: 'orange', label: '60 ms · 50% lost' }, 'latest fail');
eq(S.status([50, null, null, null]), { color: 'red', label: 'NO NET' }, 'red');
eq(S.status([null, null]), { color: 'orange', label: '— · 100% lost' }, 'two fails at start: not red, no NaN');

// notifications
const run = (seq) => { let t, out = []; for (const [c, now] of seq) { const r = S.step(t, { color: c, label: 'L' }, now * 1000); t = r.track; out.push(r.note && r.note.title); } return out; };
eq(run([['green', 0], ['red', 5], ['red', 10], ['red', 15], ['green', 20], ['green', 25]]),
    [null, 'Network dead', null, null, 'Back to normal', null], 'red episode');
eq(run([['orange', 0], ['orange', 30], ['orange', 60], ['orange', 65], ['yellow', 70], ['green', 75]]),
    [null, null, 'Network slow', null, 'Back to normal', null], 'slow episode');
eq(run([['orange', 0], ['orange', 30], ['green', 40], ['orange', 50], ['orange', 100]]),
    [null, null, null, null, null], 'short orange: nothing, timer resets');
eq(run([['grey', 0], ['green', 5]]), [null, null], 'green w/o episode');
eq(run([['red', 0], ['green', 5], ['red', 10]]), ['Network dead', 'Back to normal', 'Network dead'], 'second red fires again');
print('ok');
