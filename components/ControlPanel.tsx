import React from 'react';
import { SimulationParams, Vector3 } from '../types';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface ControlPanelProps {
  params: SimulationParams;
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  isPlaying: boolean;
  togglePlay: () => void;
  resetSim: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  params, setParams, isPlaying, togglePlay, resetSim 
}) => {

  const updateVector = (key: keyof SimulationParams, axis: keyof Vector3, value: number) => {
    if (isNaN(value)) return;
    setParams(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] as Vector3),
        [axis]: value
      }
    }));
  };

  const updateScalar = (key: keyof SimulationParams, value: number) => {
    if (isNaN(value)) return;
    setParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getDirection = (v: Vector3) => {
    const mag = Math.sqrt(v.x**2 + v.y**2 + v.z**2);
    if (mag < 0.001) return "(0, 0, 0)";
    return `(${(v.x/mag).toFixed(2)}, ${(v.y/mag).toFixed(2)}, ${(v.z/mag).toFixed(2)})`;
  };

  const VectorInput = ({ label, pKey, step = 0.5, min = -10, max = 10 }: { label: string, pKey: 'velocity' | 'bField', step?: number, min?: number, max?: number }) => (
    <div className="mb-6 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
      <div className="flex flex-col mb-3 border-b border-slate-700 pb-2">
        <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-cyan-400 shadow-black drop-shadow-md">{label}</label>
            <span className="text-xs text-slate-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded">
            |{pKey === 'velocity' ? 'v' : 'B'}|: {Math.sqrt(params[pKey].x**2 + params[pKey].y**2 + params[pKey].z**2).toFixed(1)}
            </span>
        </div>
        <div className="flex justify-end mt-1">
            <span className="text-[10px] text-slate-500 font-mono">
                כיוון: {getDirection(params[pKey])}
            </span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {(['x', 'y', 'z'] as const).map(axis => (
          <div key={axis} className="flex items-center gap-2">
            <span className={`w-4 text-xs font-bold font-mono uppercase ${axis === 'x' ? 'text-red-400' : axis === 'y' ? 'text-green-400' : 'text-blue-400'}`}>{axis}</span>
            <input 
              type="range" 
              min={min} max={max} step={step} 
              value={params[pKey][axis]}
              onChange={(e) => updateVector(pKey, axis, parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
            />
            <input 
                type="number"
                value={params[pKey][axis]}
                step={step}
                onChange={(e) => updateVector(pKey, axis, parseFloat(e.target.value))}
                className="w-12 bg-transparent text-left font-mono text-xs text-slate-300 border-b border-slate-600 focus:border-cyan-400 outline-none appearance-none"
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-5 text-slate-200 w-full flex flex-col scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
      <h2 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
         <span className="w-1 h-5 bg-cyan-500 rounded-full"></span>
         הגדרות סימולציה
      </h2>

      {/* Charge & Mass */}
      <div className="mb-6 space-y-4 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
        <div>
            <div className="flex justify-between mb-2">
                <label className="text-sm font-semibold text-slate-300">מטען (q)</label>
                <input 
                    type="number"
                    value={params.charge}
                    step="0.5"
                    onChange={(e) => updateScalar('charge', parseFloat(e.target.value))}
                    className={`w-16 bg-transparent text-left font-mono text-xs font-bold border-b border-slate-600 focus:border-cyan-400 outline-none ${params.charge > 0 ? 'text-red-400' : params.charge < 0 ? 'text-blue-400' : 'text-slate-400'}`}
                />
            </div>
            <input 
                type="range" min="-5" max="5" step="0.5"
                value={params.charge}
                onChange={(e) => updateScalar('charge', parseFloat(e.target.value))}
                className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${params.charge > 0 ? 'accent-red-500' : 'accent-blue-500'}`}
            />
        </div>
        <div>
            <div className="flex justify-between mb-2">
                <label className="text-sm font-semibold text-slate-300">מסה (m)</label>
                <input 
                    type="number"
                    value={params.mass}
                    step="0.5"
                    min="0.1"
                    onChange={(e) => updateScalar('mass', parseFloat(e.target.value))}
                    className="w-16 bg-transparent text-left font-mono text-xs text-slate-300 border-b border-slate-600 focus:border-cyan-400 outline-none"
                />
            </div>
            <input 
                type="range" min="0.5" max="10" step="0.5"
                value={params.mass}
                onChange={(e) => updateScalar('mass', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
        </div>
      </div>

      {/* Vectors */}
      <VectorInput label="מהירות (v)" pKey="velocity" min={-20} max={20} />
      <VectorInput label="שדה מגנטי (B)" pKey="bField" min={-5} max={5} step={0.1} />

      <div className="mt-auto space-y-3 pt-4 border-t border-slate-700/50">
         <div className="flex gap-2">
            <button 
                onClick={togglePlay}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold shadow-lg transition-all transform active:scale-95 ${isPlaying ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/30 hover:bg-green-500/20'}`}
            >
                {isPlaying ? <><Pause size={18} /> השהה</> : <><Play size={18} /> נגן</>}
            </button>
            <button 
                onClick={resetSim}
                className="flex items-center justify-center w-12 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 transition-all shadow-lg active:scale-95 border border-slate-600"
                title="אפס סימולציה"
            >
                <RotateCcw size={20} />
            </button>
         </div>
      </div>
    </div>
  );
};

export default ControlPanel;