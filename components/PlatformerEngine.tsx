
import React, { useRef, useEffect, useState } from 'react';
import { Vector } from '../types';
import { soundService } from '../services/soundService';

interface Props {
  onGameOver: (score: number) => void;
}

interface GameObject {
  x: number;
  y: number;
  w: number;
  h: number;
  type?: string;
}

interface Enemy extends GameObject {
  vx: number;
  isDead: boolean;
  deadTimer: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

const GRAVITY = 0.65; 
const JUMP_FORCE = -18.0; 
const ACCEL = 0.8;
const FRICTION = 0.85;
const MAX_SPEED = 8.0;

const PlatformerEngine: React.FC<Props> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);

  const player = useRef({
    x: 100,
    y: 300,
    vx: 0,
    vy: 0,
    w: 38,
    h: 46,
    grounded: false,
    facingRight: true,
    squash: 1,
    stretch: 1,
    walkCycle: 0
  });

  const cameraX = useRef(0);
  const platforms = useRef<GameObject[]>([]);
  const enemies = useRef<Enemy[]>([]);
  const coins = useRef<{x: number, y: number, collected: boolean, anim: number}[]>([]);
  const particles = useRef<Particle[]>([]);
  
  const input = useRef({ left: false, right: false, jump: false });

  useEffect(() => {
    // Level Design
    platforms.current = [{ x: -1000, y: 520, w: 20000, h: 200 }]; // Main ground

    for (let i = 0; i < 60; i++) {
      const baseX = 800 + i * 500;
      const rand = Math.random();
      
      if (rand < 0.4) {
        platforms.current.push({ x: baseX, y: 380, w: 220, h: 30 });
        enemies.current.push({ x: baseX + 50, y: 338, vx: 2, w: 42, h: 42, isDead: false, deadTimer: 0 });
        coins.current.push({ x: baseX + 110, y: 300, collected: false, anim: i });
      } else if (rand < 0.7) {
        platforms.current.push({ x: baseX, y: 430, w: 80, h: 90, type: 'pipe' });
        enemies.current.push({ x: baseX + 250, y: 478, vx: -3, w: 42, h: 42, isDead: false, deadTimer: 0 });
        coins.current.push({ x: baseX + 40, y: 350, collected: false, anim: i });
      } else {
        const bridgeY = 320;
        platforms.current.push({ x: baseX, y: bridgeY, w: 450, h: 35 });
        enemies.current.push({ x: baseX + 100, y: bridgeY - 42, vx: 1.5, w: 42, h: 42, isDead: false, deadTimer: 0 });
        for(let j=0; j<4; j++) {
            coins.current.push({ x: baseX + 50 + j*100, y: bridgeY - 50, collected: false, anim: j });
        }
      }
    }
  }, []);

  const createParticles = (x: number, y: number, color: string, count = 5) => {
    for (let i = 0; i < count; i++) {
      particles.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1.0, color, size: 2 + Math.random() * 4
      });
    }
  };

  const update = () => {
    const p = player.current;

    // Movement
    if (input.current.left) {
        p.vx -= ACCEL;
        p.walkCycle += 0.2;
    }
    if (input.current.right) {
        p.vx += ACCEL;
        p.walkCycle += 0.2;
    }
    if (!input.current.left && !input.current.right) {
        p.vx *= FRICTION;
        p.walkCycle = 0;
    }

    p.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, p.vx));

    if (input.current.jump && p.grounded) {
      p.vy = JUMP_FORCE;
      p.grounded = false;
      p.stretch = 1.5; p.squash = 0.5;
      soundService.playShoot();
      createParticles(p.x + p.w / 2, p.y + p.h, "#fff", 10);
    }
    
    if (!input.current.jump && p.vy < -7) p.vy *= 0.5;

    p.vy += GRAVITY;
    p.x += p.vx;
    p.y += p.vy;

    p.stretch += (1 - p.stretch) * 0.15;
    p.squash += (1 - p.squash) * 0.15;

    if (Math.abs(p.vx) > 0.1) p.facingRight = p.vx > 0;

    const prevGrounded = p.grounded;
    p.grounded = false;

    // Collisions
    platforms.current.forEach(plat => {
      if (p.x < plat.x + plat.w && p.x + p.w > plat.x && p.y + p.h > plat.y && p.y < plat.y + plat.h) {
         if (p.vy >= 0 && p.y + p.h - p.vy <= plat.y + 15) {
            p.y = plat.y - p.h;
            p.vy = 0;
            p.grounded = true;
            if (!prevGrounded) {
               p.squash = 0.7; p.stretch = 1.3;
               createParticles(p.x + p.w / 2, p.y + p.h, "#fff", 5);
            }
         } else if (p.vy < 0 && p.y - p.vy >= plat.y + plat.h - 15) {
            p.y = plat.y + plat.h;
            p.vy = 0;
         }
      }
    });

    // Enemies with Patrolling logic
    enemies.current.forEach((en) => {
      if (en.isDead) { en.deadTimer++; return; }
      
      en.x += en.vx;

      // Enemy platform edge detection and wall bouncing
      let onPlatform = false;
      platforms.current.forEach(plat => {
         // Wall collision
         if (en.x < plat.x + plat.w && en.x + en.w > plat.x && en.y + en.h > plat.y && en.y < plat.y + plat.h) {
            if (en.type !== 'pipe') en.vx *= -1;
         }
         // Foot sensing to stay on platform
         if (en.x + en.w/2 > plat.x && en.x + en.w/2 < plat.x + plat.w && Math.abs(en.y + en.h - plat.y) < 5) {
            onPlatform = true;
         }
      });

      // Simple edge bounce if it's on a small floating platform
      if (onPlatform) {
         const leftFoot = en.x;
         const rightFoot = en.x + en.w;
         let leftPlat = false;
         let rightPlat = false;
         platforms.current.forEach(pl => {
            if (leftFoot > pl.x && leftFoot < pl.x + pl.w && Math.abs(en.y + en.h - pl.y) < 10) leftPlat = true;
            if (rightFoot > pl.x && rightFoot < pl.x + pl.w && Math.abs(en.y + en.h - pl.y) < 10) rightPlat = true;
         });
         if (!leftPlat || !rightPlat) en.vx *= -1;
      }

      // Player Interaction
      if (p.x < en.x + en.w && p.x + p.w > en.x && p.y < en.y + en.h && p.y + p.h > en.y) {
        if (p.vy > 0 && p.y + p.h < en.y + 25) {
          en.isDead = true;
          p.vy = -14;
          scoreRef.current += 100;
          setScore(scoreRef.current);
          soundService.playExplosion();
          createParticles(en.x + en.w/2, en.y + en.h/2, "#FF4500", 15);
        } else {
          onGameOver(scoreRef.current);
        }
      }
    });

    // Coins
    coins.current.forEach(c => {
      if (c.collected) return;
      c.anim += 0.1;
      const hoverY = Math.sin(c.anim) * 8;
      if (Math.abs(p.x - c.x) < 50 && Math.abs(p.y - (c.y + hoverY)) < 60) {
        c.collected = true;
        scoreRef.current += 50;
        setScore(scoreRef.current);
        soundService.playPowerUp();
        createParticles(c.x, c.y, "#FFD700", 12);
      }
    });

    particles.current.forEach((part, idx) => {
      part.x += part.vx; part.y += part.vy; part.life -= 0.03;
      if (part.life <= 0) particles.current.splice(idx, 1);
    });

    if (p.y > 1000) onGameOver(scoreRef.current);

    const targetCamX = p.x - window.innerWidth / 3;
    cameraX.current += (targetCamX - cameraX.current) * 0.12;

    draw();
    requestRef.current = requestAnimationFrame(update);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = "#1e3799";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-cameraX.current, 0);

    // Background
    ctx.fillStyle = "#0a3d62";
    for(let i=0; i<30; i++) {
        const hillX = i * 900 - (cameraX.current * 0.2) % 900;
        ctx.beginPath(); ctx.arc(hillX + 450, 560, 300, 0, Math.PI, true); ctx.fill();
    }

    platforms.current.forEach(plat => {
      if (plat.type === 'pipe') {
        ctx.fillStyle = "#009432"; ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = "#a3cb38"; ctx.fillRect(plat.x - 8, plat.y, plat.w + 16, 28);
      } else {
        ctx.fillStyle = "#747d8c"; ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = "#2ed573"; ctx.fillRect(plat.x, plat.y, plat.w, 15);
      }
    });

    coins.current.forEach(c => {
      if (c.collected) return;
      ctx.save();
      const hoverY = Math.sin(c.anim) * 8;
      ctx.translate(c.x, c.y + hoverY);
      ctx.scale(Math.cos(c.anim * 1.5), 1);
      ctx.fillStyle = "#f1c40f";
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    });

    enemies.current.forEach(en => {
      if (en.isDead && en.deadTimer < 15) {
        ctx.fillStyle = "#ffa502"; ctx.fillRect(en.x - 10, en.y + en.h - 8, en.w + 20, 8);
        return;
      }
      if (en.isDead) return;
      ctx.fillStyle = "#2f3542";
      ctx.beginPath(); ctx.roundRect(en.x, en.y, en.w, en.h, 12); ctx.fill();
      ctx.fillStyle = "white"; 
      ctx.fillRect(en.x + 8, en.y + 10, 6, 12); 
      ctx.fillRect(en.x + en.w - 14, en.y + 10, 6, 12);
      // Feet for enemies
      ctx.fillStyle = "#000";
      ctx.fillRect(en.x + 5, en.y + en.h - 5, 10, 5);
      ctx.fillRect(en.x + en.w - 15, en.y + en.h - 5, 10, 5);
    });

    // STYLIZED PLAYER
    const p = player.current;
    ctx.save();
    ctx.translate(p.x + p.w/2, p.y + p.h/2);
    if (!p.facingRight) ctx.scale(-1, 1);
    ctx.scale(p.stretch, p.squash);
    
    const legOffset = Math.sin(p.walkCycle) * 12;
    ctx.fillStyle = "#2f3542";
    ctx.fillRect(-14, p.h/2 - 10, 10, 12 + (p.vx !== 0 ? legOffset : 0)); // L-Leg
    ctx.fillRect(4, p.h/2 - 10, 10, 12 + (p.vx !== 0 ? -legOffset : 0)); // R-Leg

    ctx.fillStyle = "#ff4757"; // Suit
    ctx.beginPath(); ctx.roundRect(-p.w/2, -p.h/2 + 5, p.w, p.h - 15, 12); ctx.fill();
    
    ctx.fillStyle = "#ff4757"; // Arms
    const armAngle = p.vy < 0 ? -1.2 : (p.vx !== 0 ? Math.sin(p.walkCycle) : 0.2);
    ctx.save(); ctx.rotate(armAngle); ctx.fillRect(p.w/2 - 5, -5, 14, 7); ctx.restore();

    ctx.fillStyle = "#ffeaa7"; // Head
    ctx.beginPath(); ctx.arc(0, -22, 19, 0, Math.PI*2); ctx.fill();
    
    ctx.fillStyle = "black"; // Eyes
    ctx.beginPath(); ctx.arc(9, -24, 3.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(-1, -24, 3.5, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "black"; ctx.lineWidth = 2; // Mouth
    ctx.beginPath(); ctx.arc(4, -15, 5, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    
    ctx.fillStyle = "#ff4757"; // Hat
    ctx.fillRect(-24, -42, 48, 14); ctx.fillRect(-24, -34, 55, 6);
    ctx.restore();

    ctx.restore();

    // Score UI
    ctx.fillStyle = "white";
    ctx.font = "bold 28px Orbitron";
    ctx.shadowBlur = 10; ctx.shadowColor = "black";
    ctx.fillText(`WORLD 1-1`, 40, 60);
    ctx.fillStyle = "#f1c40f";
    ctx.fillText(`SCORE: ${score.toString().padStart(6, '0')}`, 40, 100);
  };

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      for(let i=0; i<e.touches.length; i++) {
        const t = e.touches[i];
        if (t.clientX < window.innerWidth / 3) input.current.left = true;
        else if (t.clientX < (window.innerWidth / 3) * 2) input.current.right = true;
        else input.current.jump = true;
      }
    };
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      input.current.left = false; input.current.right = false; input.current.jump = false;
      for(let i=0; i<e.touches.length; i++) {
        const t = e.touches[i];
        if (t.clientX < window.innerWidth / 3) input.current.left = true;
        else if (t.clientX < (window.innerWidth / 3) * 2) input.current.right = true;
        else input.current.jump = true;
      }
    };
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    const resize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', resize);
    resize();
    requestRef.current = requestAnimationFrame(update);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(requestRef.current!);
    };
  }, [score]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-900">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div className="absolute inset-x-0 bottom-0 pointer-events-none flex items-end justify-between p-10">
        <div className="flex gap-6">
          <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-white text-4xl border-4 transition-all ${input.current.left ? 'bg-white/40 border-white' : 'bg-black/20 border-white/40'}`}>←</div>
          <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-white text-4xl border-4 transition-all ${input.current.right ? 'bg-white/40 border-white' : 'bg-black/20 border-white/40'}`}>→</div>
        </div>
        <div className={`w-32 h-32 rounded-full flex items-center justify-center text-white font-black text-2xl border-6 transition-all ${input.current.jump ? 'bg-red-500/60 border-white' : 'bg-red-900/40 border-white/50'}`}>JUMP</div>
      </div>
    </div>
  );
};

export default PlatformerEngine;
