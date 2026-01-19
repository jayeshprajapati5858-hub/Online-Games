
import React, { useRef, useEffect, useState } from 'react';
import { Entity, Projectile, Vector, EnemyType, PowerUp, WeaponType } from '../types';
import { soundService } from '../services/soundService';

interface Props {
  onGameOver: (score: number) => void;
}

interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  isLarge?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
  isGhost?: boolean;
}

interface Barrel {
  id: string;
  pos: Vector;
  health: number;
  isExploded: boolean;
}

interface GameEnemy extends Entity {
  hitFlash?: number;
  wiggle?: number;
}

const DODGE_DURATION = 250; 
const DODGE_COOLDOWN = 1800; 
const DODGE_SPEED = 18.0;

const GameEngine: React.FC<Props> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const lastShotTimeRef = useRef(0);
  
  const [currentScore, setCurrentScore] = useState(0);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [weapon, setWeapon] = useState<WeaponType>(WeaponType.RIFLE);
  const [dodgeCooldownPercent, setDodgeCooldownPercent] = useState(100);
  const [killStreak, setKillStreak] = useState({ count: 0, text: "", life: 0 });

  const shakeRef = useRef(0);
  const damageFlashRef = useRef(0); 
  const slowMoFactor = useRef(1.0);
  const slowMoTimer = useRef(0);

  const joystickPos = useRef<Vector | null>(null);
  const joystickStart = useRef<Vector | null>(null);
  const isFiring = useRef(false);
  const fireTouchId = useRef<number | null>(null);

  const dodgeStartTimeRef = useRef(0);
  const dodgeLastUsedRef = useRef(0);
  const dodgeDirRef = useRef<Vector>({ x: 0, y: 0 });
  const isDodgingRef = useRef(false);
  const rightTouchStartPos = useRef<Vector | null>(null);
  const rightTouchStartTime = useRef(0);

  // Responsive dimensions
  const viewportRef = useRef({ width: window.innerWidth, height: window.innerHeight });

  const playerRef = useRef<Entity>({
    id: 'player',
    pos: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    radius: 20,
    health: 100,
    maxHealth: 100,
    color: '#3b82f6',
    angle: 0
  });

  const enemiesRef = useRef<GameEnemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const barrelsRef = useRef<Barrel[]>([]);

  const spawnEnemy = () => {
    const margin = 200;
    const side = Math.floor(Math.random() * 4);
    let x, y;
    const vw = viewportRef.current.width;
    const vh = viewportRef.current.height;

    if (side === 0) { x = Math.random() * vw; y = -margin; }
    else if (side === 1) { x = vw + margin; y = Math.random() * vh; }
    else if (side === 2) { x = Math.random() * vw; y = vh + margin; }
    else { x = -margin; y = Math.random() * vh; }

    const types = [EnemyType.STANDARD, EnemyType.RUNNER, EnemyType.TANK, EnemyType.SNIPER, EnemyType.SPRINTER, EnemyType.HEAVY];
    const type = types[Math.floor(Math.random() * types.length)];
    const healthMult = 1 + (levelRef.current - 1) * 0.25;
    
    let config = { radius: 18, health: 50 * healthMult, color: '#ef4444' };
    if (type === EnemyType.RUNNER) config = { radius: 14, health: 30 * healthMult, color: '#facc15' };
    else if (type === EnemyType.TANK) config = { radius: 30, health: 180 * healthMult, color: '#991b1b' };
    else if (type === EnemyType.SNIPER) config = { radius: 16, health: 45 * healthMult, color: '#a855f7' };
    else if (type === EnemyType.SPRINTER) config = { radius: 12, health: 25 * healthMult, color: '#22d3ee' };
    else if (type === EnemyType.HEAVY) config = { radius: 38, health: 450 * healthMult, color: '#ea580c' };

    enemiesRef.current.push({
      id: Math.random().toString(36).substr(2, 9),
      pos: { x, y },
      radius: config.radius,
      health: config.health,
      maxHealth: config.health,
      color: config.color,
      angle: 0,
      type,
      lastShot: 0,
      hitFlash: 0,
      wiggle: Math.random() * Math.PI * 2
    });
  };

  const spawnBarrel = () => {
    const vw = viewportRef.current.width;
    const vh = viewportRef.current.height;
    const x = 100 + Math.random() * (vw - 200);
    const y = 100 + Math.random() * (vh - 200);
    barrelsRef.current.push({
        id: Math.random().toString(),
        pos: { x, y },
        health: 20,
        isExploded: false
    });
  };

  const explodeBarrel = (barrel: Barrel) => {
    barrel.isExploded = true;
    shakeRef.current = 25;
    soundService.playExplosion();
    createParticles(barrel.pos.x, barrel.pos.y, "#ff4500", 30, 15);
    createParticles(barrel.pos.x, barrel.pos.y, "#ffeb3b", 20, 10);
    
    // Damage nearby entities
    const blastRadius = 250;
    enemiesRef.current.forEach((en, idx) => {
        const d = Math.sqrt((en.pos.x - barrel.pos.x)**2 + (en.pos.y - barrel.pos.y)**2);
        if (d < blastRadius) {
            en.health -= 300;
            if (en.health <= 0) {
               scoreRef.current += 150;
               createParticles(en.pos.x, en.pos.y, en.color, 15, 8);
            }
        }
    });
    // Damage player if close
    const dToPlayer = Math.sqrt((playerRef.current.pos.x - barrel.pos.x)**2 + (playerRef.current.pos.y - barrel.pos.y)**2);
    if (dToPlayer < blastRadius) {
        playerRef.current.health -= 30;
        setPlayerHealth(playerRef.current.health);
        damageFlashRef.current = 1.0;
        if (playerRef.current.health <= 0) onGameOver(scoreRef.current);
    }
  };

  const spawnPowerUp = (x: number, y: number) => {
    const rand = Math.random();
    let type: 'HEALTH' | 'COIN' | 'SPEED' = 'HEALTH';
    if (rand < 0.2) type = 'SPEED'; // This will represent SLOW-MO in visuals
    else if (rand < 0.5) type = 'COIN';

    powerUpsRef.current.push({
      id: Math.random().toString(),
      pos: { x, y },
      radius: 12,
      type: type as any,
      life: 1.0 
    });
  };

  const createParticles = (x: number, y: number, color: string, count = 8, spread = 8, isGhost = false) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * spread,
        vy: (Math.random() - 0.5) * spread,
        life: 1.0, color,
        size: isGhost ? 15 : (1 + Math.random() * 2),
        isGhost
      });
    }
  };

  const triggerKillStreak = () => {
    const newCount = killStreak.count + 1;
    let text = "";
    if (newCount === 2) text = "DOUBLE KILL!";
    else if (newCount === 3) text = "TRIPLE KILL!";
    else if (newCount === 5) text = "RAMPAGE!!";
    else if (newCount >= 7) text = "GODLIKE!!!";
    
    setKillStreak({ count: newCount, text, life: text ? 100 : 0 });
  };

  const addFloatingText = (x: number, y: number, text: string, color: string, isLarge = false) => {
    floatingTextsRef.current.push({ id: Math.random().toString(), x, y, text, color, life: 1.0, isLarge });
  };

  const triggerDodge = (dx: number, dy: number) => {
    const now = Date.now();
    if (now - dodgeLastUsedRef.current < DODGE_COOLDOWN) return;
    const dist = Math.sqrt(dx * dx + dy * dy);
    dodgeDirRef.current = { x: dx / dist, y: dy / dist };
    dodgeStartTimeRef.current = now;
    dodgeLastUsedRef.current = now;
    isDodgingRef.current = true;
    soundService.playLevelUp(); 
    addFloatingText(playerRef.current.pos.x, playerRef.current.pos.y - 50, "DASH!", "#60a5fa", true);
  };

  const switchWeapon = () => {
    const next = weapon === WeaponType.RIFLE ? WeaponType.SHOTGUN : WeaponType.RIFLE;
    setWeapon(next);
    soundService.playPowerUp();
    addFloatingText(playerRef.current.pos.x, playerRef.current.pos.y - 40, `UPGRADE: ${next}`, '#fff', true);
    createParticles(playerRef.current.pos.x, playerRef.current.pos.y, next === WeaponType.RIFLE ? '#60a5fa' : '#fbbf24', 20, 10);
  };

  const shoot = (from: Entity, angle: number, isEnemy: boolean, damage: number, speed: number) => {
    projectilesRef.current.push({
      id: Math.random().toString(),
      pos: { ...from.pos },
      velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      damage: damage,
      color: isEnemy ? '#f87171' : (weapon === WeaponType.SHOTGUN ? '#fbbf24' : '#60a5fa'),
      ownerId: from.id
    });
    if (!isEnemy) {
      shakeRef.current = Math.max(shakeRef.current, weapon === WeaponType.SHOTGUN ? 6 : 2);
      soundService.playShoot();
    }
  };

  const update = (time: number) => {
    const now = Date.now();
    const p = playerRef.current;
    const vw = viewportRef.current.width;
    const vh = viewportRef.current.height;
    
    if (shakeRef.current > 0) shakeRef.current *= 0.85;
    if (damageFlashRef.current > 0) damageFlashRef.current *= 0.92;
    if (killStreak.life > 0) setKillStreak(s => ({ ...s, life: s.life - 1.5 }));
    else if (killStreak.count > 0 && Math.random() < 0.01) setKillStreak(s => ({ ...s, count: 0 }));

    if (slowMoTimer.current > 0) {
        slowMoTimer.current -= 1;
        slowMoFactor.current = 0.4;
    } else {
        slowMoFactor.current = 1.0;
    }

    const frameSlowMo = slowMoFactor.current;

    // Dodge Update
    if (isDodgingRef.current) {
      const elapsed = now - dodgeStartTimeRef.current;
      if (elapsed > DODGE_DURATION) isDodgingRef.current = false;
      else {
        p.pos.x += dodgeDirRef.current.x * DODGE_SPEED;
        p.pos.y += dodgeDirRef.current.y * DODGE_SPEED;
        if (elapsed % 30 < 16) createParticles(p.pos.x, p.pos.y, 'rgba(96, 165, 250, 0.5)', 1, 0, true);
      }
    }

    // Movement
    if (!isDodgingRef.current && joystickStart.current && joystickPos.current) {
      const dx = joystickPos.current.x - joystickStart.current.x;
      const dy = joystickPos.current.y - joystickStart.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) {
        const speed = 6.0;
        p.pos.x += (dx / dist) * speed;
        p.pos.y += (dy / dist) * speed;
        if (!isFiring.current) p.angle = Math.atan2(dy, dx);
      }
    }

    setDodgeCooldownPercent(Math.min(100, ((now - dodgeLastUsedRef.current) / DODGE_COOLDOWN) * 100));
    
    // Player Shooting
    const cooldown = weapon === WeaponType.SHOTGUN ? 450 : 100;
    if (isFiring.current && !isDodgingRef.current && now - lastShotTimeRef.current > cooldown) {
      lastShotTimeRef.current = now;
      if (weapon === WeaponType.RIFLE) shoot(p, p.angle, false, 25, 24);
      else for(let i = -2; i <= 2; i++) shoot(p, p.angle + (i * 0.12), false, 15, 20);
    }

    // Keep player in bounds (Responsive)
    p.pos.x = Math.max(p.radius, Math.min(vw - p.radius, p.pos.x));
    p.pos.y = Math.max(p.radius, Math.min(vh - p.radius, p.pos.y));

    // Update PowerUps
    powerUpsRef.current.forEach((pu, idx) => {
      const d = Math.sqrt((pu.pos.x - p.pos.x)**2 + (pu.pos.y - p.pos.y)**2);
      if (d < pu.radius + p.radius) {
        if (pu.type === 'HEALTH') {
            p.health = Math.min(100, p.health + 25);
            addFloatingText(p.pos.x, p.pos.y, `+25 HP`, '#4ade80', true);
        } else if (pu.type === 'SPEED') {
            slowMoTimer.current = 240; // ~4 seconds slowmo
            addFloatingText(p.pos.x, p.pos.y, `SLOW MOTION!`, '#06b6d4', true);
        } else {
            scoreRef.current += 100;
            addFloatingText(p.pos.x, p.pos.y, `+100 PTS`, '#fbbf24', false);
        }
        setPlayerHealth(p.health);
        setCurrentScore(scoreRef.current);
        soundService.playPowerUp();
        createParticles(p.pos.x, p.pos.y, '#fff', 10, 4);
        powerUpsRef.current.splice(idx, 1);
        return;
      }
      pu.life -= 0.002;
      if (pu.life <= 0) powerUpsRef.current.splice(idx, 1);
    });

    // Update Enemies
    enemiesRef.current.forEach(enemy => {
      if (enemy.hitFlash && enemy.hitFlash > 0) enemy.hitFlash -= 0.15;
      const dx = p.pos.x - enemy.pos.x;
      const dy = p.pos.y - enemy.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      enemy.angle = Math.atan2(dy, dx);
      
      const levelMult = 1 + (levelRef.current - 1) * 0.1;
      let speed = (1.5 + (scoreRef.current / 8000)) * levelMult * frameSlowMo;
      
      if (enemy.type === EnemyType.RUNNER) speed *= 1.8;
      else if (enemy.type === EnemyType.TANK) speed *= 0.6;
      else if (enemy.type === EnemyType.SPRINTER) speed *= 2.8;
      else if (enemy.type === EnemyType.HEAVY) speed *= 0.35;

      enemy.pos.x += (dx / dist) * speed;
      enemy.pos.y += (dy / dist) * speed;
      
      if (!isDodgingRef.current && dist < enemy.radius + p.radius) {
         p.health -= 0.5 * levelMult;
         setPlayerHealth(p.health);
         damageFlashRef.current = Math.min(0.8, damageFlashRef.current + 0.05);
         if (p.health <= 0) onGameOver(scoreRef.current);
      }
      
      if (Math.random() < 0.005 * levelMult * frameSlowMo) {
        shoot(enemy, enemy.angle, true, 8 * levelMult, 7 * levelMult * frameSlowMo);
      }
    });

    // Update Barrels
    barrelsRef.current.forEach((barrel, idx) => {
        if (barrel.isExploded) {
            barrelsRef.current.splice(idx, 1);
        }
    });

    // Update Projectiles
    projectilesRef.current.forEach((proj, idx) => {
      proj.pos.x += proj.velocity.x * (proj.ownerId === 'player' ? 1.0 : frameSlowMo);
      proj.pos.y += proj.velocity.y * (proj.ownerId === 'player' ? 1.0 : frameSlowMo);
      
      if (proj.pos.x < -100 || proj.pos.x > vw + 100 || proj.pos.y < -100 || proj.pos.y > vh + 100) {
        projectilesRef.current.splice(idx, 1);
        return;
      }

      if (proj.ownerId === 'player') {
        // Hit Barrel?
        barrelsRef.current.forEach(b => {
           const d = Math.sqrt((proj.pos.x - b.pos.x)**2 + (proj.pos.y - b.pos.y)**2);
           if (d < 25) {
               b.health -= proj.damage;
               projectilesRef.current.splice(idx, 1);
               if (b.health <= 0) explodeBarrel(b);
           }
        });
        
        enemiesRef.current.forEach((enemy, eIdx) => {
          const d = Math.sqrt((proj.pos.x - enemy.pos.x)**2 + (proj.pos.y - enemy.pos.y)**2);
          if (d < enemy.radius) {
            enemy.health -= proj.damage;
            enemy.hitFlash = 1.0;
            createParticles(proj.pos.x, proj.pos.y, enemy.color, 4, 3);
            projectilesRef.current.splice(idx, 1);
            if (enemy.health <= 0) {
              const gained = enemy.type === EnemyType.HEAVY ? 500 : 100;
              scoreRef.current += gained;
              setCurrentScore(scoreRef.current);
              createParticles(enemy.pos.x, enemy.pos.y, enemy.color, 12, 6);
              if (Math.random() < 0.3) spawnPowerUp(enemy.pos.x, enemy.pos.y);
              enemiesRef.current.splice(eIdx, 1);
              soundService.playExplosion();
              triggerKillStreak();
              if (Math.floor(scoreRef.current / 2500) + 1 > levelRef.current) {
                levelRef.current++;
                setCurrentLevel(levelRef.current);
                soundService.playLevelUp();
                addFloatingText(vw/2, vh/2, `LEVEL ${levelRef.current}`, '#facc15', true);
              }
            }
          }
        });
      } else if (!isDodgingRef.current) {
        const d = Math.sqrt((proj.pos.x - p.pos.x)**2 + (proj.pos.y - p.pos.y)**2);
        if (d < p.radius) {
            p.health -= proj.damage;
            setPlayerHealth(p.health);
            damageFlashRef.current = Math.min(1.0, damageFlashRef.current + 0.2);
            projectilesRef.current.splice(idx, 1);
            shakeRef.current = 10;
            soundService.playDamage();
            if (p.health <= 0) onGameOver(scoreRef.current);
        }
      }
    });

    particlesRef.current.forEach((pt, idx) => {
      pt.x += pt.vx; pt.y += pt.vy; pt.life -= 0.04;
      if (pt.life <= 0) particlesRef.current.splice(idx, 1);
    });
    floatingTextsRef.current.forEach((ft, idx) => {
      ft.y -= 1; ft.life -= 0.02;
      if (ft.life <= 0) floatingTextsRef.current.splice(idx, 1);
    });

    if (Math.random() < 0.008 && enemiesRef.current.length < 8) spawnEnemy();
    if (Math.random() < 0.002 && barrelsRef.current.length < 3) spawnBarrel();
    
    draw();
    requestRef.current = requestAnimationFrame(update);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (shakeRef.current > 0.1) ctx.translate((Math.random()-0.5)*shakeRef.current, (Math.random()-0.5)*shakeRef.current);
    ctx.fillStyle = slowMoTimer.current > 0 ? '#050a10' : '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Barrels
    barrelsRef.current.forEach(b => {
        ctx.save();
        ctx.translate(b.pos.x, b.pos.y);
        ctx.fillStyle = '#991b1b';
        ctx.beginPath(); ctx.roundRect(-15, -20, 30, 40, 4); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Orbitron'; ctx.textAlign = 'center';
        ctx.fillText("TNT", 0, 5);
        ctx.restore();
    });

    powerUpsRef.current.forEach(pu => {
      ctx.save();
      ctx.translate(pu.pos.x, pu.pos.y);
      const scale = 1 + Math.sin(Date.now() / 150) * 0.1; ctx.scale(scale, scale);
      ctx.fillStyle = pu.type === 'HEALTH' ? '#166534' : (pu.type === 'SPEED' ? '#083344' : '#713f12');
      ctx.beginPath(); ctx.arc(0, 0, pu.radius, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign='center'; ctx.font='12px sans-serif';
      ctx.fillText(pu.type === 'HEALTH' ? '+' : (pu.type === 'SPEED' ? '⚡' : '$'), 0, 5);
      ctx.restore();
    });

    enemiesRef.current.forEach(en => {
      ctx.save();
      ctx.translate(en.pos.x, en.pos.y);
      ctx.rotate(en.angle);
      ctx.fillStyle = en.hitFlash && en.hitFlash > 0.1 ? '#fff' : en.color;
      ctx.beginPath(); ctx.arc(0, 0, en.radius, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.fillRect(en.radius - 2, -3, 10, 6);
      ctx.restore();
    });

    // Player
    const p = playerRef.current;
    ctx.save();
    ctx.translate(p.pos.x, p.pos.y);
    ctx.rotate(p.angle);
    if (isDodgingRef.current) ctx.globalAlpha = 0.5;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(p.radius - 2, -3, 20, 6);
    ctx.restore();

    projectilesRef.current.forEach(pj => {
      ctx.fillStyle = pj.color;
      ctx.beginPath(); ctx.arc(pj.pos.x, pj.pos.y, 4, 0, Math.PI*2); ctx.fill();
    });

    particlesRef.current.forEach(pt => {
        ctx.save(); ctx.globalAlpha = pt.life; ctx.fillStyle = pt.color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size*pt.life, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    });

    floatingTextsRef.current.forEach(ft => {
      ctx.save(); ctx.globalAlpha = ft.life; ctx.fillStyle = ft.color;
      ctx.textAlign = 'center'; ctx.font = ft.isLarge ? 'bold 24px Orbitron' : 'bold 16px Inter';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });

    // Kill Streak UI
    if (killStreak.life > 0) {
        ctx.save();
        ctx.resetTransform();
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(255, 255, 255, ${killStreak.life / 100})`;
        ctx.font = 'bold 40px Orbitron';
        ctx.shadowBlur = 20; ctx.shadowColor = '#ef4444';
        ctx.fillText(killStreak.text, canvas.width / 2, 180);
        ctx.restore();
    }

    if (damageFlashRef.current > 0.05) {
      ctx.save(); ctx.resetTransform();
      ctx.fillStyle = `rgba(255, 0, 0, ${damageFlashRef.current * 0.4})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    ctx.restore();
  };

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        // Split screen: Left half moves, Right half aims/shoots
        if (touch.clientX < vw / 2) {
          joystickStart.current = { x: touch.clientX, y: touch.clientY };
          joystickPos.current = { x: touch.clientX, y: touch.clientY };
        } else {
          isFiring.current = true; fireTouchId.current = touch.identifier;
          rightTouchStartPos.current = { x: touch.clientX, y: touch.clientY };
          rightTouchStartTime.current = Date.now();
        }
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const vw = window.innerWidth;
      
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (joystickStart.current && touch.clientX < vw / 2) {
          joystickPos.current = { x: touch.clientX, y: touch.clientY };
        }
        if (fireTouchId.current === touch.identifier) {
          const dx = touch.clientX - playerRef.current.pos.x;
          const dy = touch.clientY - playerRef.current.pos.y;
          playerRef.current.angle = Math.atan2(dy, dx);
        }
      }
    };
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      const vw = window.innerWidth;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (joystickStart.current && touch.clientX < vw / 2) {
          joystickStart.current = null; joystickPos.current = null;
        }
        if (fireTouchId.current === touch.identifier) {
          isFiring.current = false; fireTouchId.current = null;
          if (rightTouchStartPos.current) {
            const dx = touch.clientX - rightTouchStartPos.current.x;
            const dy = touch.clientY - rightTouchStartPos.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 40 && (Date.now() - rightTouchStartTime.current < 250)) triggerDodge(dx, dy);
          }
          rightTouchStartPos.current = null;
        }
      }
    };
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    const resize = () => { 
        if (canvasRef.current) { 
            canvasRef.current.width = window.innerWidth; 
            canvasRef.current.height = window.innerHeight; 
        }
        viewportRef.current = { width: window.innerWidth, height: window.innerHeight };
        // Clamp player
        const p = playerRef.current;
        p.pos.x = Math.max(p.radius, Math.min(window.innerWidth - p.radius, p.pos.x));
        p.pos.y = Math.max(p.radius, Math.min(window.innerHeight - p.radius, p.pos.y));
    };
    window.addEventListener('resize', resize);
    resize();
    requestRef.current = requestAnimationFrame(update);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', resize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [weapon]);

  return (
    <div className="relative w-full h-full overflow-hidden touch-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_100px_rgba(220,38,38,1)]" style={{ opacity: (100 - playerHealth) / 100 * 0.8 }} />
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-1">
          <div className="text-white font-orbitron text-[10px] opacity-70 tracking-widest uppercase">System Integrity</div>
          <div className="w-32 md:w-44 h-3 bg-zinc-900 rounded-full border border-zinc-700 overflow-hidden">
            <div className={`h-full transition-all duration-200 ${playerHealth < 30 ? 'bg-red-600 animate-pulse' : 'bg-blue-600'}`} style={{ width: `${Math.max(0, playerHealth)}%` }} />
          </div>
          <div className="text-zinc-500 text-[10px] font-orbitron mt-2 uppercase">Core Pulse</div>
          <div className="w-32 md:w-44 h-1.5 bg-zinc-900 rounded-full border border-zinc-800 overflow-hidden">
            <div className={`h-full transition-all duration-200 ${dodgeCooldownPercent === 100 ? 'bg-yellow-400' : 'bg-zinc-600'}`} style={{ width: `${dodgeCooldownPercent}%` }} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-zinc-500 font-orbitron text-[10px] tracking-widest uppercase">Total Kills</div>
          <div className="text-3xl font-orbitron font-bold text-white tracking-tighter">{currentScore.toLocaleString()}</div>
        </div>
      </div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-zinc-900/80 border border-zinc-700 p-2 rounded-2xl backdrop-blur-sm pointer-events-auto">
        <button onClick={switchWeapon} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl border border-white/10 transition-all flex items-center gap-3 active:scale-95">
          <span className="text-sm font-orbitron font-bold text-blue-400">SWITCH: {weapon}</span>
        </button>
      </div>
      <div className="absolute bottom-10 left-10 w-24 h-24 border-2 border-dashed border-white/5 rounded-full flex items-center justify-center pointer-events-none opacity-50">
          <div className="text-[8px] text-zinc-600 font-orbitron uppercase">Move</div>
      </div>
      <div className="absolute bottom-10 right-10 w-24 h-24 border-2 border-dashed border-white/5 rounded-full flex items-center justify-center pointer-events-none opacity-50">
          <div className="text-[8px] text-zinc-600 font-orbitron uppercase text-center">Aim / Dash</div>
      </div>
    </div>
  );
};

export default GameEngine;
