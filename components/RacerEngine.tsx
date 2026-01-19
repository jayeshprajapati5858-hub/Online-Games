
import React, { useRef, useEffect, useState } from 'react';
import { Vector, Obstacle, PowerUp } from '../types';
import { soundService } from '../services/soundService';

interface Props {
  onGameOver: (score: number) => void;
}

const RacerEngine: React.FC<Props> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const scoreRef = useRef(0);
  const [currentScore, setCurrentScore] = useState(0);
  const [playerHealth, setPlayerHealth] = useState(100);
  
  const playerPos = useRef<Vector>({ x: window.innerWidth / 2, y: window.innerHeight - 150 });
  const obstacles = useRef<Obstacle[]>([]);
  const powerUps = useRef<PowerUp[]>([]);
  const targetX = useRef(window.innerWidth / 2);
  const shake = useRef(0);

  const spawnObstacle = () => {
    const width = 60 + Math.random() * 100;
    obstacles.current.push({
      id: Math.random().toString(),
      pos: { x: Math.random() * (window.innerWidth - width), y: -100 },
      width: width,
      height: 30,
      speed: 7 + (scoreRef.current / 1000),
      color: '#ef4444'
    });
  };

  const spawnHealth = () => {
    powerUps.current.push({
      id: Math.random().toString(),
      pos: { x: Math.random() * (window.innerWidth - 40), y: -100 },
      radius: 15,
      type: 'HEALTH',
      life: 1.0
    });
  };

  const update = () => {
    // Player smooth movement
    playerPos.current.x += (targetX.current - playerPos.current.x) * 0.15;
    
    if (shake.current > 0) shake.current *= 0.9;

    // Update Obstacles
    obstacles.current.forEach((obs, idx) => {
      obs.pos.y += obs.speed;
      
      // Collision
      if (
        playerPos.current.x + 20 > obs.pos.x &&
        playerPos.current.x - 20 < obs.pos.x + obs.width &&
        playerPos.current.y + 30 > obs.pos.y &&
        playerPos.current.y - 30 < obs.pos.y + obs.height
      ) {
        setPlayerHealth(h => {
          const next = h - 25;
          if (next <= 0) onGameOver(scoreRef.current);
          return next;
        });
        shake.current = 15;
        soundService.playDamage();
        obstacles.current.splice(idx, 1);
      }

      if (obs.pos.y > window.innerHeight) {
        obstacles.current.splice(idx, 1);
        scoreRef.current += 10;
        setCurrentScore(scoreRef.current);
      }
    });

    // Update PowerUps
    powerUps.current.forEach((pu, idx) => {
      pu.pos.y += 6;
      const d = Math.sqrt((pu.pos.x - playerPos.current.x)**2 + (pu.pos.y - playerPos.current.y)**2);
      if (d < 40) {
        setPlayerHealth(h => Math.min(100, h + 20));
        soundService.playPowerUp();
        powerUps.current.splice(idx, 1);
      }
      if (pu.pos.y > window.innerHeight) powerUps.current.splice(idx, 1);
    });

    if (Math.random() < 0.03) spawnObstacle();
    if (Math.random() < 0.005) spawnHealth();

    draw();
    requestRef.current = requestAnimationFrame(update);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (shake.current > 0.1) ctx.translate((Math.random()-0.5)*shake.current, (Math.random()-0.5)*shake.current);

    // Background Cyber Road
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid lines for speed feel
    ctx.strokeStyle = '#1e1e1e';
    ctx.lineWidth = 2;
    for(let i=0; i<canvas.width; i+=100) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    const offset = (Date.now() / 10) % 100;
    for(let i=-100; i<canvas.height; i+=100) {
      ctx.beginPath(); ctx.moveTo(0, i+offset); ctx.lineTo(canvas.width, i+offset); ctx.stroke();
    }

    // Obstacles
    obstacles.current.forEach(obs => {
      ctx.fillStyle = obs.color;
      ctx.shadowBlur = 15; ctx.shadowColor = obs.color;
      ctx.fillRect(obs.pos.x, obs.pos.y, obs.width, obs.height);
    });

    // Powerups
    powerUps.current.forEach(pu => {
      ctx.fillStyle = '#4ade80';
      ctx.shadowBlur = 20; ctx.shadowColor = '#4ade80';
      ctx.beginPath(); ctx.arc(pu.pos.x, pu.pos.y, pu.radius, 0, Math.PI*2); ctx.fill();
    });

    // Player Vehicle
    const p = playerPos.current;
    ctx.fillStyle = '#3b82f6';
    ctx.shadowBlur = 20; ctx.shadowColor = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 40);
    ctx.lineTo(p.x - 25, p.y + 20);
    ctx.lineTo(p.x + 25, p.y + 20);
    ctx.closePath();
    ctx.fill();
    
    // Thrusters
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(p.x - 15, p.y + 20, 10, 10 + Math.random() * 10);
    ctx.fillRect(p.x + 5, p.y + 20, 10, 10 + Math.random() * 10);

    ctx.restore();
  };

  useEffect(() => {
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      targetX.current = e.touches[0].clientX;
    };
    window.addEventListener('touchstart', handleTouch, { passive: false });
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
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('touchmove', handleTouch);
      window.removeEventListener('resize', resize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div 
        className="pointer-events-none absolute inset-0 shadow-[inset_0_0_100px_rgba(220,38,38,1)]"
        style={{ opacity: (100 - playerHealth) / 100 * 0.8 }}
      />
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        <div>
          <div className="text-white font-orbitron text-[10px] opacity-70 tracking-widest uppercase">System Integrity</div>
          <div className="w-44 h-3 bg-zinc-900 rounded-full border border-zinc-700 overflow-hidden mt-1">
            <div className="h-full bg-blue-500 transition-all duration-200" style={{ width: `${playerHealth}%` }} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-zinc-500 font-orbitron text-[10px] uppercase">Distance</div>
          <div className="text-3xl font-orbitron font-bold text-white">{currentScore}m</div>
        </div>
      </div>
      <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none opacity-30">
        <div className="text-[10px] text-white font-orbitron uppercase tracking-[0.5em]">Slide to Steer</div>
      </div>
    </div>
  );
};

export default RacerEngine;
