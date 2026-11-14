import { useEffect, useRef, useState } from "react";
import { askNOVA, getAssistantCtx } from "../game/assistant";

const CHIPS = [
  "What is delta-v?",
  "Help me fix my design",
  "Which launch vehicle should I pick?",
  "Why do rockets have stages?",
  "What NASA data does this game use?",
];

export default function Assistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "nova"; text: string }[]>([
    { role: "nova", text: "Hi! I'm NOVA 🤖 — your mission advisor. Ask me anything about rockets, your current design, or NASA data!" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { listRef.current?.scrollTo(0, listRef.current.scrollHeight); }, [messages, busy]);

  const send = async (q: string) => {
    const query = q.trim();
    if (!query || busy) return;
    setMessages((m) => [...m, { role: "user", text: query }]);
    setInput("");
    setBusy(true);
    try {
      const reply = await askNOVA(query);
      setMessages((m) => [...m, { role: "nova", text: reply }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!open && (
        <button className="nova-fab" onClick={() => setOpen(true)} title="Ask NOVA anything">
          🤖 <span>NOVA</span>
        </button>
      )}
      {open && (
        <div className="nova-panel">
          <div className="nova-head">
            <strong>🤖 NOVA — mission advisor</strong>
            <span className="muted">{getAssistantCtx().screen}</span>
            <button className="ghost tiny" onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="nova-list" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`nova-msg ${m.role}`}>
                {m.text.split("\n").map((line, j) => (
                  <p key={j} className={line.startsWith("📚") || line.startsWith("**") ? "nova-src" : ""}>
                    {line.replace(/\*\*/g, "")}
                  </p>
                ))}
              </div>
            ))}
            {busy && <div className="nova-msg nova"><p>thinking… 🛰</p></div>}
          </div>
          <div className="nova-chips">
            {CHIPS.map((c) => <button key={c} className="ghost tiny" onClick={() => send(c)}>{c}</button>)}
          </div>
          <div className="nova-input">
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Ask NOVA anything…" autoFocus />
            <button className="big" onClick={() => send(input)}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}
