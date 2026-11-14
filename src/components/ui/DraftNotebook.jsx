import { useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { notebookSurface, notebookTurnAt } from '../../utils/draftMotion';

const WORDS = ['想法先住在这里', '这一页，留给明天', '再试一次也可以'];
const WIDTH = 498, HEIGHT = 204, LIFT = 112;
const COLUMNS = 20, ROWS = 8;
const VERTICES = Array.from({ length: (COLUMNS + 1) * (ROWS + 1) }, (_, index) => {
    const u = Math.floor(index / (ROWS + 1)) / COLUMNS, v = (index % (ROWS + 1)) / ROWS;
    return { u, v, right: notebookSurface('right', u, v), left: notebookSurface('left', u, v) };
});
const TRIANGLES = [];
for (let u = 0; u < COLUMNS; u++) for (let v = 0; v < ROWS; v++) {
    const start = u * (ROWS + 1) + v;
    for (const indices of [[start, start + ROWS + 1, start + ROWS + 2], [start, start + ROWS + 2, start + 1]]) {
        TRIANGLES.push({ indices, right: indices.map(i => VERTICES[i].right), left: indices.map(i => VERTICES[i].left) });
    }
}

function writePage(context, words) {
    context.save();
    context.translate(286, 111);
    context.scale(1, 1 / 0.65);
    context.rotate(-4 * Math.PI / 180);
    context.font = '20px "霞鹜文楷", serif';
    context.fillStyle = '#514b40';
    context.textBaseline = 'middle';
    context.fillText(words, 0, 0);
    context.restore();
}

function triangle(context, image, source, destination, shade) {
    const [s0, s1, s2] = source, [d0, d1, d2] = destination;
    const ux = s1[0] - s0[0], uy = s1[1] - s0[1], vx = s2[0] - s0[0], vy = s2[1] - s0[1];
    const det = ux * vy - uy * vx;
    if (Math.abs(det) < 0.001) return;
    const dx = d1[0] - d0[0], dy = d1[1] - d0[1], ex = d2[0] - d0[0], ey = d2[1] - d0[1];
    const a = (dx * vy - ex * uy) / det, c = (ex * ux - dx * vx) / det;
    const b = (dy * vy - ey * uy) / det, d = (ey * ux - dy * vx) / det;
    context.save();
    context.beginPath();
    const center = [0, 1].map(axis => (d0[axis] + d1[axis] + d2[axis]) / 3);
    destination.forEach((point, i) => {
        const x = point[0] + (point[0] - center[0]) * 0.008;
        const y = point[1] + (point[1] - center[1]) * 0.008;
        if (i) context.lineTo(x, y); else context.moveTo(x, y);
    });
    context.closePath(); context.clip();
    context.transform(a, b, c, d, d0[0] - a * s0[0] - c * s0[1], d0[1] - b * s0[0] - d * s0[1]);
    context.drawImage(image, 0, 0);
    if (shade > 0) { context.fillStyle = `rgba(79, 66, 45, ${shade})`; context.fillRect(0, 0, WIDTH, HEIGHT); }
    context.restore();
}

export default function DraftNotebook({ src, turn, onTurn }) {
    const source = useRef();
    const canvas = useRef();
    const [loaded, setLoaded] = useState(false);
    const [turning, setTurning] = useState(false);
    const reducedMotion = useReducedMotion();

    useLayoutEffect(() => {
        if (!loaded) return;
        const surface = canvas.current;
        const context = surface.getContext('2d');
        const image = source.current;
        const previous = (turn - 1 + WORDS.length) % WORDS.length;
        const front = document.createElement('canvas');
        front.width = WIDTH; front.height = HEIGHT;
        const frontContext = front.getContext('2d');
        frontContext.drawImage(image, 0, 0); writePage(frontContext, WORDS[previous]);
        surface.width = WIDTH * 2; surface.height = (HEIGHT + LIFT) * 2;
        const base = () => {
            context.setTransform(2, 0, 0, 2, 0, LIFT * 2);
            context.clearRect(0, -LIFT, WIDTH, HEIGHT + LIFT);
            context.drawImage(image, 0, 0); writePage(context, WORDS[turn % WORDS.length]);
        };
        const paint = progress => {
            base();
            const bending = Math.sin(progress * Math.PI);
            context.save();
            context.beginPath();
            for (let i = 0; i <= COLUMNS; i++) {
                const p = notebookSurface('right', i / COLUMNS, 0);
                if (i) context.lineTo(...p); else context.moveTo(...p);
            }
            for (let i = COLUMNS; i >= 0; i--) context.lineTo(...notebookSurface('right', i / COLUMNS, 1));
            context.closePath(); context.clip();
            const shadow = context.createLinearGradient(252, 0, 420, 0);
            shadow.addColorStop(0, `rgba(73, 61, 46, ${bending * 0.22})`);
            shadow.addColorStop(1, 'rgba(73, 61, 46, 0)');
            context.fillStyle = shadow; context.fillRect(0, 0, WIDTH, HEIGHT); context.restore();
            const points = VERTICES.map(vertex => notebookTurnAt(vertex.u, vertex.v, progress, vertex.right, vertex.left));
            for (const cell of TRIANGLES) {
                const to = cell.indices.map(index => points[index]);
                const back = (to[1][0] - to[0][0]) * (to[2][1] - to[0][1]) - (to[1][1] - to[0][1]) * (to[2][0] - to[0][0]) < 0;
                triangle(context, back ? image : front, back ? cell.left : cell.right, to, bending * (back ? 0.045 : 0.025));
            }
            context.beginPath();
            for (let i = 0; i <= COLUMNS; i++) {
                const p = notebookTurnAt(i / COLUMNS, 0, progress);
                if (i) context.lineTo(...p); else context.moveTo(...p);
            }
            for (let i = 1; i <= ROWS; i++) context.lineTo(...notebookTurnAt(1, i / ROWS, progress));
            for (let i = COLUMNS - 1; i >= 0; i--) context.lineTo(...notebookTurnAt(i / COLUMNS, 1, progress));
            context.strokeStyle = 'rgba(101, 91, 75, 0.48)'; context.lineWidth = 0.9; context.stroke();
        };
        let frame, started;
        let active = true;
        if (turn && !reducedMotion) paint(0); else base();
        if (!turn) document.fonts.ready.then(() => { if (active) base(); });
        surface.dataset.ready = 'true';
        const update = time => {
            started ??= time;
            const t = reducedMotion ? 1 : Math.min(1, (time - started) / 1350);
            const progress = (1 - Math.cos(t * Math.PI)) / 2;
            surface.dataset.turnProgress = progress.toFixed(3);
            if (t < 1) { paint(progress); frame = requestAnimationFrame(update); }
            else { base(); setTurning(false); }
        };
        if (turn) frame = requestAnimationFrame(update);
        return () => { active = false; cancelAnimationFrame(frame); };
    }, [loaded, turn, reducedMotion]);

    return <button type="button" className="draft-object draft-object--notebook" aria-label="翻翻草稿本"
        aria-busy={turning} disabled={!loaded || turning} data-page={turn % WORDS.length}
        onClick={() => { if (!reducedMotion) setTurning(true); onTurn(); }}>
        <span className="draft-object-art">
            <img ref={source} src={src} alt="" draggable="false" style={{ visibility: loaded ? 'hidden' : undefined }} onLoad={() => setLoaded(true)} />
            <canvas ref={canvas} className="draft-book-render" aria-hidden="true" />
        </span>
        <span className="draft-object-label">翻翻草稿本</span>
        <span className="draft-book-description" aria-live="polite">{WORDS[turn % WORDS.length]}</span>
    </button>;
}
