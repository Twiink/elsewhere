// 昼夜共用空间坐标；主题只控制材质和颜色。
export const SEGMENT_LENGTH = 80;
export const CORRIDOR_START_Z = 10;
export const WALL_X_OUTER = 3.5;
export const WALL_X_INNER = 1.7;
export const DOOR_Z_SPAN = 4;
export const CORRIDOR_HEIGHT = 3.5;
export const WALL_LENGTH = Math.hypot(WALL_X_OUTER - WALL_X_INNER, DOOR_Z_SPAN);
export const BASE_WALL_ANGLE = Math.atan2(WALL_X_OUTER - WALL_X_INNER, DOOR_Z_SPAN);

export const CORRIDOR_DOORS = [
    { roomId: 'gallery', relativeZ: -18, side: 'left', label: '作品画廊' },
    { roomId: 'studio', relativeZ: -32, side: 'right', label: '生活手记' },
    { roomId: 'about', relativeZ: -48, side: 'left', label: '关于我', enterDistance: 25 },
    { roomId: 'contact', relativeZ: -62, side: 'right', label: '联系我' },
];

export function corridorDoorZ(roomId, segmentIndex = 0) {
    const door = CORRIDOR_DOORS.find(candidate => candidate.roomId === roomId);
    return door ? CORRIDOR_START_Z - segmentIndex * SEGMENT_LENGTH + door.relativeZ + 2 : undefined;
}
