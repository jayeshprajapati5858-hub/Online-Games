
import React, { useRef, useEffect, useState } from 'react';
import { Vector } from '../types';
import { soundService } from '../services/soundService';

interface Props {
  onGameOver: (score: number) => void;
}

const GravityEngine: React.FC<Props> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const [score, setScore] = useState(0);
  
  const player = useRef({
    y: 0,
    vy: 0,
    gravity: 0.8,
    isTop: false,
    width: 30,
    height: 30
  });

  const obstacles = useRef<{x: number, y: number, w: number, h: number}[]>([]);
  const gameSpeed = useRef(6);

  const spawnObstacle = () => {
    const isTopObs = Math.random() > 0.5;
    const h = 40 + Math.random() * 60;
    obstacles.current.push({
      x: window.innerWidth,
      y: isTopObs ? 0 : window.innerHeight - h,
      w: 30,
      h: h
    });
  };

  const update = () => {
    const p = player.current;
    p.vy += p.isTop ? -p.gravity : p.gravity;
    p.y += p.vy;

    // Constrain player
    if (p.y < 0) { p.y = 0; p.vy = 0; }
    if (p.y > window.innerHeight - p.height) { p.y = window.innerHeight - p.height; p.vy = 0; }

    obstacles.current.forEach((obs, idx) => {
      obs.x -= gameSpeed.current;
      
      // Collision
      if (
        obs.x < 100 + p.width &&
        obs.x + obs.w > 100 &&
        p.y < obs.y + obs.h &&
        p.y + p.height > obs.y
      ) {
        soundService.playDamage();
        onGameOver(Math.floor(score));
      }

      if (obs.x < -100) obstacles.current.splice(idx, 1);
    });

    if (Math.random() < 0.02) spawnObstacle();
    setScore(s => s + 0.1);
    gameSpeed.current += 0.001;

    draw();
    requestRef.current = requestAnimationFrame(update);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Obstacles
    ctx.fillStyle = '#f87171';
    obstacles.current.forEach(obs => {
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    });

    // Player
    ctx.fillStyle = '#a855f7';
    ctx.shadowBlur = 15; ctx.shadowColor = '#a855f7';
    ctx.fillRect(100, player.current.y, player.current.width, player.current.height);
    ctx.shadowBlur = 0;
  };

  useEffect(() => {
    const handleAction = () => {
      player.current.isTop = !player.current.isTop;
      soundService.playShoot();
    };
    window.addEventListener('touchstart', handleAction);
    
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
      window.removeEventListener('touchstart', handleAction);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(requestRef.current!);
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="block" />
      <div className="absolute top-10 left-1/2 -translate-x-1/2 text-white font-orbitron text-4xl font-bold">
        {Math.floor(score)}
      </div>
      <div className="absolute bottom-10 left-0 right-0 text-center text-zinc-500 font-orbitron text-[10px] uppercase tracking-widest opacity-50">
        Tap to Flip Gravity
      </div>
    </div>
  );
};

export default GravityEngine;
