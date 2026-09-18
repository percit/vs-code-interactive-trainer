/* shortcuttype — monkeytype-style shortcut drill with persistent
 * spaced repetition: exercises you fumble or answer slowly come back
 * more often in the next round; ones you nail stay rare.
 * No build step, no dependencies.
 */

const EX = [
  {
    id: "delete-line",
    title: "Delete the current line",
    mac: [
      { mod: ["meta", "shift"], key: "k", label: "⌘ ⇧ K" },
      { mod: ["meta"], key: "x", label: "⌘ X" },
    ],
    win: [
      { mod: ["ctrl", "shift"], key: "k", label: "Ctrl Shift K" },
      { mod: ["ctrl"], key: "x", label: "Ctrl X" },
    ],
    before: [["const", " total = price + tax;"], ["const", " shipping = 0;"]],
    cursorLine: 0,
    after: [["const", " shipping = 0;"]],
  },
  {
    id: "move-down",
    title: "Move the current line down",
    mac: [{ mod: ["alt"], key: "ArrowDown", label: "⌥ ↓" }],
    win: [{ mod: ["alt"], key: "ArrowDown", label: "Alt ↓" }],
    before: [["const", " a = 1;"], ["const", " b = 2;"]],
    cursorLine: 0,
    after: [["const", " b = 2;"], ["const", " a = 1;"]],
  },
  {
    id: "copy-down",
    title: "Copy the current line, placing the duplicate below it",
    mac: [{ mod: ["alt", "shift"], key: "ArrowDown", label: "⇧ ⌥ ↓" }],
    win: [{ mod: ["alt", "shift"], key: "ArrowDown", label: "Shift Alt ↓" }],
    before: [["return", " user.name;"]],
    cursorLine: 0,
    after: [["return", " user.name;"], ["return", " user.name;"]],
  },
  {
    id: "toggle-comment",
    title: "Toggle line comment",
    mac: [{ mod: ["meta"], key: "/", label: "⌘ /" }],
    win: [{ mod: ["ctrl"], key: "/", label: "Ctrl /" }],
    before: [["", "debugger;"]],
    cursorLine: 0,
    after: [["// ", "debugger;"]],
  },
  {
    id: "select-next",
    title: "Select the next occurrence of the selected word",
    mac: [{ mod: ["meta"], key: "d", label: "⌘ D" }],
    win: [{ mod: ["ctrl"], key: "d", label: "Ctrl D" }],
    before: [["", "[count]", " = ", "count", " + 1;"]],
    cursorLine: 0,
    after: [["", "[count]", " = ", "[count]", " + 1;"]],
  },
  {
    id: "indent",
    title: "Indent the current line",
    mac: [{ mod: ["meta"], key: "]", label: "⌘ ]" }],
    win: [{ mod: ["ctrl"], key: "]", label: "Ctrl ]" }],
    before: [["if", " (ok) {"], ["", "doThing();"], ["}"]],
    cursorLine: 1,
    after: [["if", " (ok) {"], ["  ", "doThing();"], ["}"]],
  },
  {
    id: "home",
    title: "Jump to the start of the line",
    mac: [{ mod: [], key: "Home", label: "Home" }],
    win: [{ mod: [], key: "Home", label: "Home" }],
    before: [["    ", "return value;"]],
    cursorLine: 0,
    after: [["|    ", "return value;"]],
  },
  {
    id: "rename-symbol",
    title: "Rename the symbol under the cursor",
    mac: [{ mod: [], key: "F2", label: "F2" }],
    win: [{ mod: [], key: "F2", label: "F2" }],
    before: [["const", " ", "[usr]", " = getUser();"]],
    cursorLine: 0,
    after: [["✏️  rename box opens"]],
    note: {
      mac: "On a MacBook keyboard, F2 is usually mapped to brightness. Hold Fn+F2, or enable \"Use F1, F2, etc. keys as standard function keys\" in System Settings → Keyboard.",
    },
  },
];

const PLATFORM_KEY = "shortcuttype_platform";
const SRS_KEY = "shortcuttype_srs_v1";
const SLOW_MS = 3000; // a correct-but-slow first try still counts as "needs more reps"

function detectPlatform() {
  const saved = localStorage.getItem(PLATFORM_KEY);
  if (saved) return saved;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? "mac" : "win";
}

