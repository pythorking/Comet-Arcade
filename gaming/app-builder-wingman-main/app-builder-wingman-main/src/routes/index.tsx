import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sky Islands Jump — Doodle Jump Game" },
      { name: "description", content: "A cozy sky-islands doodle jump game. Bounce between floating islands and climb as high as you can." },
      { property: "og:title", content: "Sky Islands Jump" },
      { property: "og:description", content: "Bounce between floating islands and climb as high as you can." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});

const W = 400;
const H = 640;
const GRAVITY = 0.35;
const JUMP_V = -12;
const MOVE_SPEED = 5;
const PLAYER_W = 40;
const PLAYER_H = 40;
const PLATFORM_W = 70;
const PLATFORM_H = 16;
const PLATFORM_COUNT = 8;

type Platform = { x: number; y: number; moving: boolean; dir: number; broken: boolean; used: boolean };

function makePlatforms(): Platform[] {
  const plats: Platform[] = [];
  const gap = H / PLATFORM_COUNT;
  for (let i = 0; i < PLATFORM_COUNT; i++) {
    plats.push({
      x: Math.random() * (W - PLATFORM_W),
      y: H - i * gap - 20,
      moving: false,
      dir: 1,
      broken: false,
      used: false,
    });
  }
  return plats;
}

function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  const stateRef = useRef({
    px: W / 2 - PLAYER_W / 2,
    py: H - 120,
    vx: 0,
    vy: 0,
    keys: { left: false, right: false },
    platforms: makePlatforms(),
    scrollY: 0,
    facing: 1,
    dead: false,
  });

  const reset = useCallback(() => {
    stateRef.current = {
      px: W / 2 - PLAYER_W / 2,
      py: H - 120,
      vx: 0,
      vy: JUMP_V,
      keys: { left: false, right: false },
      platforms: makePlatforms(),
      scrollY: 0,
      facing: 1,
      dead: false,
    };
    setScore(0);
    setGameOver(false);
    setStarted(true);
  }, []);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("sky-islands-best") : null;
    if (stored) setBest(parseInt(stored, 10));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") stateRef.current.keys.left = down;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") stateRef.current.keys.right = down;
      if (down && (e.key === " " || e.key === "Enter") && (gameOver || !started)) reset();
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [gameOver, started, reset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let running = true;

    const loop = () => {
      const s = stateRef.current;

      if (started && !s.dead) {
        // input
        if (s.keys.left) { s.vx = -MOVE_SPEED; s.facing = -1; }
        else if (s.keys.right) { s.vx = MOVE_SPEED; s.facing = 1; }
        else s.vx = 0;

        // physics
        s.vy += GRAVITY;
        s.px += s.vx;
        s.py += s.vy;

        // wrap horizontally
        if (s.px + PLAYER_W < 0) s.px = W;
        if (s.px > W) s.px = -PLAYER_W;

        // platform collisions (only when falling)
        if (s.vy > 0) {
          for (const p of s.platforms) {
            if (
              s.px + PLAYER_W > p.x &&
              s.px < p.x + PLATFORM_W &&
              s.py + PLAYER_H > p.y &&
              s.py + PLAYER_H < p.y + PLATFORM_H + s.vy
            ) {
              s.vy = JUMP_V;
            }
          }
        }

        // scroll world when player above middle
        if (s.py < H / 2) {
          const dy = H / 2 - s.py;
          s.py = H / 2;
          s.scrollY += dy;
          for (const p of s.platforms) {
            p.y += dy;
            if (p.y > H) {
              p.y = 0;
              p.x = Math.random() * (W - PLATFORM_W);
              p.moving = Math.random() < 0.15 + Math.min(0.3, s.scrollY / 5000);
              p.dir = Math.random() < 0.5 ? -1 : 1;
            }
          }
          setScore(Math.floor(s.scrollY));
        }

        // moving platforms
        for (const p of s.platforms) {
          if (p.moving) {
            p.x += p.dir * 1.5;
            if (p.x < 0) { p.x = 0; p.dir = 1; }
            if (p.x + PLATFORM_W > W) { p.x = W - PLATFORM_W; p.dir = -1; }
          }
        }

        // death
        if (s.py > H) {
          s.dead = true;
          setGameOver(true);
          setBest((b) => {
            const nb = Math.max(b, Math.floor(s.scrollY));
            if (typeof window !== "undefined") localStorage.setItem("sky-islands-best", String(nb));
            return nb;
          });
        }
      }

      // draw
      // sky gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#a8d8ff");
      grad.addColorStop(1, "#e6f4ff");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // distant clouds (parallax on scroll)
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      const cloudOff = (s.scrollY * 0.2) % 200;
      for (let i = 0; i < 5; i++) {
        const cy = ((i * 140 + cloudOff) % (H + 100)) - 50;
        const cx = (i * 97) % W;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 40, 14, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 30, cy - 6, 26, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // platforms as sky islands
      for (const p of s.platforms) {
        // grass top
        ctx.fillStyle = "#5cc76f";
        ctx.beginPath();
        ctx.ellipse(p.x + PLATFORM_W / 2, p.y + 6, PLATFORM_W / 2, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // rock bottom
        ctx.fillStyle = "#8a6a4a";
        ctx.beginPath();
        ctx.moveTo(p.x + 4, p.y + 8);
        ctx.lineTo(p.x + PLATFORM_W - 4, p.y + 8);
        ctx.lineTo(p.x + PLATFORM_W / 2 + 10, p.y + 22);
        ctx.lineTo(p.x + PLATFORM_W / 2, p.y + 28);
        ctx.lineTo(p.x + PLATFORM_W / 2 - 10, p.y + 22);
        ctx.closePath();
        ctx.fill();
      }

      // player
      ctx.save();
      ctx.translate(s.px + PLAYER_W / 2, s.py + PLAYER_H / 2);
      // body
      ctx.fillStyle = "#ff7a59";
      ctx.beginPath();
      ctx.arc(0, 0, PLAYER_W / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      // eye
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(s.facing * 6, -4, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.arc(s.facing * 8, -4, 3, 0, Math.PI * 2);
      ctx.fill();
      // feet
      ctx.fillStyle = "#3a2a1a";
      ctx.fillRect(-10, PLAYER_H / 2 - 6, 8, 6);
      ctx.fillRect(2, PLAYER_H / 2 - 6, 8, 6);
      ctx.restore();

      if (!started) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = "bold 32px system-ui, sans-serif";
        ctx.fillText("Sky Islands Jump", W / 2, H / 2 - 40);
        ctx.font = "16px system-ui, sans-serif";
        ctx.fillText("Arrow keys or A/D to move", W / 2, H / 2);
        ctx.fillText("Wraps around the edges", W / 2, H / 2 + 22);
        ctx.font = "bold 18px system-ui, sans-serif";
        ctx.fillText("Press Space to start", W / 2, H / 2 + 60);
      }

      if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = "bold 36px system-ui, sans-serif";
        ctx.fillText("You fell!", W / 2, H / 2 - 30);
        ctx.font = "20px system-ui, sans-serif";
        ctx.fillText(`Score: ${Math.floor(s.scrollY)}`, W / 2, H / 2 + 4);
        ctx.fillText(`Best: ${best}`, W / 2, H / 2 + 30);
        ctx.font = "bold 18px system-ui, sans-serif";
        ctx.fillText("Press Space to play again", W / 2, H / 2 + 68);
      }

      if (running) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(raf); };
  }, [started, gameOver, best]);

  // touch controls
  const touchMove = (dir: "left" | "right" | "none") => {
    stateRef.current.keys.left = dir === "left";
    stateRef.current.keys.right = dir === "right";
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-sky-300 to-sky-100 p-4">
      <h1 className="text-2xl font-bold text-slate-800 drop-shadow-sm">Sky Islands Jump</h1>
      <div className="flex gap-6 text-slate-800 font-semibold">
        <div>Score: {score}</div>
        <div>Best: {best}</div>
      </div>
      <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/50">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block bg-sky-200 touch-none"
          onClick={() => { if (!started || gameOver) reset(); }}
        />
      </div>
      <div className="flex gap-3 md:hidden">
        <button
          onTouchStart={() => touchMove("left")}
          onTouchEnd={() => touchMove("none")}
          className="rounded-xl bg-white/80 px-6 py-4 font-bold shadow"
        >◀</button>
        <button
          onTouchStart={() => touchMove("right")}
          onTouchEnd={() => touchMove("none")}
          className="rounded-xl bg-white/80 px-6 py-4 font-bold shadow"
        >▶</button>
      </div>
      <p className="text-sm text-slate-700">Arrow keys / A D to move · Space to {gameOver ? "restart" : "start"}</p>
    </div>
  );
}
