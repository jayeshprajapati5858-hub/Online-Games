
import React, { useRef, useEffect, useState } from 'react';
import { Vector, Projectile } from '../types';
import { soundService } from '../services/soundService';

interface Props {
  onGameOver: (score: number) => void;
}

const CosmicEngine: React.FC<Props> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const [score, setScore] = useState(0);
  const playerX = useRef(window.innerWidth / 2);
  const bullets = useRef<Projectile[]>([]);
  const enemies = useRef<{x: number, y: number, r: number}[]>([]);
  const lastShot = useRef(0);

  const update = () => {
    const now = Date.now();
    if (now - lastShot.current > 200) {
      bullets.current.push({
        id: Math.random().toString(),
        pos: { x: playerX.current, y: window.innerHeight - 80 },
        velocity: { x: 0, y: -10 },
        damage: 10,
        color: '#fbbf24',
        ownerId: 'player'
      });
      lastShot.current = now;
      soundService.playShoot();
    }

    bullets.current.forEach((b, bIdx) => {
      b.pos.y += b.velocity.y;
      if (b.pos.y < 0) bullets.current.splice(bIdx, 1);
    });

    enemies.current.forEach((en, eIdx) => {
      en.y += 3 + (score / 1000);
      
      // Bullet collision
      bullets.current.forEach((b, bIdx) => {
        const d = Math.sqrt((b.pos.x - en.x)**2 + (b.pos.y - en.y)**2);
        if (d < en.r) {
          enemies.current.splice(eIdx, 1);
          bullets.current.splice(bIdx, 1);
          setScore(s => s + 50);
          soundService.playExplosion();
        }
      });

      // Player collision
      const distToPlayer = Math.sqrt((en.x - playerX.current)**2 + (en.y - (window.innerHeight - 80))**2);
      if (distToPlayer < en.r + 20) {
        onGameOver(score);
      }

      if (en.y > window.innerHeight) {
        onGameOver(score);
      }
    });

    if (Math.random() < 0.03) enemies.current.push({
      x: Math.random() * window.innerWidth,
      y: -50,
      r: 20 + Math.random() * 20
    });

    draw();
    requestRef.current = requestAnimationFrame(update);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stars
    ctx.fillStyle = '#fff';
    for(let i=0; i<50; i++) {
        ctx.globalAlpha = Math.random();
        ctx.fillRect(Math.random()*canvas.width, Math.random()*canvas.height, 2, 2);
    }
    ctx.globalAlpha = 1;

    // Ship
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(playerX.current, window.innerHeight - 100);
    ctx.lineTo(playerX.current - 20, window.innerHeight - 60);
    ctx.lineTo(playerX.current + 20, window.innerHeight - 60);
    ctx.fill();

    // Enemies
    ctx.fillStyle = '#ef4444';
    enemies.current.forEach(en => {
      ctx.beginPath(); ctx.arc(en.x, en.y, en.r, 0, Math.PI*2); ctx.fill();
    });

    // Bullets
    ctx.fillStyle = '#fbbf24';
    bullets.current.forEach(b => {
      ctx.fillRect(b.pos.x - 2, b.pos.y, 4, 10);
    });
  };

  useEffect(() => {
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      playerX.current = e.touches[0].clientX;
    };
    window.addEventListener('touchmove', handleTouch, { passive: false });
    
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
      window.removeEventListener('touchmove', handleTouch);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(requestRef.current!);
    };
  }, [score]);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="block" />
      <div className="absolute top-10 right-10 text-white font-orbitron text-2xl font-bold">
        SCORE: {score}
      </div>
    </div>
  );
};

export default CosmicEngine;