function loadSRS() {
  try {
    return JSON.parse(localStorage.getItem(SRS_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function saveSRS() {
  localStorage.setItem(SRS_KEY, JSON.stringify(srs));
}
function getCard(id) {
  return srs[id] || { box: 0, seen: 0, lastOutcome: null };
}
function updateSRS(id, outcome) {
  const card = getCard(id);
  card.seen += 1;
  if (outcome === "good") card.box = Math.min(5, card.box + 1);
  else if (outcome === "wrong") card.box = 0;
  // "slow": box stays put — still counts as practiced, just not mastered yet.
  card.lastOutcome = outcome;
  srs[id] = card;
  saveSRS();
}

let srs = loadSRS();
let platform = detectPlatform();
let order = [];
let pos = 0;
let correct = 0;
let wrong = 0;
let startTime = 0;
let cardStartTime = 0;
let attemptedWrongThisCard = false;
let done = false;

const els = {
  prompt: document.getElementById("prompt"),
  snippet: document.getElementById("snippet"),
  stats: document.getElementById("stats"),
  peek: document.getElementById("peek"),
  peekBtn: document.getElementById("peekBtn"),
  note: document.getElementById("note"),
  answer: document.getElementById("answer"),
  test: document.getElementById("test"),
  results: document.getElementById("results"),
  resSpeed: document.getElementById("resSpeed"),
  resAcc: document.getElementById("resAcc"),
  resTime: document.getElementById("resTime"),
  restartBtn: document.getElementById("restartBtn"),
  platformToggle: document.getElementById("platformToggle"),
};

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Weaker exercises (low box) show up more often; mastered ones (high box)
// show up once per round. This is the spaced-repetition part.
function buildQueue() {
  const pool = [];
  for (const ex of EX) {
    const box = getCard(ex.id).box;
    const weight = box <= 0 ? 3 : box === 1 ? 2 : 1;
    for (let i = 0; i < weight; i++) pool.push(ex);
  }
  const q = shuffle(pool);
  // Avoid the same exercise landing back-to-back where possible.
  for (let i = 1; i < q.length; i++) {
    if (q[i].id === q[i - 1].id) {
      for (let j = i + 1; j < q.length; j++) {
        if (q[j].id !== q[i - 1].id) {
          [q[i], q[j]] = [q[j], q[i]];
          break;
        }
      }
    }
  }
  return q;
}

function masteredCount() {
  return EX.filter((ex) => getCard(ex.id).box >= 4).length;
}

function shortcutFor(ex) {
  return platform === "mac" ? ex.mac : ex.win;
}

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

function renderLine(tokens) {
  let html = "";
  for (const raw of tokens) {
    const parts = raw.split("|");
    for (let i = 0; i < parts.length; i++) {
      const seg = parts[i];
      const selMatch = seg.match(/^\[(.*)\]$/);
      html += selMatch ? `<span class="sel">${escapeHtml(selMatch[1])}</span>` : escapeHtml(seg);
      if (i < parts.length - 1) html += `<span class="cursor"></span>`;
    }
  }
  return html;
}

function renderSnippet(ex, showAfter) {
  const lines = showAfter ? ex.after : ex.before;
  let html = "";
  lines.forEach((tokens, i) => {
    let content = renderLine(tokens);
    if (!showAfter && i === ex.cursorLine && !content.includes('class="cursor"')) {
      content += `<span class="cursor"></span>`;
    }
    html += `<span class="line"><span class="lineno">${i + 1}</span>${content}</span>\n`;
  });
  els.snippet.innerHTML = html;
}

function renderStats() {
  const total = order.length;
  els.stats.innerHTML = `<span>${pos}/${total}</span><span><b>${correct}</b> correct</span><span>${wrong} missed</span><span>◆ mastered <b>${masteredCount()}</b>/${EX.length}</span>`;
}

function startRound() {
  order = buildQueue();
  pos = 0;
  correct = 0;
  wrong = 0;
  startTime = 0;
  done = false;
  els.results.hidden = true;
  els.test.hidden = false;
  loadCard();
}

function loadCard() {
  attemptedWrongThisCard = false;
  cardStartTime = performance.now();
  els.answer.textContent = "";
  els.peek.hidden = false;
  const ex = order[pos];
  els.prompt.innerHTML = ex.title;
  renderSnippet(ex, false);
  renderStats();
  els.snippet.classList.remove("flash-correct", "flash-wrong");
  const note = ex.note && ex.note[platform];
  els.note.textContent = note || "";
  els.note.hidden = !note;
}

function finishRound() {
  done = true;
  const elapsedMs = performance.now() - startTime;
  const elapsedMin = Math.max(elapsedMs / 60000, 1 / 60);
  const speed = Math.round(correct / elapsedMin);
  const acc = correct + wrong === 0 ? 100 : Math.round((correct / (correct + wrong)) * 100);
  els.resSpeed.textContent = speed;
  els.resAcc.textContent = acc + "%";
  els.resTime.textContent = Math.round(elapsedMs / 1000) + "s";
  els.test.hidden = true;
  els.results.hidden = false;
}

function matchesOne(e, sc) {
  const hasMeta = sc.mod.includes("meta");
  const hasCtrl = sc.mod.includes("ctrl");
  const hasAlt = sc.mod.includes("alt");
  const hasShift = sc.mod.includes("shift");
  if (e.metaKey !== hasMeta) return false;
  if (e.ctrlKey !== hasCtrl) return false;
  if (e.altKey !== hasAlt) return false;
  if (e.shiftKey !== hasShift) return false;
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const want = sc.key.length === 1 ? sc.key.toLowerCase() : sc.key;
  return key === want;
}

// A shortcut can have more than one valid real-world form (e.g. VS Code's
// "delete line" is both Cmd+Shift+K and plain Cmd+X with no selection) —
// any accepted variant counts as correct.
function matchesShortcut(e, variants) {
  return variants.some((sc) => matchesOne(e, sc));
}

const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta"]);

// Cmd+Enter on Mac / Win+Enter on Windows — both are just metaKey+Enter in
// the browser, so one listener covers the "show shortcut" hint everywhere.
document.addEventListener(
  "keydown",
  (e) => {
    if (done || order.length === 0) return;
    if (e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && e.key === "Enter") {
      e.preventDefault();
      e.stopImmediatePropagation();
      els.peekBtn.click();
    }
  },
  true
);

document.addEventListener(
  "keydown",
  (e) => {
    if (done || order.length === 0) return;
    if (MODIFIER_KEYS.has(e.key)) return;
    if (startTime === 0) startTime = performance.now();

    const ex = order[pos];
    const sc = shortcutFor(ex);

    if (matchesShortcut(e, sc)) {
      e.preventDefault();
      e.stopPropagation();
      correct += 1;
      const elapsed = performance.now() - cardStartTime;
      const outcome = attemptedWrongThisCard ? "wrong" : elapsed > SLOW_MS ? "slow" : "good";
      updateSRS(ex.id, outcome);
      els.snippet.classList.add("flash-correct");
      renderSnippet(ex, true);
      renderStats();
      setTimeout(() => {
        pos += 1;
        if (pos >= order.length) finishRound();
        else loadCard();
      }, 450);
    } else {
      // Only penalize plausible "attempts" (something with a modifier held,
      // or a lone key when the target has no modifier) so idle keys don't count.
      const isAttempt = e.metaKey || e.ctrlKey || e.altKey || sc.some((v) => v.mod.length === 0);
      if (isAttempt && !attemptedWrongThisCard) {
        attemptedWrongThisCard = true;
        wrong += 1;
        renderStats();
      }
      if (isAttempt) {
        e.preventDefault();
        els.snippet.classList.remove("flash-wrong");
        void els.snippet.offsetWidth;
        els.snippet.classList.add("flash-wrong");
      }
    }
  },
  true
);

// Prevent the browser from hijacking common combos mid-round.
const GUARD_KEYS = new Set(["d", "l", "k", "x", "/", "]", "["]);
document.addEventListener(
  "keydown",
  (e) => {
    if (order.length === 0 || done) return;
    if ((e.metaKey || e.ctrlKey) && GUARD_KEYS.has(e.key.toLowerCase())) {
      e.preventDefault();
    }
  },
  true
);

els.peekBtn.addEventListener("click", () => {
  const ex = order[pos];
  const variants = shortcutFor(ex);
  els.answer.innerHTML = variants
    .map((sc) =>
      sc.label
        .split(" ")
        .map((k) => `<kbd>${k}</kbd>`)
        .join("")
    )
    .join(' <span class="dim">or</span> ');
});

els.restartBtn.addEventListener("click", startRound);

function setPlatform(p) {
  platform = p;
  localStorage.setItem(PLATFORM_KEY, p);
  [...els.platformToggle.querySelectorAll(".platform-btn")].forEach((b) => {
    b.classList.toggle("active", b.dataset.os === p);
  });
  if (order.length && !done) {
    const ex = order[pos];
    const note = ex.note && ex.note[platform];
    els.note.textContent = note || "";
    els.note.hidden = !note;
  }
}

els.platformToggle.querySelectorAll(".platform-btn").forEach((b) => {
  b.addEventListener("click", () => setPlatform(b.dataset.os));
});

setPlatform(platform);
startRound();
els.snippet.focus();
