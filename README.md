# shortcuttype

A minimal, monkeytype-style drill for VS Code keyboard shortcuts. No build
step, no dependencies — plain HTML/CSS/JS.

**Live: https://percit.github.io/vs-code-interactive-trainer/**

## How it works

You get a short scenario ("delete the current line", "toggle line comment"...)
and a before/after code snippet. Press the real shortcut on your keyboard —
the app just listens for the key combo, there's no actual editor underneath.
Get it right and it flashes green, shows the resulting code, and moves on to
the next one; get it wrong and it flashes red so you can retry. Some
exercises accept more than one valid real-world shortcut (e.g. VS Code's
"delete line" is both `Cmd/Ctrl+Shift+K` and plain `Cmd/Ctrl+X` with nothing
selected).

Mac and Windows/Linux key bindings are both supported via the toggle in the
top bar.

No build step — open `index.html` directly, or serve the folder statically.
