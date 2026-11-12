import { PlaneGeometry } from 'three';

// 形状一致的云共用顶点缓冲；尺寸由 mesh 缩放保持。
export const cloudGeometry = new PlaneGeometry(1, 1);
