const { Clutter, Gio, GLib, St } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const S = ExtensionUtils.getCurrentExtension().imports.state;

const UUID = 'net-tracker@ramin';
const HOSTS = ['bbc.com', 'youtube.com'];

class Extension {
    enable() {
        this._win = [];
        this._track = null;
        this._busy = false;
        this._cancel = new Gio.Cancellable();
        this._button = new PanelMenu.Button(0.0, UUID, true);
        let box = new St.BoxLayout({ style: 'spacing: 6px;' });
        this._dot = new St.Label({ text: '●', y_align: Clutter.ActorAlign.CENTER });
        this._text = new St.Label({ y_align: Clutter.ActorAlign.CENTER });
        box.add_child(this._dot);
        box.add_child(this._text);
        this._button.add_child(box);
        Main.panel.addToStatusArea(UUID, this._button, 0, 'right');
        this._render(S.status([]));
        this._check();
        this._timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 5, () => {
            this._check();
            return GLib.SOURCE_CONTINUE;
        });
    }

    disable() {
        if (this._timer) GLib.source_remove(this._timer);
        this._cancel.cancel();
        this._button.destroy();
        this._timer = this._cancel = this._button = this._dot = this._text = this._win = this._track = null;
    }

    _render(st) {
        this._dot.set_style(`color: ${S.COLORS[st.color]};`);
        this._text.set_style(`color: ${S.COLORS[st.color]};`);
        this._text.set_text(st.label);
    }

    // Try hosts in order; first latency wins, null if all fail.
    async _ping(c) {
        for (let h of HOSTS) {
            try {
                let p = new Gio.Subprocess({
                    argv: ['ping', '-4', '-n', '-c1', '-W2', h],
                    flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE,
                });
                p.init(c);
                let out = await new Promise((res, rej) =>
                    p.communicate_utf8_async(null, c, (_p, r) => {
                        try { res(p.communicate_utf8_finish(r)[1]); } catch (e) { rej(e); }
                    }));
                let ms = S.parsePing(out);
                if (ms !== null) return ms;
            } catch (e) {
                if (c.is_cancelled()) return null;
            }
        }
        return null;
    }

    async _check() {
        if (this._busy) return;
        this._busy = true;
        let c = this._cancel; // own cancellable: a check from before a disable/enable never leaks in
        let ms = await this._ping(c);
        if (c.is_cancelled()) return; // disabled meanwhile
        this._busy = false;
        this._win.push(ms);
        this._win = this._win.slice(-6);
        let st = S.status(this._win);
        let r = S.step(this._track, st, GLib.get_monotonic_time() / 1000);
        this._track = r.track;
        this._render(st);
        if (r.note) Main.notify(r.note.title, r.note.body);
    }
}

function init() {
    return new Extension();
}
