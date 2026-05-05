import React, { useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PointerLockControls, Environment, BakeShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Link } from 'react-router-dom';

function Player() {
  const [movement, setMovement] = useState({
    forward: false, backward: false, left: false, right: false
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.code) {
        case 'KeyW': setMovement(m => ({ ...m, forward: true })); break;
        case 'KeyS': setMovement(m => ({ ...m, backward: true })); break;
        case 'KeyA': setMovement(m => ({ ...m, left: true })); break;
        case 'KeyD': setMovement(m => ({ ...m, right: true })); break;
        default: break;
      }
    };
    const handleKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW': setMovement(m => ({ ...m, forward: false })); break;
        case 'KeyS': setMovement(m => ({ ...m, backward: false })); break;
        case 'KeyA': setMovement(m => ({ ...m, left: false })); break;
        case 'KeyD': setMovement(m => ({ ...m, right: false })); break;
        default: break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state) => {
    const speed = 0.2;
    const { forward, backward, left, right } = movement;
    const vector = new THREE.Vector3(
      Number(right) - Number(left),
      0,
      Number(backward) - Number(forward)
    );
    
    vector.normalize().multiplyScalar(speed);
    vector.applyQuaternion(state.camera.quaternion);
    vector.y = 0; 
    
    state.camera.position.add(vector);
    
    // Boundary collision
    if (state.camera.position.x > 18) state.camera.position.x = 18;
    if (state.camera.position.x < -18) state.camera.position.x = -18;
    if (state.camera.position.z > 28) state.camera.position.z = 28;
    if (state.camera.position.z < -28) state.camera.position.z = -28;
  });

  return null;
}

function CarDisplay({ position, rotation }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.1]} castShadow receiveShadow>
        <boxGeometry args={[4.2, 2.7, 0.2]} />
        <meshStandardMaterial color="#D4AF37" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh castShadow>
        <planeGeometry args={[4, 2.5]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, -1.6, 0.1]} castShadow>
        <boxGeometry args={[3, 0.4, 0.1]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </group>
  );
}

function ShowroomHall() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[40, 60]} />
        <meshStandardMaterial color="#050505" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 8, 0]} receiveShadow>
        <planeGeometry args={[40, 60]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[20, 3, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[60, 10]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      <mesh position={[-20, 3, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[60, 10]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      <mesh position={[0, 3, -30]} receiveShadow>
        <planeGeometry args={[40, 10]} />
        <meshStandardMaterial color="#020202" />
      </mesh>
      <mesh position={[0, 3, 30]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[40, 10]} />
        <meshStandardMaterial color="#020202" />
      </mesh>

      <CarDisplay position={[-19.8, 1, -20]} rotation={[0, Math.PI / 2, 0]} />
      <CarDisplay position={[-19.8, 1, -10]} rotation={[0, Math.PI / 2, 0]} />
      <CarDisplay position={[-19.8, 1, 0]} rotation={[0, Math.PI / 2, 0]} />
      <CarDisplay position={[19.8, 1, -20]} rotation={[0, -Math.PI / 2, 0]} />
      <CarDisplay position={[19.8, 1, -10]} rotation={[0, -Math.PI / 2, 0]} />
      <CarDisplay position={[19.8, 1, 0]} rotation={[0, -Math.PI / 2, 0]} />
      
      <spotLight position={[0, 7, -25]} angle={0.3} penumbra={1} intensity={2} color="#D4AF37" castShadow />
      <mesh position={[0, -2, -25]}>
        <cylinderGeometry args={[3, 3, 0.5, 32]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  );
}

export default function Showroom() {
  const [locked, setLocked] = useState(false);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden m-0 p-0">
      {!locked && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 text-white">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 tracking-tighter text-center" style={{fontFamily: 'Syncopate, sans-serif'}}>
            VIRTUAL <span style={{color: '#D4AF37'}}>SHOWROOM</span>
          </h1>
          <p className="text-xl text-white/50 mb-12">Immersive First-Person Experience</p>
          <div className="flex gap-16 mb-12 text-sm text-white/40 tracking-widest uppercase">
            <div className="flex flex-col items-center gap-2">
              <div className="text-2xl font-bold text-[#D4AF37]">W A S D</div>
              <span>Move</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="text-2xl font-bold text-[#D4AF37]">MOUSE</div>
              <span>Look Around</span>
            </div>
          </div>
          <button 
            className="px-12 py-5 rounded-full text-lg font-bold tracking-[0.2em] uppercase bg-white/5 text-[#D4AF37] hover:scale-105 hover:bg-white/10 transition-transform"
            onClick={() => setLocked(true)}
          >
            Enter Experience
          </button>
          <Link to="/" className="mt-8 text-xs text-white/30 uppercase hover:text-white transition-colors tracking-widest">
            Return to Standard View
          </Link>
        </div>
      )}
      {locked && (
        <div className="absolute top-8 left-8 z-50">
          <p className="text-white/50 text-xs tracking-widest uppercase bg-black/50 px-4 py-2 rounded-full border border-white/10">
            Press ESC to exit
          </p>
        </div>
      )}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/50 pointer-events-none z-40 mix-blend-difference" />
      
      {locked && typeof Canvas !== 'undefined' ? (
        <Canvas shadows camera={{ position: [0, 0, 25], fov: 60 }}>
          <fog attach="fog" args={['#050505', 10, 50]} />
          <ambientLight intensity={0.2} />
          <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
          <Environment preset="night" />
          <ShowroomHall />
          <Player />
          <PointerLockControls onLock={() => setLocked(true)} onUnlock={() => setLocked(false)} />
          <BakeShadows />
        </Canvas>
      ) : !locked ? (
        <div className="absolute inset-0 bg-black" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/20 font-heading text-xs uppercase tracking-widest">
          3D Engine Initializing...
        </div>
      )}
    </div>
  );
}

