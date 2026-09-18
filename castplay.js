/*!
 * castplay — a tiny asciicast v2 player for places you can't load asciinema-player.
 * No dependencies, no wasm, no network. MIT.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.castplay = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PAL = ['#484F58', '#FF7B72', '#3FB950', '#D29922', '#58A6FF', '#BC8CFF', '#39C5CF', '#B1BAC4',
             '#6E7681', '#FFA198', '#56D364', '#E3B341', '#79C0FF', '#D2A8FF', '#56D4DD', '#F0F6FC'];
  var cube = function (v) { return v ? 55 + v * 40 : 0; };
  function c256(n) {
    if (n < 16) return PAL[n];
    if (n < 232) { n -= 16; return 'rgb(' + cube(Math.floor(n / 36)) + ',' + cube(Math.floor(n / 6) % 6) + ',' + cube(n % 6) + ')'; }
    var l = 8 + (n - 232) * 10; return 'rgb(' + l + ',' + l + ',' + l + ')';
  }
  var esc = function (s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };

  // A terminal screen: enough of xterm to replay a recorded CLI session
  // (SGR colours, cursor moves, erase, wrap, scrollback). Not a real terminal:
  // no alternate screen, no scroll regions, no reflow on resize.
  function Screen(cols, rows) { this.cols = cols || 80; this.rows = rows || 24; this.reset(); }
  Screen.prototype = {
    reset: function () { this.buf = [[]]; this.x = 0; this.y = 0; this.a = {}; this.state = 0; this.seq = ''; },
    top: function () { return Math.max(0, this.buf.length - this.rows); },
    line: function (y) { while (this.buf.length <= y) this.buf.push([]); return this.buf[y]; },
    style: function () {
      var a = this.a, css = [];
      if (a.fg) css.push('color:' + a.fg);
      if (a.bg) css.push('background:' + a.bg);
      if (a.bold) css.push('font-weight:700');
      if (a.dim) css.push('opacity:.62');
      if (a.italic) css.push('font-style:italic');
      if (a.under) css.push('text-decoration:underline');
      return css.join(';');
    },
    put: function (ch) {
      if (this.x >= this.cols) { this.x = 0; this.y++; }
      var l = this.line(this.y);
      while (l.length < this.x) l.push([' ', '']);
      l[this.x++] = [ch, this.style()];
    },
    write: function (s) { for (var ch of s) this.feed(ch); }, // by code point: surrogate pairs stay one cell
    feed: function (ch) {
      if (this.state === 0) {
        if (ch === '\x1b') { this.state = 1; return; }
        if (ch === '\r') { this.x = 0; return; }
        if (ch === '\n') { this.y++; this.line(this.y); return; }
        if (ch === '\b') { this.x = Math.max(0, this.x - 1); return; }
        if (ch === '\t') { this.x = Math.min(this.cols - 1, (this.x + 8) & ~7); return; }
        if (ch < ' ') return;
        this.put(ch); return;
      }
      if (this.state === 1) { this.state = ch === '[' ? 2 : ch === ']' ? 3 : 0; this.seq = ''; return; }
      if (this.state === 2) {
        if (ch >= '@' && ch <= '~') { this.csi(this.seq, ch); this.state = 0; } else this.seq += ch;
        return;
      }
      if (this.state === 3) { if (ch === '\x07') this.state = 0; else if (ch === '\x1b') this.state = 4; return; }
      this.state = 0; // ESC \ closes an OSC
    },
    csi: function (p, f) {
      if (p[0] === '?' || p[0] === '>') return;
      var a = p === '' ? [] : p.split(';').map(Number);
      var n = function (i, d) { return (a[i] === undefined || isNaN(a[i]) || a[i] === 0) ? d : a[i]; };
      var top = this.top(), l, m;
      switch (f) {
        case 'm': this.sgr(a.length ? a : [0]); break;
        case 'K':
          l = this.line(this.y); m = a[0] || 0;
          if (m === 0) l.length = Math.min(l.length, this.x);
          else if (m === 1) { for (var i = 0; i <= this.x && i < l.length; i++) l[i] = [' ', '']; }
          else l.length = 0;
          break;
        case 'J':
          m = a[0] || 0;
          if (m >= 2) { this.buf = [[]]; this.x = 0; this.y = 0; }
          else if (m === 0) { l = this.line(this.y); l.length = Math.min(l.length, this.x); this.buf.length = this.y + 1; }
          break;
        case 'A': this.y = Math.max(top, this.y - n(0, 1)); break;
        case 'B': this.y += n(0, 1); this.line(this.y); break;
        case 'C': this.x = Math.min(this.cols - 1, this.x + n(0, 1)); break;
        case 'D': this.x = Math.max(0, this.x - n(0, 1)); break;
        case 'G': this.x = n(0, 1) - 1; break;
        case 'H': case 'f': this.y = top + n(0, 1) - 1; this.x = n(1, 1) - 1; this.line(this.y); break;
      }
    },
    sgr: function (a) {
      for (var i = 0; i < a.length; i++) {
        var c = a[i] || 0, s = this.a, key;
        if (c === 0) this.a = {};
        else if (c === 1) s.bold = true;
        else if (c === 2) s.dim = true;
        else if (c === 3) s.italic = true;
        else if (c === 4) s.under = true;
        else if (c === 22) { s.bold = false; s.dim = false; }
        else if (c === 23) s.italic = false;
        else if (c === 24) s.under = false;
        else if (c >= 30 && c <= 37) s.fg = PAL[c - 30];
        else if (c >= 90 && c <= 97) s.fg = PAL[c - 90 + 8];
        else if (c >= 40 && c <= 47) s.bg = PAL[c - 40];
        else if (c >= 100 && c <= 107) s.bg = PAL[c - 100 + 8];
        else if (c === 39) s.fg = null;
        else if (c === 49) s.bg = null;
        else if (c === 38 || c === 48) {
          key = c === 38 ? 'fg' : 'bg';
          if (a[i + 1] === 5) { s[key] = c256(a[i + 2]); i += 2; }
          else if (a[i + 1] === 2) { s[key] = 'rgb(' + a[i + 2] + ',' + a[i + 3] + ',' + a[i + 4] + ')'; i += 4; }
        }
      }
    },
    html: function () {
      var top = this.top(), out = [];
      for (var y = top; y < top + this.rows; y++) {
        var l = this.buf[y] || [], html = '', run = '', cur = null;
        for (var i = 0; i < l.length; i++) {
          var ch = l[i][0], st = l[i][1];
          if (st !== cur) { if (run) html += cur ? '<span style="' + cur + '">' + esc(run) + '</span>' : esc(run); run = ''; cur = st; }
          run += ch;
        }
        if (run) html += cur ? '<span style="' + cur + '">' + esc(run) + '</span>' : esc(run);
        out.push(html);
      }
      return out.join('\n');
    },
    text: function () {
      return this.buf.map(function (l) { return l.map(function (c) { return c[0]; }).join('').replace(/\s+$/, ''); })
        .join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }
  };

  // asciicast v2: a header object then one [time, "o", data] per line.
  // Accepts the raw text, the parsed array, or {header, events}.
  function parse(cast) {
    var head, events;
    if (typeof cast === 'string') {
      var lines = cast.split('\n').filter(function (l) { return l.trim(); }).map(JSON.parse);
      head = lines[0]; events = lines.slice(1);
    } else if (Array.isArray(cast)) { head = cast[0]; events = cast.slice(1); }
    else { head = cast.header || cast; events = cast.events || []; }
    if (!head || !head.version) throw new Error('castplay: not an asciicast v2 recording');
    return { head: head, events: events.filter(function (e) { return e[1] === 'o'; }) };
  }

  var fmt = function (t) { return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0'); };
  var SPEEDS = [1, 2, 4];

  function mount(el, cast, opts) {
    opts = opts || {};
    var p = parse(cast);
    var idle = opts.idleLimit !== undefined ? opts.idleLimit : (p.head.idle_time_limit || 1.2);
    var t = 0, prev = 0;
    // Clip idle gaps so the replay keeps moving; order and content are untouched.
    var events = p.events.map(function (e) { t += Math.min(e[0] - prev, idle); prev = e[0]; return [t, e[2]]; });
    var dur = t || 0.001;

    el.classList.add('castplay');
    el.innerHTML =
      '<pre class="castplay-screen" tabindex="0" role="img" aria-label="' + esc(opts.label || 'terminal recording') + '"></pre>' +
      '<div class="castplay-controls">' +
      '<button type="button" data-act="play" aria-label="Play"></button>' +
      '<input type="range" min="0" max="1000" value="0" aria-label="Seek">' +
      '<span class="castplay-time"></span>' +
      '<button type="button" data-act="speed" aria-label="Playback speed">1×</button>' +
      '</div>';
    var pre = el.querySelector('.castplay-screen');
    var btn = el.querySelector('[data-act=play]');
    var speedBtn = el.querySelector('[data-act=speed]');
    var range = el.querySelector('input[type=range]');
    var time = el.querySelector('.castplay-time');

    var scr = new Screen(p.head.width, opts.rows || p.head.height);
    var idx = 0, clock = 0, playing = false, speed = opts.speed || 1, last = 0;

    function seek(target) {
      target = Math.max(0, Math.min(dur, target));
      if (target < clock) { scr.reset(); idx = 0; }
      while (idx < events.length && events[idx][0] <= target) scr.write(events[idx++][1]);
      clock = target;
      pre.innerHTML = scr.html();
      range.value = String(Math.round((clock / dur) * 1000));
      time.textContent = fmt(clock) + ' / ' + fmt(dur);
    }
    function setPlaying(v) {
      playing = v;
      btn.textContent = v ? 'Pause' : clock >= dur ? 'Replay' : 'Play';
      btn.setAttribute('aria-pressed', String(v));
    }
    function tick(now) {
      if (!playing) return;
      var next = Math.min(dur, clock + ((now - last) / 1000) * speed);
      last = now; seek(next);
      if (next >= dur) { setPlaying(false); return; }
      requestAnimationFrame(tick);
    }
    function play() {
      if (clock >= dur) seek(0);
      setPlaying(true); last = performance.now(); requestAnimationFrame(tick);
    }
    function toggle() { if (playing) setPlaying(false); else play(); }

    btn.addEventListener('click', toggle);
    speedBtn.addEventListener('click', function () {
      speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
      speedBtn.textContent = speed + '×';
    });
    range.addEventListener('input', function () { seek((Number(range.value) / 1000) * dur); setPlaying(playing); });
    pre.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setPlaying(false); seek(clock - 3); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setPlaying(false); seek(clock + 3); }
      else return;
    });

    // Where the player opens. 'end' shows the outcome before anyone presses play.
    var poster = opts.poster === undefined ? 'end' : opts.poster;
    seek(poster === 'end' ? dur : poster === 'start' ? 0 : Number(poster) || 0);
    setPlaying(false);
    if (opts.autoplay) { seek(0); play(); }

    return {
      play: play, pause: function () { setPlaying(false); }, seek: seek,
      duration: dur,
      // The whole session as plain text, for a transcript or a copy button.
      text: function () { var s = new Screen(p.head.width, 1e6); p.events.forEach(function (e) { s.write(e[2]); }); return s.text(); }
    };
  }

  // Mounts every [data-castplay] element: the attribute names an element
  // holding the recording (<script type="application/json">), data-* carry options.
  function auto(root) {
    var out = [];
    (root || document).querySelectorAll('[data-castplay]').forEach(function (el) {
      var src = document.getElementById(el.dataset.castplay);
      if (!src) return;
      out.push(mount(el, JSON.parse(src.textContent), {
        poster: el.dataset.poster, label: el.dataset.label,
        idleLimit: el.dataset.idleLimit ? Number(el.dataset.idleLimit) : undefined,
        rows: el.dataset.rows ? Number(el.dataset.rows) : undefined,
        autoplay: el.dataset.autoplay === 'true'
      }));
    });
    return out;
  }

  return { mount: mount, auto: auto, parse: parse, Screen: Screen };
}));
