
import React, { useRef, useEffect, useState } from 'react';
import { Vector, Projectile, PowerUp, WeaponType } from '../types';
import { soundService } from '../services/soundService';

interface Props {
  onGameOver: (score: number) => void;
}

const MAP_SIZE = 2000;
const INITIAL_ZONE_RADIUS = 1200;

const BattleEngine: React.FC<Props> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // Game State
  const [playerHealth, setPlayerHealth] = useState(100);
  const [aliveCount, setAliveCount] = useState(20);
  const [kills, setKills] = useState(0);
  const [weapon, setWeapon] = useState<WeaponType>(WeaponType.RIFLE);
  const [zoneRadius, setZoneRadius] = useState(INITIAL_ZONE_RADIUS);

  // Refs for logic (to avoid re-renders)
  const playerPos = useRef<Vector>({ x: MAP_SIZE / 2, y: MAP_SIZE / 2 });
  const playerAngle = useRef(0);
  const enemies = useRef<any[]>([]);
  const projectiles = useRef<Projectile[]>([]);
  const powerUps = useRef<PowerUp[]>([]);
  const lastShotTime = useRef(0);
  const joystickStart = useRef<Vector | null>(null);
  const joystickCurr = useRef<Vector | null>(null);
  const isFiring = useRef(false);
  const zoneCenter = useRef<Vector>({ x: MAP_SIZE / 2, y: MAP_SIZE / 2 });

  // Initialize Battle
  useEffect(() => {
    // Spawn Bots
    for (let i = 0; i < 19; i++) {
      enemies.current.push({
        id: 'bot-' + i,
        pos: { x: Math.random() * MAP_SIZE, y: Math.random() * MAP_SIZE },
        health: 100,
        angle: Math.random() * Math.PI * 2,
        target: { x: Math.random() * MAP_SIZE, y: Math.random() * MAP_SIZE },
        lastShot: 0,
        isDead: false
      });
    }

    // Spawn Loot
    for (let i = 0; i < 30; i++) {
      powerUps.current.push({
        id: 'loot-' + i,
        pos: { x: Math.random() * MAP_SIZE, y: Math.random() * MAP_SIZE },
        radius: 15,
        type: Math.random() > 0.5 ? 'HEALTH' : (Math.random() > 0.5 ? 'RIFLE' : 'SHOTGUN'),
        life: 1.0
      });
    }
  }, []);

  const update = () => {
    // 1. Player Movement
    if (joystickStart.current && joystickCurr.current) {
      const dx = joystickCurr.current.x - joystickStart.current.x;
      const dy = joystickCurr.current.y - joystickStart.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) {
        const moveSpeed = 5;
        playerPos.current.x += (dx / dist) * moveSpeed;
        playerPos.current.y += (dy / dist) * moveSpeed;
        if (!isFiring.current) playerAngle.current = Math.atan2(dy, dx);
      }
    }

    // 2. Zone Logic
    const currentZoneR = zoneRadius - 0.15;
    if (currentZoneR > 100) setZoneRadius(currentZoneR);
    
    const distToZoneCenter = Math.sqrt(
      (playerPos.current.x - zoneCenter.current.x)**2 + 
      (playerPos.current.y - zoneCenter.current.y)**2
    );
    if (distToZoneCenter > currentZoneR) {
      setPlayerHealth(h => {
        const next = h - 0.05;
        if (next <= 0) onGameOver(kills * 100);
        return next;
      });
    }

    // 3. Projectiles
    projectiles.current.forEach((p, idx) => {
      p.pos.x += p.velocity.x;
      p.pos.y += p.velocity.y;
      
      // Hit Player?
      if (p.ownerId !== 'player') {
         const d = Math.sqrt((p.pos.x - playerPos.current.x)**2 + (p.pos.y - playerPos.current.y)**2);
         if (d < 20) {
           setPlayerHealth(h => {
             const next = h - p.damage;
             if (next <= 0) onGameOver(kills * 100);
             return next;
           });
           projectiles.current.splice(idx, 1);
           soundService.playDamage();
         }
      } else {
        // Hit Enemy?
        enemies.current.forEach((en) => {
          if (en.isDead) return;
          const d = Math.sqrt((p.pos.x - en.pos.x)**2 + (p.pos.y - en.pos.y)**2);
          if (d < 20) {
            en.health -= p.damage;
            projectiles.current.splice(idx, 1);
            if (en.health <= 0) {
              en.isDead = true;
              setKills(k => k + 1);
              setAliveCount(c => c - 1);
              soundService.playExplosion();
            }
          }
        });
      }

      if (Math.abs(p.pos.x) > MAP_SIZE || Math.abs(p.pos.y) > MAP_SIZE) projectiles.current.splice(idx, 1);
    });

    // 4. Enemy AI
    enemies.current.forEach(en => {
      if (en.isDead) return;
      
      const dx = en.target.x - en.pos.x;
      const dy = en.target.y - en.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 10) {
        en.target = { x: Math.random() * MAP_SIZE, y: Math.random() * MAP_SIZE };
      } else {
        en.pos.x += (dx / dist) * 2;
        en.pos.y += (dy / dist) * 2;
        en.angle = Math.atan2(dy, dx);
      }

      // Shoot player if close
      const distToPlayer = Math.sqrt((en.pos.x - playerPos.current.x)**2 + (en.pos.y - playerPos.current.y)**2);
      if (distToPlayer < 400 && Date.now() - en.lastShot > 1500) {
        const angle = Math.atan2(playerPos.current.y - en.pos.y, playerPos.current.x - en.pos.x);
        projectiles.current.push({
          id: Math.random().toString(),
          pos: { ...en.pos },
          velocity: { x: Math.cos(angle) * 10, y: Math.sin(angle) * 10 },
          damage: 10,
          color: '#ff0000',
          ownerId: en.id
        });
        en.lastShot = Date.now();
      }
    });

    // 5. Loot
    powerUps.current.forEach((pu, idx) => {
      const d = Math.sqrt((pu.pos.x - playerPos.current.x)**2 + (pu.pos.y - playerPos.current.y)**2);
      if (d < 30) {
        if (pu.type === 'HEALTH') setPlayerHealth(h => Math.min(100, h + 30));
        else if (pu.type === 'RIFLE') setWeapon(WeaponType.RIFLE);
        else if (pu.type === 'SHOTGUN') setWeapon(WeaponType.SHOTGUN);
        
        soundService.playPowerUp();
        powerUps.current.splice(idx, 1);
      }
    });

    // 6. Firing
    if (isFiring.current && Date.now() - lastShotTime.current > (weapon === WeaponType.RIFLE ? 150 : 500)) {
      const p = playerPos.current;
      const angle = playerAngle.current;
      
      if (weapon === WeaponType.RIFLE) {
        projectiles.current.push({
          id: Math.random().toString(),
          pos: { ...p },
          velocity: { x: Math.cos(angle) * 15, y: Math.sin(angle) * 15 },
          damage: 25,
          color: '#fbbf24',
          ownerId: 'player'
        });
      } else {
        for(let i=-2; i<=2; i++) {
          projectiles.current.push({
            id: Math.random().toString(),
            pos: { ...p },
            velocity: { x: Math.cos(angle + i*0.1) * 12, y: Math.sin(angle + i*0.1) * 12 },
            damage: 15,
            color: '#fbbf24',
            ownerId: 'player'
          });
        }
      }
      lastShotTime.current = Date.now();
      soundService.playShoot();
    }

    draw();
    requestRef.current = requestAnimationFrame(update);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Camera follow
    const camX = playerPos.current.x - canvas.width / 2;
    const camY = playerPos.current.y - canvas.height / 2;

    ctx.fillStyle = '#1a2e1a'; // Grass
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camX, -camY);

    // Map Grid
    ctx.strokeStyle = '#2d4a2d';
    for(let x=0; x<=MAP_SIZE; x+=100) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP_SIZE); ctx.stroke();
    }
    for(let y=0; y<=MAP_SIZE; y+=100) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_SIZE, y); ctx.stroke();
    }

    // Zone
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(zoneCenter.current.x, zoneCenter.current.y, zoneRadius, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.fillRect(-5000, -5000, 10000, 10000);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.arc(zoneCenter.current.x, zoneCenter.current.y, zoneRadius, 0, Math.PI*2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Loot
    powerUps.current.forEach(pu => {
      ctx.fillStyle = pu.type === 'HEALTH' ? '#4ade80' : '#fbbf24';
      ctx.fillRect(pu.pos.x - 10, pu.pos.y - 10, 20, 20);
    });

    // Enemies
    enemies.current.forEach(en => {
      if (en.isDead) return;
      ctx.save();
      ctx.translate(en.pos.x, en.pos.y);
      ctx.rotate(en.angle);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.fillRect(15, -4, 15, 8); // Gun
      ctx.restore();
    });

    // Player
    ctx.save();
    ctx.translate(playerPos.current.x, playerPos.current.y);
    ctx.rotate(playerAngle.current);
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(18, -5, 20, 10); // Gun
    ctx.restore();

    // Projectiles
    projectiles.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, 4, 0, Math.PI*2); ctx.fill();
    });

    ctx.restore();

    // HUD: Mini Map
    const mmSize = 120;
    const mmX = canvas.width - mmSize - 20;
    const mmY = 20;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(mmX, mmY, mmSize, mmSize);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(mmX, mmY, mmSize, mmSize);
    
    // Player on minimap
    const pmmX = mmX + (playerPos.current.x / MAP_SIZE) * mmSize;
    const pmmY = mmY + (playerPos.current.y / MAP_SIZE) * mmSize;
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath(); ctx.arc(pmmX, pmmY, 3, 0, Math.PI*2); ctx.fill();
    
    // Zone on minimap
    const zmmX = mmX + (zoneCenter.current.x / MAP_SIZE) * mmSize;
    const zmmY = mmY + (zoneCenter.current.y / MAP_SIZE) * mmSize;
    const zmmR = (zoneRadius / MAP_SIZE) * mmSize;
    ctx.strokeStyle = '#3b82f6';
    ctx.beginPath(); ctx.arc(zmmX, zmmY, zmmR, 0, Math.PI*2); ctx.stroke();
  };

  useEffect(() => {
    const touchStart = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (t.clientX < window.innerWidth / 2) {
        joystickStart.current = { x: t.clientX, y: t.clientY };
        joystickCurr.current = { x: t.clientX, y: t.clientY };
      } else {
        isFiring.current = true;
        playerAngle.current = Math.atan2(t.clientY - window.innerHeight/2, t.clientX - window.innerWidth/2);
      }
    };
    const touchMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (joystickStart.current) {
        joystickCurr.current = { x: t.clientX, y: t.clientY };
      } else {
        playerAngle.current = Math.atan2(t.clientY - window.innerHeight/2, t.clientX - window.innerWidth/2);
      }
    };
    const touchEnd = () => {
      joystickStart.current = null;
      joystickCurr.current = null;
      isFiring.current = false;
    };

    window.addEventListener('touchstart', touchStart, { passive: false });
    window.addEventListener('touchmove', touchMove, { passive: false });
    window.addEventListener('touchend', touchEnd);

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
      window.removeEventListener('touchstart', touchStart);
      window.removeEventListener('touchmove', touchMove);
      window.removeEventListener('touchend', touchEnd);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(requestRef.current!);
    };
  }, [weapon, zoneRadius, kills]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-zinc-900">
      <canvas ref={canvasRef} className="block" />
      
      {/* UI Overlay */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <div className="bg-black/50 p-3 rounded-xl border border-white/10 backdrop-blur-md">
          <div className="text-[10px] text-zinc-400 uppercase font-orbitron">Health</div>
          <div className="w-32 h-2 bg-zinc-800 rounded-full mt-1 overflow-hidden">
             <div className="h-full bg-blue-500" style={{ width: `${playerHealth}%` }} />
          </div>
        </div>
        <div className="bg-black/50 px-3 py-1 rounded-lg border border-white/10 text-white text-xs font-orbitron uppercase">
          Alive: <span className="text-blue-400">{aliveCount}</span> | Kills: <span className="text-red-400">{kills}</span>
        </div>
      </div>

      <div className="absolute bottom-6 right-6">
         <div className="bg-blue-600/20 px-4 py-2 rounded-xl border border-blue-500/50 text-blue-400 text-xs font-bold font-orbitron">
           WEAPON: {weapon}
         </div>
      </div>

      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
         <div className="text-white font-orbitron text-8xl font-black">SURVIVE</div>
      </div>
    </div>
  );
};

export default BattleEngine;
