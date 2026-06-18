import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PHOTOS, HER_NAME, AI_MESSAGES } from '@/lib/photos';
import { UNIVERSES, TOTAL_DURATION } from '@/lib/storyScript';
import { AudioPlayer } from '@/lib/audioPlayer';
import { AUDIO_FILE } from '@/lib/audioConfig';
import StoryOverlay from './StoryOverlay';

interface Star { x: number; y: number; z: number; s: number; c: string }
interface Photo {
  img: HTMLImageElement; loaded: boolean;
  x: number; y: number; z: number;
  bx: number; by: number; bz: number; // base/drift center
  hx: number; hy: number; hz: number; // heart target
  rot: number; rotSpeed: number; phase: number;
}

const PINK = '#ff8fcf';
const PURPLE = '#a06bff';
const ROSE = '#ffd6a5';

// heart parametric -> returns point on heart outline for t in [0,2pi]
function heartPoint(t: number, scale: number) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return { x: x * scale, y: -y * scale };
}

const CinematicUniverse: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ended, setEnded] = useState(false);

  const musicRef = useRef<AudioPlayer | null>(null);
  const rafRef = useRef<number>(0);
  const t0Ref = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  const starsRef = useRef<Star[]>([]);
  const photosRef = useRef<Photo[]>([]);
  const explosionRef = useRef<{ x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; c: string }[]>([]);

  // React-driven overlays
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [universe, setUniverse] = useState<{ id: string; found: boolean } | null>(null);
  const peakDoneRef = useRef(false);

  const setupWorld = useCallback(() => {
    // stars
    const stars: Star[] = [];
    for (let i = 0; i < 1400; i++) {
      const palette = [PINK, PURPLE, ROSE, '#ffffff', '#ffffff', '#cfe3ff'];
      stars.push({
        x: (Math.random() - 0.5) * 4000,
        y: (Math.random() - 0.5) * 4000,
        z: Math.random() * 6000,
        s: Math.random() * 1.6 + 0.3,
        c: palette[(Math.random() * palette.length) | 0],
      });
    }
    starsRef.current = stars;

    // photos
    const photos: Photo[] = PHOTOS.map((src, i) => {
      const img = new Image();
      const p: Photo = {
        img, loaded: false,
        x: 0, y: 0, z: 0, bx: 0, by: 0, bz: 0, hx: 0, hy: 0, hz: 0,
        rot: (Math.random() - 0.5) * 0.4,
        rotSpeed: (Math.random() - 0.5) * 0.0008,
        phase: Math.random() * Math.PI * 2,
      };
      img.onload = () => { p.loaded = true; };
      img.src = src;
      // base drift positions: spread through space ahead of camera path
      const ang = (i / PHOTOS.length) * Math.PI * 2;
      const radius = 420 + (i % 4) * 220;
      p.bx = Math.cos(ang) * radius + (Math.random() - 0.5) * 200;
      p.by = Math.sin(ang) * radius * 0.7 + (Math.random() - 0.5) * 160;
      p.bz = 1600 + i * 230 + Math.random() * 120;
      // heart target on outline
      const t = (i / PHOTOS.length) * Math.PI * 2;
      const hp = heartPoint(t, 16);
      p.hx = hp.x; p.hy = hp.y;
      p.x = p.bx; p.y = p.by; p.z = p.bz;
      return p;
    });
    photosRef.current = photos;
  }, []);

  const handleBegin = useCallback(async () => {
    if (started) return;
    setupWorld();
    setStarted(true);
    t0Ref.current = performance.now();
    musicRef.current = new AudioPlayer(AUDIO_FILE);
    try { await musicRef.current.start(); } catch (e) { /* ignore */ }
  }, [started, setupWorld]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      if (musicRef.current) next ? musicRef.current.mute() : musicRef.current.resume();
      return next;
    });
  }, []);

  const replay = useCallback(() => {
    setupWorld();
    setEnded(false);
    peakDoneRef.current = false;
    explosionRef.current = [];
    t0Ref.current = performance.now();
    if (musicRef.current) { musicRef.current.resume(); setMuted(false); }
  }, [setupWorld]);

  // pointer parallax
  useEffect(() => {
    const onMove = (cx: number, cy: number) => {
      const w = window.innerWidth, h = window.innerHeight;
      mouseRef.current.tx = (cx / w - 0.5) * 2;
      mouseRef.current.ty = (cy / h - 0.5) * 2;
    };
    const m = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const t = (e: TouchEvent) => { if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY); };
    window.addEventListener('mousemove', m);
    window.addEventListener('touchmove', t);
    return () => { window.removeEventListener('mousemove', m); window.removeEventListener('touchmove', t); };
  }, []);

  // main render loop
  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let W = 0, H = 0, DPR = 1;

    const resize = () => {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const FOV = 520;

    const loop = () => {
      const now = performance.now();
      const T = (now - t0Ref.current) / 1000; // seconds
      const cx = W / 2, cy = H / 2;

      // smooth mouse parallax
      const mu = mouseRef.current;
      mu.x += (mu.tx - mu.x) * 0.04;
      mu.y += (mu.ty - mu.y) * 0.04;
      const parX = mu.x * 60, parY = mu.y * 40;

      // ---- camera position along timeline ----
      // camZ progresses forward; varies speed per phase
      let camZ: number;
      if (T < 22) camZ = T * 16; // slow approach during opening
      else if (T < 45) camZ = 352 + (T - 22) * 95; // fast cosmic flight
      else if (T < 84) camZ = 352 + 23 * 95 + (T - 45) * 38; // photo galaxy slower
      else if (T < 100) camZ = 352 + 23 * 95 + 39 * 38 + (T - 84) * 10; // constellation, almost still
      else if (T < 120) camZ = 352 + 23 * 95 + 39 * 38 + 16 * 10 - (T - 100) * 30; // zoom out multiverse
      else camZ = 352 + 23 * 95 + 39 * 38 + 16 * 10 - 20 * 30 + (T - 120) * 6;

      // background gradient (deep space)
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, '#05020e');
      grd.addColorStop(0.5, '#0a0418');
      grd.addColorStop(1, '#050109');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      // nebula glows (parallax)
      const nebulae = [
        { x: cx - 300 + parX * 1.5, y: cy - 180 + parY, r: 460, c: 'rgba(150,80,255,0.20)' },
        { x: cx + 360 - parX, y: cy + 220 - parY * 0.6, r: 520, c: 'rgba(255,110,190,0.16)' },
        { x: cx + parX * 0.5, y: cy - 40, r: 380, c: 'rgba(120,150,255,0.10)' },
      ];
      const nebPulse = 1 + Math.sin(T * 0.5) * 0.05;
      nebulae.forEach((n) => {
        const r = n.r * nebPulse;
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r);
        g.addColorStop(0, n.c);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill();
      });

      // ---- stars (warp field) ----
      ctx.save();
      const stars = starsRef.current;
      for (let i = 0; i < stars.length; i++) {
        const st = stars[i];
        let dz = st.z - camZ;
        if (dz <= 1) { st.z += 6000; dz = st.z - camZ; }
        if (dz > 6000) { st.z -= 6000; dz = st.z - camZ; }
        const sc = FOV / dz;
        const sx = (st.x) * sc + cx + parX * (sc * 0.5);
        const sy = (st.y) * sc + cy + parY * (sc * 0.5);
        if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
        const size = st.s * sc * 3.2;
        const alpha = Math.min(1, sc * 2.2) * (0.5 + 0.5 * Math.sin(T * 2 + i));
        ctx.globalAlpha = Math.max(0.05, Math.min(1, alpha));
        ctx.fillStyle = st.c;
        ctx.beginPath(); ctx.arc(sx, sy, Math.max(0.4, size * 0.4), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = 1;

      // ---- opening anomaly star + explosion + name handled via timeline ----
      if (T < 22) {
        // pulsing central star approaching
        const appear = Math.min(1, T / 2);
        const pulse = 1 + Math.sin(T * 4) * 0.3;
        const starZ = 600 - T * 24; // moves closer
        const sc = FOV / Math.max(60, starZ);
        const r = 3 * sc * pulse * appear * 6;
        const gx = cx, gy = cy - 10;
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * 6);
        g.addColorStop(0, 'rgba(255,255,255,' + appear + ')');
        g.addColorStop(0.2, 'rgba(255,210,240,' + 0.8 * appear + ')');
        g.addColorStop(0.5, 'rgba(180,120,255,' + 0.35 * appear + ')');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, r * 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,' + appear + ')';
        ctx.beginPath(); ctx.arc(gx, gy, Math.max(2, r), 0, Math.PI * 2); ctx.fill();

        // trigger explosion once near name reveal
        if (T > 22 - 0.05 && explosionRef.current.length === 0) {
          // handled below at boundary
        }
      }

      // birth explosion at ~22s
      if (T >= 22 && explosionRef.current.length === 0 && !peakDoneRef.current) {
        for (let i = 0; i < 600; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = Math.random() * 9 + 2;
          const palette = [PINK, PURPLE, ROSE, '#ffffff'];
          explosionRef.current.push({
            x: cx, y: cy - 10, z: 0,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0,
            life: 1, c: palette[(Math.random() * palette.length) | 0],
          });
        }
      }
      // render + update explosion
      if (explosionRef.current.length) {
        ctx.save();
        for (const p of explosionRef.current) {
          p.x += p.vx; p.y += p.vy; p.vx *= 0.97; p.vy *= 0.97; p.life -= 0.01;
          if (p.life <= 0) continue;
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.c;
          ctx.beginPath(); ctx.arc(p.x, p.y, 2.2 * p.life + 0.4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore(); ctx.globalAlpha = 1;
        if (explosionRef.current.every((p) => p.life <= 0)) explosionRef.current = [];
      }

      // ---- photos ----
      const photos = photosRef.current;
      // determine constellation/heart blending factors
      const constBlend = Math.max(0, Math.min(1, (T - 80) / 6));   // photos settle into a plane web
      const heartBlend = Math.max(0, Math.min(1, (T - 122) / 12)); // photos to heart
      const heartScale = Math.min(W, H) * 0.045;

      // collect projected photo screen positions for constellation lines
      const projected: { x: number; y: number; on: boolean }[] = [];

      photos.forEach((p, i) => {
        p.rot += p.rotSpeed;
        // drift target (gentle orbit / breathing)
        const driftX = p.bx + Math.sin(T * 0.3 + p.phase) * 40;
        const driftY = p.by + Math.cos(T * 0.25 + p.phase) * 40;
        const driftZ = p.bz;

        // constellation target: arrange on a sphere-ish web facing camera near camZ+900
        const ca = (i / photos.length) * Math.PI * 2;
        const cr = 360 + (i % 3) * 120;
        const constX = Math.cos(ca) * cr;
        const constY = Math.sin(ca) * cr * 0.6;
        const constZ = camZ + 1000 + (i % 5) * 40;

        // heart target: outline point at z near camZ+1150
        const heartZ = camZ + 1150;

        // blend positions
        let tx = driftX, ty = driftY, tz = driftZ;
        if (constBlend > 0) {
          tx = driftX + (constX - driftX) * constBlend;
          ty = driftY + (constY - driftY) * constBlend;
          tz = driftZ + (constZ - driftZ) * constBlend;
        }
        if (heartBlend > 0) {
          tx = tx + (p.hx * heartScale - tx) * heartBlend;
          ty = ty + (p.hy * heartScale - ty) * heartBlend;
          tz = tz + (heartZ - tz) * heartBlend;
        }
        // ease toward target
        p.x += (tx - p.x) * 0.06;
        p.y += (ty - p.y) * 0.06;
        p.z += (tz - p.z) * 0.06;

        const dz = p.z - camZ;
        if (dz <= 30) { projected.push({ x: 0, y: 0, on: false }); return; }
        const sc = FOV / dz;
        const sx = p.x * sc + cx + parX * 0.6;
        const sy = p.y * sc + cy + parY * 0.6;
        projected.push({ x: sx, y: sy, on: true });

        if (!p.loaded) return;
        const baseW = 150 * sc;
        const iw = p.img.width || 3, ih = p.img.height || 4;
        const aspect = iw / ih;
        let dw = baseW, dh = baseW / aspect;
        if (dw > 360) { dw = 360; dh = dw / aspect; }

        // glow
        const glowAlpha = Math.min(0.6, sc * 1.2);
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(p.rot + Math.sin(T * 0.4 + p.phase) * 0.04);
        // soft glow behind
        const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, dw * 0.9);
        gg.addColorStop(0, `rgba(255,150,210,${glowAlpha})`);
        gg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.arc(0, 0, dw * 0.9, 0, Math.PI * 2); ctx.fill();
        // frame
        ctx.globalAlpha = Math.min(1, sc * 2.5);
        ctx.shadowColor = 'rgba(255,180,220,0.7)';
        ctx.shadowBlur = 24 * sc;
        try {
          ctx.drawImage(p.img, -dw / 2, -dh / 2, dw, dh);
        } catch (e) { /* ignore */ }
        ctx.shadowBlur = 0;
        // rose-gold border
        ctx.globalAlpha = Math.min(1, sc * 2.5) * 0.9;
        ctx.strokeStyle = 'rgba(255,214,165,0.85)';
        ctx.lineWidth = Math.max(1, 2 * sc * 2);
        ctx.strokeRect(-dw / 2, -dh / 2, dw, dh);
        ctx.restore();
        ctx.globalAlpha = 1;

        // emit subtle particle from photo
        if (Math.random() < 0.15 && sc > 0.05) {
          explosionRef.current.length < 1200 && explosionRef.current.push({
            x: sx + (Math.random() - 0.5) * dw, y: sy + (Math.random() - 0.5) * dh, z: 0,
            vx: (Math.random() - 0.5) * 0.6, vy: -Math.random() * 0.8, vz: 0,
            life: 0.7, c: ROSE,
          });
        }
      });

      // constellation lines between consecutive photos
      const lineAlpha = constBlend * (1 - heartBlend);
      if (lineAlpha > 0.02) {
        ctx.save();
        ctx.strokeStyle = `rgba(255,190,230,${0.35 * lineAlpha})`;
        ctx.lineWidth = 1;
        ctx.shadowColor = 'rgba(255,150,210,0.8)';
        ctx.shadowBlur = 8;
        for (let i = 0; i < projected.length; i++) {
          const a = projected[i];
          const b = projected[(i + 1) % projected.length];
          const c2 = projected[(i + 3) % projected.length];
          if (a.on && b.on) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
          if (a.on && c2.on) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c2.x, c2.y); ctx.stroke(); }
        }
        ctx.restore();
      }

      // heart glow aura when formed
      if (heartBlend > 0.3) {
        const ha = (heartBlend - 0.3) / 0.7;
        const r = Math.min(W, H) * 0.42;
        const g = ctx.createRadialGradient(cx + parX * 0.6, cy + parY * 0.6, 0, cx + parX * 0.6, cy + parY * 0.6, r);
        g.addColorStop(0, `rgba(255,120,190,${0.18 * ha})`);
        g.addColorStop(0.6, `rgba(160,90,255,${0.08 * ha})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx + parX * 0.6, cy + parY * 0.6, r, 0, Math.PI * 2); ctx.fill();
      }

      // music peak trigger at reveal
      if (T >= 122 && !peakDoneRef.current) {
        peakDoneRef.current = true;
        if (musicRef.current && !muted) musicRef.current.swellPeak();
      }

      // vignette
      const vg = ctx.createRadialGradient(cx, cy, H * 0.3, cx, cy, H * 0.8);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

      // ---- React overlay state driven by time ----
      // AI messages 50-80s
      if (T >= 50 && T <= 80) {
        const idx = Math.floor((T - 50) / 3) % AI_MESSAGES.length;
        const msg = AI_MESSAGES[idx];
        setAiMsg((prev) => (prev === msg ? prev : msg));
      } else {
        setAiMsg((prev) => (prev === null ? prev : null));
      }
      // universe verification 104-120s
      if (T >= 104 && T <= 120) {
        const step = Math.floor((T - 104) / 2);
        const u = UNIVERSES[step % UNIVERSES.length];
        const found = ((T - 104) % 2) > 0.9;
        setUniverse((prev) => (prev && prev.id === u && prev.found === found ? prev : { id: u, found }));
      } else {
        setUniverse((prev) => (prev === null ? prev : null));
      }

      // end fade
      if (T >= TOTAL_DURATION) {
        ctx.fillStyle = `rgba(0,0,0,${Math.min(1, (T - TOTAL_DURATION) / 4)})`;
        ctx.fillRect(0, 0, W, H);
        if (T >= TOTAL_DURATION + 4) { setEnded(true); }
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [started, muted]);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none" style={{ touchAction: 'none' }}>
      <canvas ref={canvasRef} className="absolute inset-0 block" />

      {/* Narration + scene overlays */}
      {started && (
        <StoryOverlay
          t0Ref={t0Ref}
          aiMsg={aiMsg}
          universe={universe}
          ended={ended}
          onReplay={replay}
        />
      )}

      {/* Music toggle */}
      {started && !ended && (
        <button
          onClick={toggleMute}
          aria-label="Toggle music"
          className="absolute top-5 right-5 z-30 h-11 w-11 rounded-full border border-white/20 bg-white/5 backdrop-blur-md flex items-center justify-center text-white/80 hover:bg-white/15 transition"
        >
          {muted ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
          )}
        </button>
      )}

      {/* Start gate */}
      {!started && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black text-center px-6">
          <div className="mb-10 h-2 w-2 rounded-full bg-white animate-pulse shadow-[0_0_30px_12px_rgba(255,255,255,0.6)]" />
          <p className="text-white/50 tracking-[0.35em] text-xs mb-3 uppercase">A message written in the stars</p>
          <h1 className="text-white/90 font-light text-2xl sm:text-3xl tracking-wide mb-10" style={{ fontFamily: 'Georgia, serif' }}>
            For {HER_NAME}
          </h1>
          <button
            onClick={handleBegin}
            className="group relative px-10 py-4 rounded-full border border-white/25 text-white/90 tracking-[0.3em] text-sm uppercase overflow-hidden hover:border-pink-300/60 transition"
          >
            <span className="relative z-10">Begin</span>
            <span className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-rose-300/20 opacity-0 group-hover:opacity-100 transition" />
          </button>
          <p className="text-white/30 text-[11px] mt-8 max-w-xs leading-relaxed">
            Best with sound on. Move your cursor to look around the universe.
          </p>
        </div>
      )}
    </div>
  );
};

export default CinematicUniverse;
