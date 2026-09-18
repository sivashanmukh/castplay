# castplay

A ~12 KB asciicast v2 player: play, pause, seek, speed. No dependencies, no
WebAssembly, no network at runtime. Drop two files into a page — or paste them
into one — and a recorded terminal session becomes playable.

## Use asciinema-player instead, unless you can't

[asciinema-player](https://github.com/asciinema/asciinema-player) is the standard
and it is better than this: a real VT emulator (in Rust, compiled to wasm), fonts,
themes, markers, live streams. Use it on any page you control.

castplay exists for the pages you *don't* fully control, where asciinema-player
can't load:

| asciinema-player needs | castplay |
|---|---|
| `WebAssembly.instantiate` (`wasm-unsafe-eval` in CSP) | plain JS |
| its own stylesheet from a CDN or your origin | one small CSS file you can inline |
| ~207 KB JS + 44 KB CSS | ~12 KB + 2 KB, inlineable into a single HTML file |
| a URL to fetch the recording (or its own inline-data driver) | the recording sits in the page |

That combination — no wasm, no CDN stylesheet, no fetch — is what a Claude
artifact, a strict-CSP docs page, or a single `.html` file mailed to someone
allows. Nothing else seemed to cover it: `svg-term-cli` and `termsvg` produce
animated SVG with no controls, `agg` produces a GIF, and `xterm.js` is an
emulator with no player around it.

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

## Record

```sh
asciinema rec -c ./your-demo.sh demo.cast --cols 100 --rows 24
```

Then inline `demo.cast` into the page. `JSON.stringify(text.trim().split('\n').map(JSON.parse))`
turns the file into the array form, which is one JSON value and so safe to embed.

## What it emulates

Enough of a terminal to replay a recorded CLI session: SGR (16 / 256 / truecolour,
bold, dim, italic, underline), `\r` overwrite, cursor up/down/left/right/column/position,
erase line and screen, wrapping and scrollback. Not emulated: alternate screen,
scroll regions, reflow on resize, mouse. A full-screen TUI recording (vim, htop)
will not look right — that is asciinema-player's job.

## Develop

```sh
node test.js                     # the emulator's checks; no framework
python3 demo/make-demo-cast.py   # regenerate the demo recording
python3 -m http.server 8799      # then open /demo/
```

MIT.
