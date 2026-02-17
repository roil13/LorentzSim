export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface SimulationParams {
  mass: number;      // kg (scaled)
  charge: number;    // C (scaled)
  velocity: Vector3; // m/s
  bField: Vector3;   // Tesla
}

export interface SimulationState {
  position: Vector3;
  velocity: Vector3;
  history: Vector3[];
  time: number;
}

export interface CameraState {
  pitch: number;
  yaw: number;
  zoom: number;
}
