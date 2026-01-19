
import React, { useState, useEffect, useCallback } from 'react';
import GameEngine from './components/GameEngine';
import RacerEngine from './components/RacerEngine';
import GravityEngine from './components/GravityEngine';
import CosmicEngine from './components/CosmicEngine';
import BattleEngine from './components/BattleEngine';
import PlatformerEngine from './components/PlatformerEngine';
import UIOverlay from './components/UIOverlay';
import { GameStatus, GameMode } from './types';
import { getCombatTip, getDailyRewardText } from './services/geminiService';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.LOBBY);
  const [mode, setMode] = useState<GameMode>(GameMode.STRIKE);
  const [score, setScore] = useState(0);
  const [highScores, setHighScores] = useState({ strike: 0, racer: 0, gravity: 0, cosmic: 0, battle: 0, platformer: 0 });
  const [tip, setTip] = useState("તૈયાર છો? ચાલો લડીએ!");
  const [dailyBonus, setDailyBonus] = useState("");

  useEffect(() => {
    const sStrike = localStorage.getItem('hs_strike') || '0';
    const sRacer = localStorage.getItem('hs_racer') || '0';
    const sGravity = localStorage.getItem('hs_gravity') || '0';
    const sCosmic = localStorage.getItem('hs_cosmic') || '0';
    const sBattle = localStorage.getItem('hs_battle') || '0';
    const sPlatform = localStorage.getItem('hs_platformer') || '0';
    setHighScores({ 
        strike: parseInt(sStrike), 
        racer: parseInt(sRacer),
        gravity: parseInt(sGravity),
        cosmic: parseInt(sCosmic),
        battle: parseInt(sBattle),
        platformer: parseInt(sPlatform)
    });

    const loadDaily = async () => {
      const text = await getDailyRewardText();
      setDailyBonus(text);
    };
    loadDaily();
  }, []);

  const startGame = (selectedMode: GameMode) => {
    setMode(selectedMode);
    setStatus(GameStatus.PLAYING);
    setScore(0);
  };

  const onGameOver = useCallback(async (finalScore: number) => {
    setScore(finalScore);
    const modeKey = mode.toLowerCase();
    const storageKey = `hs_${modeKey}`;
    const currentHigh = highScores[modeKey as keyof typeof highScores];
    
    if (finalScore > currentHigh) {
      const newHigh = { ...highScores, [modeKey]: finalScore };
      setHighScores(newHigh);
      localStorage.setItem(storageKey, finalScore.toString());
    }
    
    setStatus(GameStatus.GAMEOVER);
    const newTip = await getCombatTip(finalScore);
    setTip(newTip);
  }, [highScores, mode]);

  const GameComponent = () => {
    switch(mode) {
        case GameMode.STRIKE: return <GameEngine onGameOver={onGameOver} />;
        case GameMode.RACER: return <RacerEngine onGameOver={onGameOver} />;
        case GameMode.GRAVITY: return <GravityEngine onGameOver={onGameOver} />;
        case GameMode.COSMIC: return <CosmicEngine onGameOver={onGameOver} />;
        case GameMode.BATTLE: return <BattleEngine onGameOver={onGameOver} />;
        case GameMode.PLATFORMER: return <PlatformerEngine onGameOver={onGameOver} />;
        default: return null;
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#050505] select-none overflow-hidden touch-none font-inter">
      
      {status === GameStatus.PLAYING && <GameComponent />}

      {status === GameStatus.LOBBY && (
        <div className="absolute inset-0 flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-[#050505] to-black z-50 overflow-y-auto">
          <div className="w-full max-w-7xl mx-auto p-6 md:p-12">
            
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-center mb-12 border-b border-white/5 pb-8">
              <div className="text-center md:text-left mb-6 md:mb-0">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold rounded-full uppercase tracking-widest mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  Live Servers Online
                </div>
                <h1 className="text-4xl md:text-6xl font-orbitron font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500 tracking-tighter italic">
                  SHADOW<span className="text-red-600">STRIKE</span>
                </h1>
                <p className="text-zinc-500 text-sm mt-2 font-medium tracking-wide">ELITE TACTICAL WARFARE SIMULATOR</p>
              </div>
              
              <div className="flex flex-col items-center md:items-end">
                <div className="text-right">
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Daily Intel</p>
                  <p className="text-yellow-500 text-xs font-semibold max-w-[200px] leading-relaxed">{dailyBonus || "Establishing secure connection..."}</p>
                </div>
              </div>
            </header>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* STRIKE (Main) */}
              <div onClick={() => startGame(GameMode.STRIKE)} className="group relative h-64 bg-zinc-900/40 border border-white/5 rounded-3xl p-8 transition-all duration-300 hover:border-red-500/50 hover:bg-zinc-900/80 active:scale-[0.98] cursor-pointer overflow-hidden lg:col-span-2">
                <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start">
                    <div className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold uppercase rounded-md">Featured</div>
                    <svg className="w-8 h-8 text-zinc-700 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-3xl font-orbitron font-bold text-white mb-2 group-hover:translate-x-1 transition-transform">SHADOW STRIKE</h3>
                    <p className="text-zinc-400 text-xs mb-4 max-w-sm">Tactical top-down shooter. Survive waves, upgrade weapons, and dominate the leaderboard.</p>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest">
                      <span>High Score</span>
                      <div className="h-px w-8 bg-zinc-800"></div>
                      <span className="text-red-400 font-bold text-lg">{highScores.strike.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* BATTLE ZONE */}
              <div onClick={() => startGame(GameMode.BATTLE)} className="group relative h-64 bg-zinc-900/40 border border-white/5 rounded-3xl p-8 transition-all duration-300 hover:border-blue-500/50 hover:bg-zinc-900/80 active:scale-[0.98] cursor-pointer overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start">
                    <div className="px-3 py-1 bg-blue-600/20 text-blue-400 text-[10px] font-bold uppercase rounded-md border border-blue-500/30">Battle Royale</div>
                    <svg className="w-6 h-6 text-zinc-700 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-orbitron font-bold text-white mb-1 group-hover:translate-x-1 transition-transform">BATTLE ZONE</h3>
                    <div className="mt-4 flex items-center justify-between">
                       <span className="text-zinc-500 text-[10px] uppercase tracking-widest">Best</span>
                       <span className="text-blue-400 font-bold text-lg">{highScores.battle.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SUPER NEXUS */}
              <div onClick={() => startGame(GameMode.PLATFORMER)} className="group relative h-56 bg-zinc-900/40 border border-white/5 rounded-3xl p-6 transition-all duration-300 hover:border-yellow-500/50 hover:bg-zinc-900/80 active:scale-[0.98] cursor-pointer overflow-hidden">
                 <div className="relative z-10">
                    <h3 className="text-xl font-orbitron font-bold text-white mb-1 group-hover:text-yellow-400 transition-colors">SUPER NEXUS</h3>
                    <p className="text-zinc-500 text-[10px]">Adventure Platformer</p>
                    <div className="mt-8 text-3xl font-bold text-zinc-700 group-hover:text-yellow-500 transition-colors">{highScores.platformer.toLocaleString()}</div>
                 </div>
              </div>

              {/* RACER */}
              <div onClick={() => startGame(GameMode.RACER)} className="group relative h-56 bg-zinc-900/40 border border-white/5 rounded-3xl p-6 transition-all duration-300 hover:border-orange-500/50 hover:bg-zinc-900/80 active:scale-[0.98] cursor-pointer overflow-hidden">
                 <div className="relative z-10">
                    <h3 className="text-xl font-orbitron font-bold text-white mb-1 group-hover:text-orange-400 transition-colors">NEON VELOCITY</h3>
                    <p className="text-zinc-500 text-[10px]">High Speed Racer</p>
                    <div className="mt-8 text-3xl font-bold text-zinc-700 group-hover:text-orange-500 transition-colors">{highScores.racer.toLocaleString()}</div>
                 </div>
              </div>

               {/* GRAVITY & COSMIC */}
               <div className="lg:col-span-1 grid grid-cols-2 gap-6">
                  <div onClick={() => startGame(GameMode.GRAVITY)} className="group bg-zinc-900/40 border border-white/5 rounded-3xl p-5 transition-all hover:border-purple-500/50 active:scale-95 cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center mb-3 text-purple-400 font-bold text-xs">G</div>
                    <div className="text-white font-bold font-orbitron text-sm">GRAVITY</div>
                    <div className="text-zinc-500 text-[10px] mt-1">{highScores.gravity}</div>
                  </div>
                  <div onClick={() => startGame(GameMode.COSMIC)} className="group bg-zinc-900/40 border border-white/5 rounded-3xl p-5 transition-all hover:border-cyan-500/50 active:scale-95 cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center mb-3 text-cyan-400 font-bold text-xs">C</div>
                    <div className="text-white font-bold font-orbitron text-sm">COSMIC</div>
                    <div className="text-zinc-500 text-[10px] mt-1">{highScores.cosmic}</div>
                  </div>
               </div>

            </div>
          </div>
        </div>
      )}

      {status === GameStatus.GAMEOVER && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-50 p-6 text-center backdrop-blur-sm">
          <div className="w-full max-w-md animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-orbitron font-bold text-red-600 mb-2 uppercase tracking-[0.5em]">Mission Failed</h2>
            <div className="text-8xl font-black text-white mb-8 tracking-tighter drop-shadow-2xl">{Math.floor(score)}</div>
            
            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 mb-8 w-full backdrop-blur-md">
              <div className="flex items-center gap-2 mb-3">
                 <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                 <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">AI Tactical Analysis</p>
              </div>
              <p className="text-white text-lg font-medium leading-relaxed">"{tip}"</p>
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={() => startGame(mode)} className="w-full py-5 bg-white text-black font-black font-orbitron rounded-xl text-lg uppercase tracking-wider hover:bg-zinc-200 active:scale-[0.98] transition-all">
                Retry Mission
              </button>
              <button onClick={() => setStatus(GameStatus.LOBBY)} className="w-full py-4 bg-transparent text-zinc-500 font-bold rounded-xl border border-zinc-800 hover:text-white hover:border-zinc-600 transition-all uppercase text-sm tracking-widest">
                Return to Base
              </button>
            </div>
          </div>
        </div>
      )}

      <UIOverlay />
    </div>
  );
};

export default App;
