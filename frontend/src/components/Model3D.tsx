'use client';

import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

interface ModelProps {
  rotateX: number;
  rotateY: number;
}

function Model({ rotateX, rotateY }: ModelProps) {
  const { scene } = useGLTF('/brille.glb');
  const modelRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (modelRef.current) {
      modelRef.current.rotation.x = THREE.MathUtils.degToRad(rotateX);
      modelRef.current.rotation.y = THREE.MathUtils.degToRad(rotateY);
    }
  });

  return <primitive ref={modelRef} object={scene} scale={0.6} position={[0, 0, 0]} />;
}

interface Model3DProps {
  rotateX: number;
  rotateY: number;
}

export default function Model3D({ rotateX, rotateY }: Model3DProps) {
  return (
    <Canvas 
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={45} />
      <ambientLight intensity={1.2} />
      <hemisphereLight 
        color="#ffffff" 
        groundColor="#6b21a8" 
        intensity={0.5} 
        position={[0, 1, 0]}
      />
      <Model rotateX={rotateX} rotateY={rotateY} />
    </Canvas>
  );
}
