
import React from 'react';

const UIOverlay: React.FC = () => {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      {/* Screen vignette for realism */}
      <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
      
      {/* Scanline effect for tactical feel */}
      <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(transparent_50%,rgba(255,255,255,0.5)_50%)] bg-[length:100%_4px]" />

      {/* Floating Monetezation info (Mock) */}
      <div className="absolute bottom-6 right-6 pointer-events-auto">
        <div className="group relative">
           <button className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-700 hover:bg-zinc-800 transition-all flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                 <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                   <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 11V5h2v6H9zm0 4v-2h2v2H9z" />
                 </svg>
              </div>
              <div className="text-left">
                <div className="text-white text-xs font-bold uppercase tracking-tighter">Earnings</div>
                <div className="text-green-500 text-sm font-orbitron">$0.00</div>
              </div>
           </button>
           
           <div className="absolute bottom-full right-0 mb-4 w-64 bg-zinc-900 border border-zinc-700 p-4 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <h4 className="text-white font-bold mb-2">કેવી રીતે કમાણી કરવી?</h4>
              <p className="text-zinc-400 text-xs leading-relaxed">
                ૧. ૧૦,૦૦૦ સ્કોર કરો.<br/>
                ૨. દરરોજના પડકારો પૂર્ણ કરો.<br/>
                ૩. તમારા ફ્રેન્ડ્સને ઇન્વાઇટ કરો.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default UIOverlay;
