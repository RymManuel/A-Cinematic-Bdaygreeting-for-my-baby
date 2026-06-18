import React, { useEffect, useMemo, useState } from 'react';
import { HER_NAME } from '@/lib/photos';

const STORAGE_KEY = 'mybaby_reply_v1';

interface SavedReply {
  text: string;
  at: number;
}

// A few drifting cosmic particles for ambiance behind the reply box
const FloatingParticles: React.FC = () => {
  const dots = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 2 + Math.random() * 4,
        delay: Math.random() * 6,
        dur: 7 + Math.random() * 8,
        color: ['#ff8fcf', '#a06bff', '#ffd6a5', '#ffffff'][i % 4],
      })),
    []
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((d) => (
        <span
          key={d.id}
          className="absolute rounded-full"
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: d.size,
            height: d.size,
            background: d.color,
            boxShadow: `0 0 ${d.size * 4}px ${d.size}px ${d.color}55`,
            opacity: 0.5,
            animation: `replyFloat ${d.dur}s ease-in-out ${d.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
};

const ReplyBox: React.FC = () => {
  const [saved, setSaved] = useState<SavedReply | null>(null);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedReply;
        setSaved(parsed);
        setText(parsed.text);
      } else {
        setEditing(true);
      }
    } catch {
      setEditing(true);
    }
  }, []);

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const entry: SavedReply = { text: trimmed, at: Date.now() };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entry)); } catch { /* ignore */ }
    setSaved(entry);
    setEditing(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2600);
  };

  return (
    <div className="relative mt-12 w-full max-w-md">
      <style>{`@keyframes replyFloat{0%,100%{transform:translateY(0) translateX(0);opacity:.35}50%{transform:translateY(-18px) translateX(8px);opacity:.7}}`}</style>

      <div className="relative rounded-2xl border border-pink-300/25 bg-gradient-to-b from-white/[0.06] to-purple-500/[0.04] backdrop-blur-md p-6 overflow-hidden">
        <FloatingParticles />

        <div className="relative z-10">
          <p className="text-pink-200/70 text-[11px] tracking-[0.3em] uppercase mb-1">Leave your reply in the stars</p>

          {editing || !saved ? (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={280}
                rows={3}
                placeholder={`Write something back, ${HER_NAME.charAt(0) + HER_NAME.slice(1).toLowerCase()}...`}
                className="mt-3 w-full resize-none rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white/90 placeholder:text-white/30 text-base leading-relaxed outline-none focus:border-pink-300/60 transition"
                style={{ fontFamily: 'Georgia, serif' }}
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-white/30 text-[11px]">{text.length}/280</span>
                <button
                  onClick={handleSave}
                  disabled={!text.trim()}
                  className="rounded-full px-6 py-2 text-xs tracking-[0.2em] uppercase text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(90deg,#ff8fcf,#a06bff)' }}
                >
                  Send to the universe
                </button>
              </div>
            </>
          ) : (
            <>
              <p
                className="mt-3 text-white/90 text-lg leading-relaxed whitespace-pre-wrap"
                style={{ fontFamily: 'Georgia, serif', textShadow: '0 0 16px rgba(255,150,210,0.4)' }}
              >
                “{saved.text}”
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-pink-200/50 text-[11px] flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#ff8fcf"><path d="M12 21s-7-4.35-9.5-8.5C.5 9 2 5.5 5.5 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3C17 5.5 18.5 9 16.5 12.5 15 16.65 12 21 12 21z"/></svg>
                  Saved forever
                </span>
                <button
                  onClick={() => setEditing(true)}
                  className="text-white/40 hover:text-pink-200/80 text-[11px] tracking-[0.2em] uppercase transition"
                >
                  Edit
                </button>
              </div>
            </>
          )}

          {justSaved && (
            <p className="mt-3 text-center text-pink-200/80 text-xs tracking-wide">
              Your words are now floating among the stars.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReplyBox;
