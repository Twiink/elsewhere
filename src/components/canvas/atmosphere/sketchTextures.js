import { CanvasTexture, SRGBColorSpace } from 'three';

function stroke(ctx, points, width = 2, color = '#68645b') {
    ctx.beginPath();
    points.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
}

function hatch(ctx, x, y, width, height, gap = 9) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();
    for (let i = -height; i < width + height; i += gap) stroke(ctx, [[x + i, y + height], [x + i + height, y]], 0.8, '#aaa69b');
    ctx.restore();
}

function mast(ctx) {
    ctx.fillStyle = '#f3f1e9';
    ctx.fillRect(64, 68, 68, 668);
    for (const x of [63, 69, 125, 133]) stroke(ctx, [[x, 67], [x - 1, 736]], x === 63 || x === 133 ? 2.2 : 1);
    for (let y = 92; y < 720; y += 57) {
        stroke(ctx, [[66, y], [130, y + 56], [66, y + 56], [130, y]], 1.4);
        stroke(ctx, [[73, y + 5], [123, y + 49]], 0.5, '#aaa69b');
        for (const x of [66, 130]) { ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.stroke(); }
    }
    stroke(ctx, [[42, 747], [66, 708], [130, 708], [155, 747]], 2.5);
    stroke(ctx, [[30, 748], [162, 748]], 2.4);
    hatch(ctx, 67, 630, 62, 105, 8);
    ctx.fillStyle = '#e9e7de'; ctx.fillRect(43, 47, 108, 28);
    stroke(ctx, [[43, 75], [43, 47], [152, 47], [152, 75], [43, 75]], 2);
    stroke(ctx, [[78, 48], [92, 12], [110, 48]], 1.8);
    for (let y = 145; y < 580; y += 17) stroke(ctx, [[95, y], [105, y]], 0.9);
}

function jib(ctx) {
    const top = 69;
    ctx.fillStyle = '#f6f4ed'; ctx.fillRect(30, top, 958, 52);
    stroke(ctx, [[25, top], [991, top - 2], [996, 122], [25, 122], [25, top]], 2.5);
    stroke(ctx, [[31, top + 5], [987, top + 3]], 0.7, '#a19b8f');
    for (let x = 30; x < 980; x += 43) stroke(ctx, [[x, 121], [x + 21, top], [x + 43, 121]], 1.5);
    stroke(ctx, [[40, 70], [288, 8], [923, 69]], 1.7);
    stroke(ctx, [[100, 70], [288, 11], [665, 69]], 0.8);
    ctx.fillStyle = '#dedbd1'; ctx.fillRect(41, 119, 101, 28); hatch(ctx, 41, 119, 101, 28, 6);
    stroke(ctx, [[40, 119], [142, 119], [142, 147], [40, 147], [40, 119]], 1.8);
    ctx.fillStyle = '#f3f1e7'; ctx.fillRect(302, 117, 65, 34);
    stroke(ctx, [[301, 118], [365, 118], [370, 151], [301, 151], [301, 118]], 1.8);
    stroke(ctx, [[311, 122], [353, 122], [357, 142], [311, 142], [311, 122]], 1.1);
}

function hook(ctx) {
    stroke(ctx, [[61, 0], [62, 305], [68, 322], [65, 332], [51, 339], [40, 333], [39, 322]], 2.4);
    stroke(ctx, [[66, 0], [67, 305]], 0.7, '#a5a092');
    ctx.fillStyle = '#e2dfd5'; ctx.fillRect(53, 293, 23, 20);
    hatch(ctx, 53, 293, 23, 20, 5);
    stroke(ctx, [[53, 293], [76, 293], [76, 313], [53, 313], [53, 293]], 1.6);
}

