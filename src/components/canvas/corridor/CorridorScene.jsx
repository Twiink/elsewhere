import InfiniteCorridorManager from './InfiniteCorridorManager';
import TeleportRoom from './TeleportRoom';
import StartupReady from '../StartupReady';
import { useCallback, useRef, useState } from 'react';

export default function CorridorScene({ onDoorEnter, hasEntered, setCameraOverride, onReady, onError }) {
    const root = useRef();
    const [ready, setReady] = useState(false);
    const handleReady = useCallback(() => { setReady(true); onReady(); }, [onReady]);
    return <group ref={root} visible={ready}>
        <StartupReady root={root} onReady={handleReady} onError={onError} />
        <InfiniteCorridorManager
            onDoorEnter={onDoorEnter}
            hideDoorsForSegments={hasEntered ? [] : [-1]}
            clipSegmentNeg1={!hasEntered}
            setCameraOverride={setCameraOverride}
        />
        <TeleportRoom />
    </group>;
}
