import { useContext } from 'react';
import { useFrame } from '@react-three/fiber';
import { CorridorActivityContext } from '../context/CorridorActivityContext';

export function useActiveFrame(callback) {
  const activity = useContext(CorridorActivityContext);
  useFrame((state, delta, frame) => {
    if (!activity || activity.current) callback(state, Math.min(delta, 0.1), frame);
  });
}