function island(ctx) {
    const back = new Path2D('M50 357 Q145 337 208 270 Q271 242 320 175 Q348 194 385 167 Q430 109 466 94 Q510 129 552 170 Q582 169 622 214 Q660 205 704 179 Q741 215 793 233 Q849 207 886 172 Q926 199 971 249 Q1061 269 1101 297 Q1208 307 1285 337 Q1393 342 1482 368 L1459 406 Q1100 390 764 410 Q397 407 79 397 Z');
    ctx.fillStyle = '#e5e6dd'; ctx.fill(back); ctx.strokeStyle = '#96988a'; ctx.lineWidth = 2.3; ctx.stroke(back);
    ctx.save();
    ctx.clip(back);
    for (let i = 0; i < 58; i++) {
        const x = 180 + i * 19;
        const y = 205 + Math.sin(i * 1.7) * 75;
        stroke(ctx, [[x, y], [x + 12, y + 34], [x + 29, y + 63]], 0.9, '#b3b6a6');
    }
    ctx.restore();
    const front = new Path2D('M54 362 Q212 329 319 310 Q377 297 433 319 Q568 266 690 303 Q790 264 912 301 Q1042 295 1150 335 Q1328 335 1472 371 L1451 408 Q1132 394 831 421 Q509 406 81 402 Z');
    ctx.fillStyle = '#ced4c5'; ctx.fill(front); ctx.strokeStyle = '#777e6e'; ctx.lineWidth = 2; ctx.stroke(front);
    stroke(ctx, [[320, 175], [356, 234], [343, 276], [399, 298]], 1.4, '#aaa99a');
    stroke(ctx, [[466, 96], [446, 169], [474, 226], [452, 265]], 1.7, '#a2a697');
    stroke(ctx, [[886, 175], [866, 224], [895, 276]], 1.5, '#a5aa9a');
    for (let i = 0; i < 29; i++) {
        const x = 234 + i * 32 + Math.sin(i * 4) * 20;
        const y = 333 + Math.sin(i * 0.9) * 16;
        const h = 20 + (Math.sin(i * 8) + 1) * 12;
        stroke(ctx, [[x, y + 12], [x + 1, y - h]], 1.2, '#717867');
        for (let j = 0; j < 4; j++) {
            const ty = y - h + j * 8;
            const w = 5 + j * 3;
            stroke(ctx, [[x - w, ty + 10], [x, ty], [x + w, ty + 11]], 1.3, '#828b76');
        }
    }
    ctx.fillStyle = '#f0ede1'; ctx.fillRect(1055, 325, 48, 34);
    stroke(ctx, [[1047, 326], [1076, 301], [1111, 327], [1047, 326]], 2, '#767668');
    stroke(ctx, [[1055, 327], [1055, 359], [1103, 359], [1103, 327]], 1.5);
    hatch(ctx, 1057, 329, 44, 28, 7);
    ctx.fillStyle = '#f0ede1'; ctx.fillRect(1070, 341, 10, 18);
    stroke(ctx, [[1070, 359], [1070, 341], [1080, 341], [1080, 359]], 1.1);
    stroke(ctx, [[1090, 338], [1098, 338], [1098, 345], [1090, 345], [1090, 338]], 1);
    for (let i = 0; i < 43; i++) {
        const x = 80 + i * 32;
        const y = 374 + Math.sin(i * 2.3) * 9;
        stroke(ctx, [[x, y], [x + 8, y + 13], [x + 22, y + 8]], 1, '#94988b');
    }
    for (let i = 0; i < 12; i++) stroke(ctx, [[160 + i * 92, 437 + (i % 3) * 9], [214 + i * 92, 437 + (i % 3) * 9]], 1, '#b5b7ac');
}

function smoke(ctx) {
    const shape = new Path2D('M70 199 C28 187 23 148 47 128 C20 89 54 49 88 65 C93 24 151 18 167 58 C207 44 235 81 215 112 C246 151 219 190 184 185 C163 220 111 224 100 201 Q84 205 70 199 Z');
    ctx.fillStyle = 'rgba(177,174,161,.24)'; ctx.fill(shape);
    ctx.strokeStyle = 'rgba(111,109,98,.74)'; ctx.lineWidth = 2; ctx.stroke(shape);
    ctx.strokeStyle = 'rgba(139,134,120,.28)';
    ctx.beginPath(); ctx.ellipse(131, 136, 49, 32, -0.4, 0.2, Math.PI * 1.8); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(111, 101, 31, 28, 0.3, 0.5, Math.PI * 1.8); ctx.stroke();
    for (let i = 0; i < 8; i++) stroke(ctx, [[72 + i * 11, 180], [82 + i * 11, 166]], 0.8, 'rgba(125,122,108,.2)');
}

function firefly(ctx) {
    ctx.fillStyle = 'rgba(216,190,111,.12)';
    ctx.beginPath(); ctx.ellipse(64, 75, 28, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(217,209,168,.35)'; ctx.strokeStyle = '#a39974'; ctx.lineWidth = 1.3;
    for (const [x, angle] of [[51, -0.55], [77, 0.55]]) {
        ctx.beginPath(); ctx.ellipse(x, 51, 11, 20, angle, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#c5a65b'; ctx.beginPath(); ctx.ellipse(64, 75, 8, 15, 0, 0, Math.PI * 2); ctx.fill();
    stroke(ctx, [[64, 48], [64, 78]], 2.2, '#83774c');
    ctx.fillStyle = '#8b8059'; ctx.beginPath(); ctx.arc(64, 45, 4, 0, Math.PI * 2); ctx.fill();
    stroke(ctx, [[61, 42], [56, 35]], 1, '#a1946c'); stroke(ctx, [[67, 42], [73, 35]], 1, '#a1946c');
}

const definitions = {
    mast: [192, 768, mast], jib: [1024, 160, jib], hook: [128, 350, hook],
    island: [1536, 512, island], smoke: [256, 256, smoke], firefly: [128, 128, firefly],
    dust: [64, 64, ctx => { ctx.fillStyle = '#9d9583'; ctx.beginPath(); ctx.ellipse(32, 32, 7, 4, -0.5, 0, Math.PI * 2); ctx.fill(); }],
};

export function createSketchTexture(kind) {
    const [width, height, draw] = definitions[kind];
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    draw(ctx);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.name = `hand-drawn-${kind}`;
    return texture;
}
