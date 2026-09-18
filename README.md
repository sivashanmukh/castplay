# castplay

[![tests](https://github.com/sivashanmukh/castplay/actions/workflows/test.yml/badge.svg)](https://github.com/sivashanmukh/castplay/actions/workflows/test.yml)
[![npm](https://img.shields.io/npm/v/castplay.svg)](https://www.npmjs.com/package/castplay)
[![no dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](package.json)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**An asciicast player that runs where asciinema-player can't: no WebAssembly, no
CDN stylesheet, no network at runtime.** ~12 KB of plain JavaScript with play,
pause, seek and speed controls. Paste it into a single HTML file and a recorded
terminal session becomes playable.

[**Live demo**](https://sivashanmukh.github.io/castplay/demo/)

## Use asciinema-player instead, unless you can't

[asciinema-player](https://github.com/asciinema/asciinema-player) is the standard
and it is better than this: a real VT emulator (Rust compiled to wasm), fonts,
themes, markers, live streams. Use it on any page you control.

castplay is for the pages you *don't* fully control:

| asciinema-player needs | castplay |
|---|---|
| `WebAssembly.instantiate` — a CSP with `wasm-unsafe-eval` | plain JS, no eval of any kind |
| its stylesheet from a CDN or your origin | one small CSS file you can inline |
| ~207 KB JS + 44 KB CSS | ~12 KB JS + 2 KB CSS, both inlineable |
| a URL to fetch the recording | the recording sits in the page |

That combination — no wasm, no external stylesheet, no fetch — is what a strict
Content-Security-Policy page, an LLM-generated single-file artifact, an email-able
`.html`, or an offline docs bundle allows.

Nothing else covered it: [svg-term-cli](https://github.com/marionebl/svg-term-cli)
and [termsvg](https://github.com/MrMarble/termsvg) render animated SVG with no
controls, [agg](https://github.com/asciinema/agg) renders a GIF, and
[xterm.js](https://github.com/xtermjs/xterm.js) is an emulator with no player
around it and 20× the size.

## Install

```sh
npm i castplay
```

or from a CDN — `jsdelivr`/`unpkg` serve the npm package, which is also the form
allowed by most script-src allowlists:

```html
<script src="https://cdn.jsdelivr.net/npm/castplay@0/castplay.js"></script>
```

or just copy [`castplay.js`](castplay.js) and [`castplay.css`](castplay.css) into
your page. Two files, no build step, no dependencies.

## Use

```html
<link rel="stylesheet" href="castplay.css">          <!-- or paste into <style> -->

<div data-castplay="cast-1"></div>
<script type="application/json" id="cast-1">
  [{"version":2,"width":80,"height":24},[0.1,"o","hello\r\n"]]
</script>

<script src="castplay.js"></script>                   <!-- or paste into <script> -->
<script>castplay.auto()</script>
```

`castplay.auto()` mounts every `[data-castplay]` element, reading options from
`data-` attributes: `data-poster` (`end`, `start` or a number of seconds),
`data-label`, `data-idle-limit`, `data-rows`, `data-autoplay`.

Or mount one yourself:

```js
const player = castplay.mount(el, cast, {
  poster: 'end',     // where it opens. 'end' shows the outcome before anyone presses play
  idleLimit: 1.2,    // clip gaps longer than this, in seconds (asciicast idle_time_limit)
  speed: 1,
  rows: 24,          // override the recording's height
  autoplay: false,
  label: 'terminal recording',   // aria-label on the screen
});

player.play(); player.pause(); player.seek(3.5);
player.duration;   // seconds, after idle clipping
player.text();     // the whole session as plain text, for a transcript
```

`cast` is asciicast v2 in any of three shapes: the raw file text, the parsed
array (`[header, ...events]`), or `{header, events}`. Input events (`"i"`) are
ignored. The keyboard works on the screen element: space toggles, ← → seek 3s.

Every colour is a CSS variable on `.castplay` (`--castplay-bg`, `--castplay-fg`,
`--castplay-accent`, `--castplay-font`, …), so theming is a few declarations.

## Record a demo worth playing

[asciinema](https://asciinema.org) records; [demo-magic](https://github.com/paxtonhare/demo-magic)
makes the recording look like someone competent typing it, instead of a live
session with typos and thinking pauses:

```sh
# demo.sh
. demo-magic.sh -n          # -n: no waiting for a keypress between commands
pe "npm test"               # types the command out, then runs it
pe "git status"
```

```sh
asciinema rec -c ./demo.sh demo.cast --cols 100 --rows 24
```

Two things that cost an evening the first time: demo-magic needs `pv` installed
for the typing effect and aborts without it (pass `-d` to skip typing instead),
and it unsets `TYPE_SPEED`, so a script with `set -u` dies on the first command.

Then inline `demo.cast` into the page:

```js
JSON.stringify(text.trim().split('\n').map(JSON.parse))   // one JSON value, safe to embed
```

## What it emulates

Enough of a terminal to replay a recorded CLI session: SGR (16 / 256 / truecolour,
bold, dim, italic, underline), `\r` overwrite, cursor up/down/left/right/column/position,
erase line and screen, wrapping and scrollback. `\n` is a line feed only — the column
is preserved, as on a real terminal, which is why recordings use `\r\n`.

Not emulated: alternate screen, scroll regions, reflow on resize, mouse. A
full-screen TUI recording (vim, htop) will not look right — that is
asciinema-player's job.

## Develop

```sh
node test.js                     # the emulator's checks; no framework, no deps
python3 demo/make-demo-cast.py   # regenerate the demo recording
python3 -m http.server 8799      # then open /demo/
```

There is an [`llms.txt`](llms.txt) with the whole API in one screen, for coding
agents and anything else that would rather read 60 lines than a README.

MIT.
