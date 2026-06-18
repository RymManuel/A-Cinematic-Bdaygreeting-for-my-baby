import React, { useEffect, useRef, useState } from 'react';
import { NARRATION, NarrationCue } from '@/lib/storyScript';
import { HER_NAME, PET_NAME } from '@/lib/photos';
import ReplyBox from './ReplyBox';

interface Props {
  t0Ref: React.MutableRefObject<number>;
  aiMsg: string | null;
  universe: { id: string; found: boolean } | null;
  ended: boolean;
  onReplay: () => void;
}

const StoryOverlay: React.FC<Props> = ({ t0Ref, aiMsg, universe, ended, onReplay }) => {
  const [cue, setCue] = useState<NarrationCue | null>(null);
  const [opacity, setOpacity] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      const T = (performance.now() - t0Ref.current) / 1000;
      let active: NarrationCue | null = null;
      for (const c of NARRATION) {
        if (T >= c.start && T <= c.end) { active = c; break; }
      }
      setCue((prev) => (prev === active ? prev : active));
      if (active) {
        const fadeIn = Math.min(1, (T - active.start) / 0.9);
        const fadeOut = Math.min(1, (active.end - T) / 0.9);
        setOpacity(Math.max(0, Math.min(fadeIn, fadeOut)));
      } else {
        setOpacity(0);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [t0Ref]);

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* Central narration */}
      {cue && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
          style={{ opacity, transition: 'opacity 0.2s linear' }}
        >
          {cue.lines.map((line, i) => (
            <p
              key={i}
              className={
                cue.big
                  ? 'text-white font-light leading-tight tracking-wide ' +
                    (cue.serif ? 'text-4xl sm:text-6xl md:text-7xl' : 'text-2xl sm:text-4xl md:text-5xl')
                  : 'text-white/85 text-lg sm:text-2xl md:text-3xl font-light tracking-wide leading-relaxed'
              }
              style={{
                fontFamily: cue.serif ? 'Georgia, serif' : 'inherit',
                textShadow: cue.big
                  ? '0 0 30px rgba(255,150,210,0.8), 0 0 60px rgba(160,90,255,0.5)'
                  : '0 0 18px rgba(255,180,220,0.5)',
                background: cue.serif
                  ? 'linear-gradient(90deg,#ffd6a5,#ffffff,#ff8fcf)'
                  : undefined,
                WebkitBackgroundClip: cue.serif ? 'text' : undefined,
                WebkitTextFillColor: cue.serif ? 'transparent' : undefined,
                marginTop: i > 0 ? '0.4em' : 0,
              }}
            >
              {line}
            </p>
          ))}
          {cue.serif && cue.lines[0] === HER_NAME && (
            <div className="mt-4 h-px w-40 bg-gradient-to-r from-transparent via-pink-300/70 to-transparent" />
          )}
        </div>
      )}

      {/* AI analysis message — corner, elegant, never covering center */}
      <div
        className="absolute bottom-16 left-1/2 -translate-x-1/2"
        style={{ opacity: aiMsg ? 1 : 0, transition: 'opacity 0.5s ease' }}
      >
        {aiMsg && (
          <div className="flex items-center gap-3 rounded-full border border-pink-300/30 bg-white/5 backdrop-blur-md px-5 py-2.5">
            <span className="h-2 w-2 rounded-full bg-pink-300 animate-pulse shadow-[0_0_10px_4px_rgba(255,150,210,0.6)]" />
            <span className="text-white/90 text-sm sm:text-base tracking-[0.15em] uppercase font-light">
              {aiMsg}
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff8fcf"><path d="M12 21s-7-4.35-9.5-8.5C.5 9 2 5.5 5.5 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3C17 5.5 18.5 9 16.5 12.5 15 16.65 12 21 12 21z"/></svg>
          </div>
        )}
      </div>

      {/* Multiverse verification — top-left HUD */}
      <div
        className="absolute top-20 left-6 sm:left-10"
        style={{ opacity: universe ? 1 : 0, transition: 'opacity 0.3s ease' }}
      >
        {universe && (
          <div className="font-mono text-left">
            <p className="text-white/40 text-xs tracking-widest uppercase mb-1">Multiverse Scan</p>
            <p className="text-white/90 text-lg sm:text-2xl tracking-wide">Universe {universe.id}</p>
            <p className="text-pink-200/70 text-xs sm:text-sm tracking-wide mt-1">
              Searching For {HER_NAME}...
            </p>
            <p
              className="text-sm sm:text-base mt-1 tracking-wide flex items-center gap-2"
              style={{ opacity: universe.found ? 1 : 0.25, transition: 'opacity 0.2s' }}
            >
              <span className="text-pink-300 font-semibold">FOUND</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#ff8fcf"><path d="M12 21s-7-4.35-9.5-8.5C.5 9 2 5.5 5.5 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3C17 5.5 18.5 9 16.5 12.5 15 16.65 12 21 12 21z"/></svg>
              <span className="text-white/60">Would Choose Again.</span>
            </p>
          </div>
        )}
      </div>

      {/* End screen */}
      {ended && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-start sm:justify-center overflow-y-auto bg-black/95 text-center px-6 py-12 pointer-events-auto">
          <p className="text-white/40 tracking-[0.3em] text-xs uppercase mb-6">For my {PET_NAME.toLowerCase()}</p>
          <h2
            className="text-3xl sm:text-5xl font-light leading-snug mb-8"
            style={{
              fontFamily: 'Georgia, serif',
              background: 'linear-gradient(90deg,#ffd6a5,#fff,#ff8fcf)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Of all the people<br />in all the universes<br />across every timeline<br />you are still my favorite.
          </h2>
          <p className="text-pink-200/80 text-lg mb-10 flex items-center gap-2 justify-center">
            Happy Birthday
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#ff8fcf"><path d="M12 21s-7-4.35-9.5-8.5C.5 9 2 5.5 5.5 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3C17 5.5 18.5 9 16.5 12.5 15 16.65 12 21 12 21z"/></svg>
          </p>
          <button
            onClick={onReplay}
            className="px-8 py-3 rounded-full border border-white/25 text-white/85 tracking-[0.25em] text-xs uppercase hover:border-pink-300/60 transition"
          >
            Watch Again
          </button>

          {/* Interactive reply, saved to localStorage */}
          <ReplyBox />
        </div>
      )}
    </div>
  );
};

export default StoryOverlay;
