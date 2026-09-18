#!/usr/bin/env python3
"""Generates demo/hello.cast: colours, a spinner and a progress bar, so the
demo exercises the parts of the emulator that a plain text dump would not."""
import json
import os

ESC = ""
ev, t = [], 0.0


def w(data, dt=0.06):
    global t
    t += dt
    ev.append([round(t, 3), "o", data])


w(f"{ESC}[32m${ESC}[0m castplay demo\r\n", 0.4)
for c in "echo 'colours, spinners, progress - no wasm, no network'":
    w(c, 0.035)
w("\r\n", 0.3)
w(f"{ESC}[1;34mcolours{ESC}[0m  {ESC}[31mred {ESC}[33myellow {ESC}[32mgreen "
  f"{ESC}[36mcyan{ESC}[0m  {ESC}[38;5;208m256{ESC}[0m  "
  f"{ESC}[38;2;255;105;180mtruecolour{ESC}[0m\r\n", 0.25)
w(f"{ESC}[2mdim{ESC}[0m {ESC}[1mbold{ESC}[0m {ESC}[4munderline{ESC}[0m\r\n\r\n", 0.2)

frames = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
for i in range(24):
    w(f"\r{ESC}[K{ESC}[36m{frames[i % 10]}{ESC}[0m building...", 0.09)
w(f"\r{ESC}[K{ESC}[32m✔{ESC}[0m built\r\n", 0.15)

for i in range(0, 101, 5):
    bar = "█" * (i // 5) + "░" * (20 - i // 5)
    w(f"\r{ESC}[K{ESC}[35m{bar}{ESC}[0m {i:3d}%%".replace("%%", "%"), 0.05)
w(f"\r\n\r\n{ESC}[32m${ESC}[0m {ESC}[2m# the line above was rewritten in "
  f"place, 21 times{ESC}[0m\r\n", 0.3)

head = {"version": 2, "width": 80, "height": 16, "timestamp": 0,
        "env": {"SHELL": "/bin/zsh", "TERM": "xterm-256color"}}
out = os.path.join(os.path.dirname(__file__), "hello.cast")
with open(out, "w") as f:
    f.write("\n".join([json.dumps(head)] + [json.dumps(e) for e in ev]) + "\n")
print(f"{out}: {len(ev)} events, {t:.1f}s")
