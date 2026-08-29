:root {
  --bg: #05070a;
  --term-bg: #0a0f0c;
  --phosphor: #57e389;
  --phosphor-bright: #a6ffca;
  --amber: #e0b34d;
  --muted: #3d5a48;
  --danger: #e0865a;
  --font-mono: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace;
}

* { box-sizing: border-box; }

html, body, #root {
  height: 100%;
  margin: 0;
}

body {
  background: var(--bg);
  background-image:
    radial-gradient(circle at 20% 10%, rgba(87,227,137,0.05), transparent 45%),
    radial-gradient(circle at 80% 90%, rgba(87,227,137,0.04), transparent 45%);
  font-family: var(--font-mono);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px 14px;
}

.crt-wrap {
  width: 100%;
  max-width: 680px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.terminal {
  width: 100%;
  background: var(--term-bg);
  border-radius: 8px;
  box-shadow:
    0 0 0 1px rgba(87,227,137,0.12),
    0 20px 60px rgba(0,0,0,0.6),
    0 0 40px rgba(87,227,137,0.05);
  overflow: hidden;
  position: relative;
}

.titlebar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #0d1310;
  border-bottom: 1px solid rgba(87,227,137,0.14);
}

.dots { display: flex; gap: 6px; }
.dot { width: 10px; height: 10px; border-radius: 50%; opacity: 0.85; }
.dot.red { background: #e0665a; }
.dot.yellow { background: #e0b34d; }
.dot.green { background: #57e389; }

.titletext {
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.04em;
  margin-left: 4px;
}

.screen {
  padding: 18px 18px 16px;
  height: 480px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.65;
  color: var(--phosphor);
}

.screen::-webkit-scrollbar { width: 8px; }
.screen::-webkit-scrollbar-track { background: transparent; }
.screen::-webkit-scrollbar-thumb { background: rgba(87,227,137,0.2); border-radius: 4px; }

.line { white-space: pre-wrap; word-break: break-word; }

.line.boot { color: var(--muted); }
.line.system { color: var(--phosphor-bright); margin: 4px 0; }
.line.meta { color: var(--muted); font-size: 12px; }
.line.warn { color: var(--amber); }
.line.success { color: var(--phosphor-bright); }
.line.user { color: #ffffff; opacity: 0.92; }
.line.user .prompt { color: var(--phosphor); }

.line.divider { color: rgba(87,227,137,0.35); letter-spacing: 0.05em; }

.line.choice,
.line.ticket-row,
.line.total {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.line.choice .kcal,
.line.ticket-row .kcal { color: var(--muted); font-size: 12px; white-space: nowrap; }

.line.total {
  color: var(--phosphor-bright);
  font-weight: 700;
  font-size: 14px;
}
.line.total .kcal { color: var(--amber); }

.input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.prompt {
  color: var(--phosphor);
  white-space: nowrap;
}

.cmd-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #ffffff;
  font-family: var(--font-mono);
  font-size: 13px;
  caret-color: transparent;
}

.cmd-input:disabled { opacity: 0.4; }

.cursor {
  color: var(--phosphor);
  animation: blink 1s step-end infinite;
  margin-left: -4px;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  50.01%, 100% { opacity: 0; }
}

.scanlines {
  pointer-events: none;
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    to bottom,
    rgba(0,0,0,0) 0px,
    rgba(0,0,0,0) 1px,
    rgba(0,0,0,0.08) 2px,
    rgba(0,0,0,0) 3px
  );
  mix-blend-mode: overlay;
  opacity: 0.5;
}

.footnote {
  margin-top: 16px;
  font-size: 10.5px;
  color: #3d4d44;
  text-align: center;
  max-width: 480px;
  line-height: 1.6;
}

@media (max-width: 520px) {
  .screen { height: 62vh; font-size: 12.5px; }
}
