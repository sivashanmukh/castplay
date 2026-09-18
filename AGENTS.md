# Working on castplay

Two shipped files, no build step, no dependencies: `castplay.js` (UMD) and
`castplay.css`. Keep it that way — the whole point is that both can be pasted
into one HTML file.

- `node test.js` is the check. It covers the terminal emulator, which is the only
  non-trivial part. Add a case there rather than a framework.
- `llms.txt` is the API in one screen. Update it with any API change.
- The demo recording is generated: `python3 demo/make-demo-cast.py`.
- No proprietary or employer-specific content in this repo, including in demo
  recordings — it is a public, general-purpose library.
- `\n` is a line feed only (column preserved). Recordings use `\r\n`. Tests that
  use bare `\n` for new lines are testing the wrong thing.
