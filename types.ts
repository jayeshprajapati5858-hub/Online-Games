
export interface Vector {
  x: number;
  y: number;
}

export enum EnemyType {
  STANDARD = 'STANDARD',
  RUNNER = 'RUNNER',
  TANK = 'TANK',
  SNIPER = 'SNIPER',
  SPRINTER = 'SPRINTER',
  HEAVY = 'HEAVY'
}

export enum WeaponType {
  RIFLE = 'RIFLE',
  SHOTGUN = 'SHOTGUN'
}

export enum GameMode {
  STRIKE = 'STRIKE',
  RACER = 'RACER',
  GRAVITY = 'GRAVITY',
  COSMIC = 'COSMIC',
  BATTLE = 'BATTLE',
  PLATFORMER = 'PLATFORMER'
}

export enum GameStatus {
  LOBBY,
  PLAYING,
  GAMEOVER
}

export interface Entity {
  id: string;
  pos: Vector;
  radius: number;
  health: number;
  maxHealth: number;
  color: string;
  angle: number;
  type?: EnemyType;
  lastShot?: number;
}

export interface Projectile {
  id: string;
  pos: Vector;
  velocity: Vector;
  damage: number;
  color: string;
  ownerId: string;
}

export interface PowerUp {
  id: string;
  pos: Vector;
  radius: number;
  type: 'HEALTH' | 'SPEED' | 'RIFLE' | 'SHOTGUN' | 'COIN';
  life: number;
}

export interface Obstacle {
  id: string;
  pos: Vector;
  width: number;
  height: number;
  speed: number;
  color: string;
}
