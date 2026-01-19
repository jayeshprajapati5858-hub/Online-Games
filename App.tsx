
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
    <div className="relative w-full h-screen bg-black select-none overflow-hidden touch-none font-inter">
      
      {status === GameStatus.PLAYING && <GameComponent />}

      {status === GameStatus.LOBBY && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505] z-50 p-6 overflow-y-auto">
          <div className="w-full max-w-5xl">
            <header className="text-center mb-10">
              <div className="inline-block px-3 py-1 bg-red-600/20 text-red-500 text-[10px] font-bold rounded-full uppercase tracking-widest mb-4 border border-red-500/30">
                Premium Mobile Gaming
              </div>
              <h1 className="text-5xl font-orbitron font-bold text-white tracking-tighter">
                ELITE<span className="text-red-600">HUB</span>
              </h1>
              <p className="text-zinc-500 text-sm mt-2 font-medium">તમારું મિશન પસંદ કરો</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-10">
              {/* SUPER NEXUS */}
              <div onClick={() => startGame(GameMode.PLATFORMER)} className="group relative bg-yellow-900/10 border-2 border-yellow-500/30 rounded-3xl p-6 transition-all hover:border-yellow-400 hover:bg-yellow-900/20 active:scale-95 cursor-pointer overflow-hidden col-span-1 ring-4 ring-yellow-400/10">
                <div className="absolute top-0 right-0 p-4 bg-yellow-500 text-black text-[8px] font-black uppercase rounded-bl-xl">HOT</div>
                <h3 className="text-2xl font-orbitron font-bold text-white mb-1">SUPER NEXUS</h3>
                <p className="text-zinc-500 text-[10px] mb-4">Adventure Platformer</p>
                <div className="text-[10px] text-zinc-500 uppercase">High Score: <span className="text-yellow-400 font-bold">{highScores.platformer}</span></div>
              </div>

              {/* BATTLE ZONE */}
              <div onClick={() => startGame(GameMode.BATTLE)} className="group relative bg-red-900/10 border border-zinc-800 rounded-3xl p-6 transition-all hover:border-red-500 hover:bg-red-900/20 active:scale-95 cursor-pointer overflow-hidden">
                <h3 className="text-xl font-orbitron font-bold text-white mb-1">BATTLE ZONE</h3>
                <p className="text-zinc-500 text-[10px] mb-4">Survival Battle Royale</p>
                <div className="text-[10px] text-zinc-500 uppercase">High Score: <span className="text-red-400">{highScores.battle}</span></div>
              </div>

              {/* STRIKE */}
              <div onClick={() => startGame(GameMode.STRIKE)} className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl p-6 transition-all hover:border-blue-500/50 hover:bg-zinc-800/50 active:scale-95 cursor-pointer overflow-hidden">
                <h3 className="text-xl font-orbitron font-bold text-white">SHADOW STRIKE</h3>
                <p className="text-zinc-500 text-[10px] mb-4">Tactical Shooter</p>
                <div className="text-[10px] text-zinc-500 uppercase">High Score: <span className="text-blue-400">{highScores.strike}</span></div>
              </div>

              {/* RACER */}
              <div onClick={() => startGame(GameMode.RACER)} className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl p-6 transition-all hover:border-orange-500/50 hover:bg-zinc-800/50 active:scale-95 cursor-pointer overflow-hidden">
                <h3 className="text-xl font-orbitron font-bold text-white">NEON VELOCITY</h3>
                <p className="text-zinc-500 text-[10px] mb-4">Cyber Racer</p>
                <div className="text-[10px] text-zinc-500 uppercase">High Score: <span className="text-orange-400">{highScores.racer}</span></div>
              </div>

              {/* GRAVITY */}
              <div onClick={() => startGame(GameMode.GRAVITY)} className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl p-6 transition-all hover:border-purple-500/50 hover:bg-zinc-800/50 active:scale-95 cursor-pointer overflow-hidden">
                <h3 className="text-xl font-orbitron font-bold text-white">GRAVITY FLIP</h3>
                <p className="text-zinc-500 text-[10px] mb-4">Fast Platformer</p>
                <div className="text-[10px] text-zinc-500 uppercase">High Score: <span className="text-purple-400">{highScores.gravity}</span></div>
              </div>

              {/* COSMIC */}
              <div onClick={() => startGame(GameMode.COSMIC)} className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl p-6 transition-all hover:border-yellow-500/50 hover:bg-zinc-800/50 active:scale-95 cursor-pointer overflow-hidden">
                <h3 className="text-xl font-orbitron font-bold text-white">COSMIC DEFENDER</h3>
                <p className="text-zinc-500 text-[10px] mb-4">Space Shooter</p>
                <div className="text-[10px] text-zinc-500 uppercase">High Score: <span className="text-yellow-400">{highScores.cosmic}</span></div>
              </div>
            </div>

            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 text-center mb-8">
               <p className="text-yellow-500 text-xs font-semibold">{dailyBonus || "નવું બોનસ ટૂંક સમયમાં..."}</p>
            </div>
          </div>
        </div>
      )}

      {status === GameStatus.GAMEOVER && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-50 p-6 text-center">
          <h2 className="text-xl font-orbitron font-bold text-red-500 mb-2 uppercase tracking-widest">Mission Terminated</h2>
          <div className="text-7xl font-bold text-white mb-8 tracking-tighter">{Math.floor(score)}</div>
          
          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 max-w-xs mb-8 w-full">
            <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] mb-3 font-bold">Gemini Intel</p>
            <p className="text-white text-md font-medium leading-tight">"{tip}"</p>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button onClick={() => startGame(mode)} className="w-full py-4 bg-white text-black font-bold rounded-2xl text-lg active:scale-95 transition-transform">TRY AGAIN</button>
            <button onClick={() => setStatus(GameStatus.LOBBY)} className="w-full py-4 bg-zinc-800 text-white font-bold rounded-2xl border border-zinc-700">BACK TO HUB</button>
          </div>
        </div>
      )}

      <UIOverlay />
    </div>
  );
};

export default App;
