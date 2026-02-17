import React, { useState } from 'react';
import SimulationCanvas from './components/SimulationCanvas';
import ControlPanel from './components/ControlPanel';
import { SimulationParams } from './types';

const App: React.FC = () => {
  // Initial Simulation Parameters
  const [params, setParams] = useState<SimulationParams>({
    mass: 2,
    charge: 1,
    velocity: { x: 5, y: 0, z: 2 },
    bField: { x: 0, y: 0, z: 2 },
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [simKey, setSimKey] = useState(0); // Used to force reset of canvas state
  const [showControls, setShowControls] = useState(true);

  const togglePlay = () => setIsPlaying(!isPlaying);
  
  // Callback to allow the canvas to stop the simulation (e.g. when out of bounds)
  const handleStop = () => setIsPlaying(false);

  const resetSim = () => {
    setSimKey(prev => prev + 1);
    setIsPlaying(true);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 font-sans" dir="rtl">
      
      {/* Full Screen Simulation Area */}
      <div className="absolute inset-0 z-0">
        <SimulationCanvas 
            key={simKey} 
            params={params} 
            isPlaying={isPlaying} 
            onReset={resetSim}
            onStop={handleStop}
        />
      </div>

      {/* Header Overlay */}
      <div className="absolute top-4 right-4 z-10 pointer-events-none">
          <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-blue-600 drop-shadow-sm filter drop-shadow-lg">
              Lorentz<span className="font-light text-slate-400">Sim</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium">כוח לורנץ בשדה מגנטי</p>
      </div>

      {/* Physics Formula Overlay (Left Side) */}
      <div className="absolute top-4 left-4 z-10 p-3 rounded-lg bg-slate-900/40 backdrop-blur-md border border-slate-700/50 text-slate-300 text-xs font-mono select-none shadow-lg">
          <p className="font-bold text-cyan-400 mb-1">נוסחאות:</p>
          <p>F = q(v × B)</p>
          <p>a = F / m</p>
          <div className="mt-2 text-[10px] text-slate-400">
             <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> מהירות (v)</div>
             <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-600"></span> שדה מגנטי (B)</div>
          </div>
      </div>

      {/* Floating Control Panel */}
      <div className={`absolute right-0 top-24 bottom-4 transition-transform duration-300 ease-in-out z-20 ${showControls ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-row">
            <button 
                onClick={() => setShowControls(!showControls)}
                className="self-center -mr-1 h-12 w-6 bg-slate-800 rounded-l-md border-y border-l border-slate-700 flex items-center justify-center hover:bg-slate-700 hover:text-cyan-400 transition-colors shadow-xl"
                title={showControls ? "הסתר תפריט" : "הצג תפריט"}
            >
                {showControls ? '›' : '‹'}
            </button>
            <div className="h-full w-80 bg-slate-900/80 backdrop-blur-xl border-l border-slate-700/50 shadow-2xl rounded-l-xl overflow-hidden">
                <ControlPanel 
                    params={params} 
                    setParams={setParams} 
                    isPlaying={isPlaying}
                    togglePlay={togglePlay}
                    resetSim={resetSim}
                />
            </div>
        </div>
      </div>

      {/* Show toggler when hidden */}
      {!showControls && (
        <button 
            onClick={() => setShowControls(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 h-16 w-8 bg-slate-800/80 backdrop-blur border-y border-l border-slate-600 rounded-l-lg flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:w-10 transition-all shadow-lg"
        >
            ‹
        </button>
      )}

    </div>
  );
};

export default App;