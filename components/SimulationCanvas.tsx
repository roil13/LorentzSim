import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SimulationParams, SimulationState, Vector3, CameraState } from '../types';

interface SimulationCanvasProps {
  params: SimulationParams;
  isPlaying: boolean;
  onReset: () => void;
  onStop: () => void;
}

const AXIS_DRAW_EXTENT = 100000; // Virtually infinite
const BOUNDS_LIMIT = 320; 
const TRAIL_LENGTH = 3000; 
const DT = 0.05; 

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ params, isPlaying, onReset, onStop }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  
  // Simulation State
  const stateRef = useRef<SimulationState>({
    position: { x: 0, y: 0, z: 0 },
    velocity: { ...params.velocity },
    history: [],
    time: 0,
  });

  const paramsRef = useRef(params);
  const prevParamsRef = useRef(params);

  // Camera State 
  const [camera, setCamera] = useState<CameraState>({ pitch: 0.3, yaw: -Math.PI / 2, zoom: 1.2 });
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Handle parameter updates
  useEffect(() => {
    const prevV = prevParamsRef.current.velocity;
    const newV = params.velocity;
    
    if (prevV.x !== newV.x || prevV.y !== newV.y || prevV.z !== newV.z) {
        stateRef.current.velocity = { ...newV };
    }

    paramsRef.current = params;
    prevParamsRef.current = params;
  }, [params]);

  const resetSimulation = useCallback(() => {
    stateRef.current = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { ...params.velocity },
      history: [],
      time: 0,
    };
  }, [params]);

  // Physics Engine: Runge-Kutta 4
  const stepPhysics = () => {
    const { position: r, velocity: v } = stateRef.current;
    
    // Check bounds - stop if out of bounds
    if (Math.abs(r.x) > BOUNDS_LIMIT || Math.abs(r.y) > BOUNDS_LIMIT || Math.abs(r.z) > BOUNDS_LIMIT) {
        onStop();
        return;
    }

    const { mass, charge, bField } = paramsRef.current;
    
    // Acceleration function a(v) = (q/m) * (v x B)
    const accel = (vel: Vector3): Vector3 => {
      const qm = charge / mass;
      // Cross Product
      const crossX = vel.y * bField.z - vel.z * bField.y;
      const crossY = vel.z * bField.x - vel.x * bField.z;
      const crossZ = vel.x * bField.y - vel.y * bField.x;
      return { x: qm * crossX, y: qm * crossY, z: qm * crossZ };
    };

    // RK4 Integration
    const a1 = accel(v);
    const k1v = { x: a1.x * DT, y: a1.y * DT, z: a1.z * DT };
    const k1r = { x: v.x * DT, y: v.y * DT, z: v.z * DT };

    const v2 = { x: v.x + k1v.x * 0.5, y: v.y + k1v.y * 0.5, z: v.z + k1v.z * 0.5 };
    const a2 = accel(v2);
    const k2v = { x: a2.x * DT, y: a2.y * DT, z: a2.z * DT };
    const k2r = { x: v2.x * DT, y: v2.y * DT, z: v2.z * DT };

    const v3 = { x: v.x + k2v.x * 0.5, y: v.y + k2v.y * 0.5, z: v.z + k2v.z * 0.5 };
    const a3 = accel(v3);
    const k3v = { x: a3.x * DT, y: a3.y * DT, z: a3.z * DT };
    const k3r = { x: v3.x * DT, y: v3.y * DT, z: v3.z * DT };

    const v4 = { x: v.x + k3v.x, y: v.y + k3v.y, z: v.z + k3v.z };
    const a4 = accel(v4);
    const k4v = { x: a4.x * DT, y: a4.y * DT, z: a4.z * DT };
    const k4r = { x: v4.x * DT, y: v4.y * DT, z: v4.z * DT };

    const newV = {
      x: v.x + (k1v.x + 2 * k2v.x + 2 * k3v.x + k4v.x) / 6,
      y: v.y + (k1v.y + 2 * k2v.y + 2 * k3v.y + k4v.y) / 6,
      z: v.z + (k1v.z + 2 * k2v.z + 2 * k3v.z + k4v.z) / 6,
    };

    const newR = {
      x: r.x + (k1r.x + 2 * k2r.x + 2 * k3r.x + k4r.x) / 6,
      y: r.y + (k1r.y + 2 * k2r.y + 2 * k3r.y + k4r.y) / 6,
      z: r.z + (k1r.z + 2 * k2r.z + 2 * k3r.z + k4r.z) / 6,
    };

    stateRef.current.velocity = newV;
    stateRef.current.position = newR;
    stateRef.current.time += DT;
    
    stateRef.current.history.push(newR);
    if (stateRef.current.history.length > TRAIL_LENGTH) {
      stateRef.current.history.shift();
    }
  };

  // 3D Projection Helper
  const project = (p: Vector3, width: number, height: number): { x: number, y: number, scale: number } => {
    const { pitch, yaw, zoom } = camera;
    
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const x1 = p.x * cosY - p.y * sinY;
    const y1 = p.x * sinY + p.y * cosY;
    const z1 = p.z;

    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    
    const y2 = y1 * cosP - z1 * sinP;
    const z2 = y1 * sinP + z1 * cosP;
    
    const fov = 600;
    const cameraDistance = 400;
    const depth = cameraDistance + y2; 
    
    const perspective = fov / Math.max(1, depth); 
    const scale = perspective * zoom;
    
    const centerX = width / 2 - 100; 

    return {
      x: x1 * scale + centerX,
      y: -z2 * scale + height / 2, 
      scale: scale
    };
  };

  const getLabelPosition = (origin: Vector3, axisTip: Vector3, width: number, height: number) => {
    const p0 = project(origin, width, height);
    const p1 = project(axisTip, width, height);
    
    const padding = 25;
    const minX = padding, maxX = width - padding;
    const minY = padding, maxY = height - padding;

    let t0 = 0, t1 = 1;
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    
    const p = [-dx, dx, -dy, dy];
    const q = [p0.x - minX, maxX - p0.x, p0.y - minY, maxY - p0.y];

    for (let i = 0; i < 4; i++) {
        if (p[i] === 0) {
            if (q[i] < 0) return null; 
        } else {
            const t = q[i] / p[i];
            if (p[i] < 0) {
                if (t > t1) return null;
                if (t > t0) t0 = t;
            } else {
                if (t < t0) return null;
                if (t < t1) t1 = t;
            }
        }
    }
    
    if (t0 > t1) return null;

    return {
        x: p0.x + t1 * dx,
        y: p0.y + t1 * dy
    };
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
    }
    
    const { width, height } = canvas;
    
    // Background
    const bgGrad = ctx.createRadialGradient(width/2 - 100, height/2, 0, width/2, height/2, width);
    bgGrad.addColorStop(0, '#1e293b');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Helper functions
    const drawLine3D = (p1: Vector3, p2: Vector3, color: string, widthLine = 1, dashed = false) => {
      const start = project(p1, width, height);
      const end = project(p2, width, height);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = widthLine;
      if (dashed) ctx.setLineDash([5, 5]);
      else ctx.setLineDash([]);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawArrow3D = (origin: Vector3, vector: Vector3, color: string, lengthScale = 1, headBase = 8) => {
        const magnitude = Math.sqrt(vector.x**2 + vector.y**2 + vector.z**2);
        if (magnitude < 0.1) return;

        const endPoint = {
            x: origin.x + vector.x * lengthScale,
            y: origin.y + vector.y * lengthScale,
            z: origin.z + vector.z * lengthScale
        };
        
        const start = project(origin, width, height);
        const end = project(endPoint, width, height);

        // Bounds check for optimization (simple box check)
        const padding = 50;
        if (start.x < -padding || start.x > width + padding || start.y < -padding || start.y > height + padding) {
             // If start is off screen, check end. If both off, skip.
             if (end.x < -padding || end.x > width + padding || end.y < -padding || end.y > height + padding) {
                return;
             }
        }

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.5 * start.scale; 
        ctx.stroke();

        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLen = headBase * end.scale; 
        const headAngle = Math.PI / 12; 

        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle - headAngle), end.y - headLen * Math.sin(angle - headAngle));
        ctx.lineTo(end.x - headLen * Math.cos(angle + headAngle), end.y - headLen * Math.sin(angle + headAngle));
        ctx.lineTo(end.x, end.y);
        ctx.fillStyle = color;
        ctx.fill();
    };

    // Axes Lines
    drawLine3D({x:-AXIS_DRAW_EXTENT, y:0, z:0}, {x:AXIS_DRAW_EXTENT, y:0, z:0}, '#475569'); 
    drawLine3D({x:0, y:-AXIS_DRAW_EXTENT, z:0}, {x:0, y:AXIS_DRAW_EXTENT, z:0}, '#475569'); 
    drawLine3D({x:0, y:0, z:-AXIS_DRAW_EXTENT}, {x:0, y:0, z:AXIS_DRAW_EXTENT}, '#475569'); 

    // Labels with sticky positioning
    ctx.font = 'bold 14px Assistant';
    
    const xPos = getLabelPosition({x:0,y:0,z:0}, {x:AXIS_DRAW_EXTENT,y:0,z:0}, width, height);
    if (xPos) {
        ctx.fillStyle = '#f87171'; 
        ctx.fillText('X', xPos.x, xPos.y);
    }
    
    const yPos = getLabelPosition({x:0,y:0,z:0}, {x:0,y:AXIS_DRAW_EXTENT,z:0}, width, height);
    if (yPos) {
        ctx.fillStyle = '#4ade80'; 
        ctx.fillText('Y', yPos.x, yPos.y);
    }

    const zPos = getLabelPosition({x:0,y:0,z:0}, {x:0,y:0,z:AXIS_DRAW_EXTENT}, width, height);
    if (zPos) {
        ctx.fillStyle = '#60a5fa'; 
        ctx.fillText('Z', zPos.x, zPos.y);
    }

    // B-Field Grid (Expanded for infinite feel)
    const bVec = paramsRef.current.bField;
    const bMag = Math.sqrt(bVec.x**2 + bVec.y**2 + bVec.z**2);
    if (bMag > 0.1) {
        const spacing = 120; // Wider spacing
        const count = 4; // Covers roughly -500 to 500
        for (let x = -count; x <= count; x++) {
            for (let y = -count; y <= count; y++) {
                for (let z = -count; z <= count; z++) {
                    const origin = { x: x * spacing, y: y * spacing, z: z * spacing };
                    drawArrow3D(origin, bVec, 'rgba(148, 163, 184, 0.15)', 8, 10);
                }
            }
        }
    }

    // Trajectory
    const history = stateRef.current.history;
    if (history.length > 1) {
      ctx.beginPath();
      const start = project(history[0], width, height);
      ctx.moveTo(start.x, start.y);
      
      for (let i = 1; i < history.length; i++) {
        const p = project(history[i], width, height);
        ctx.lineTo(p.x, p.y);
      }
      
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.2)'); 
      gradient.addColorStop(1, 'rgba(6, 182, 212, 1)');   
      
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Particle
    const pos = stateRef.current.position;
    const screenPos = project(pos, width, height);
    const size = Math.max(1, 2 * screenPos.scale);
    
    // Particle Body (Drawn BEFORE Arrow)
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2);
    ctx.fillStyle = paramsRef.current.charge > 0 ? '#ef4444' : (paramsRef.current.charge < 0 ? '#3b82f6' : '#94a3b8');
    ctx.shadowBlur = 8;
    ctx.shadowColor = ctx.fillStyle;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Velocity Vector (Drawn AFTER Particle - "Coming out")
    drawArrow3D(pos, stateRef.current.velocity, '#facc15', 0.6, 5);
  };

  const animate = (time: number) => {
    if (isPlaying) {
      stepPhysics();
    }
    draw();
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, camera]); 

  // Camera Controls
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    
    setCamera(prev => ({
      ...prev,
      yaw: prev.yaw + dx * 0.005,
      pitch: Math.max(-Math.PI/2, Math.min(Math.PI/2, prev.pitch + dy * 0.005))
    }));
    
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };
  
  const handleWheel = (e: React.WheelEvent) => {
      setCamera(prev => ({
          ...prev,
          zoom: Math.max(0.1, Math.min(5, prev.zoom - e.deltaY * 0.001))
      }));
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative cursor-move touch-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
        <canvas ref={canvasRef} className="block w-full h-full" />
        <div className="absolute bottom-6 left-6 text-xs text-slate-500 select-none pointer-events-none font-mono">
            <p>גרירה: סיבוב | גלגלת: זום</p>
            <p>X: {stateRef.current.position.x.toFixed(1)} Y: {stateRef.current.position.y.toFixed(1)} Z: {stateRef.current.position.z.toFixed(1)}</p>
        </div>
    </div>
  );
};

export default SimulationCanvas;