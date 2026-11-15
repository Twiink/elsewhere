const mix = (a, b, t) => a + (b - a) * t;

function cubic(points, t) {
    const s = 1 - t;
    return [0, 1].map(axis => s ** 3 * points[0][axis] + 3 * s * s * t * points[1][axis]
        + 3 * s * t * t * points[2][axis] + t ** 3 * points[3][axis]);
}

const FLIGHT_CURVES = [
    [[1167.5, 377.8], [1250, 316], [1220, 185], [1085, 185]],
    [[1085, 185], [925, 185], [840, 330], [896, 414]],
    [[896, 414], [952, 498], [1085, 439.6], [1167.5, 377.8]],
    [[1167.5, 377.8], [1233.5, 328.36], [1320, 265], [1395, 210]],
];

function sampleCurves(curves) {
    const samples = [];
    let distance = 0;
    for (const [segment, points] of curves.entries()) {
        for (let step = segment ? 1 : 0; step <= 100; step++) {
            const progress = step / 100;
            const point = cubic(points, progress);
            const previous = samples.at(-1);
            if (previous) distance += Math.hypot(point[0] - previous.x, point[1] - previous.y);
            const tangent = [0, 1].map(axis => 3 * (1 - progress) ** 2 * (points[1][axis] - points[0][axis])
                + 6 * (1 - progress) * progress * (points[2][axis] - points[1][axis])
                + 3 * progress ** 2 * (points[3][axis] - points[2][axis]));
            let angle = Math.atan2(tangent[1], tangent[0]);
            if (previous) angle += Math.round((previous.angle - angle) / (2 * Math.PI)) * 2 * Math.PI;
            samples.push({ x: point[0], y: point[1], angle, distance, segment });
        }
    }
    return { samples, distance };
}

const FLIGHT = sampleCurves(FLIGHT_CURVES);

function smoothRange(start, end, value) {
    const progress = Math.max(0, Math.min(1, (value - start) / (end - start)));
    return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
}

function along(path, progress) {
    const distance = path.distance * Math.max(0, Math.min(1, progress));
    const index = path.samples.findIndex(point => point.distance >= distance);
    const end = path.samples[Math.max(0, index)];
    const start = path.samples[Math.max(0, index - 1)];
    const t = end.distance === start.distance ? 0 : (distance - start.distance) / (end.distance - start.distance);
    return { x: mix(start.x, end.x, t), y: mix(start.y, end.y, t),
        angle: (mix(start.angle, end.angle, t) - path.samples[0].angle) * 180 / Math.PI,
        exiting: end.segment >= 3 };
}

export function planeFlightAt(progress) {
    const time = Math.max(0, Math.min(1, progress));
    const pose = along(FLIGHT, time * time * (3 - 2 * time));
    const depth = pose.exiting ? smoothRange(1230, 1415, pose.x) : 0;
    return { ...pose, scale: 1 - 0.925 * depth, opacity: 1 - smoothRange(0.86, 1, time),
        occlusion: pose.exiting ? smoothRange(1315, 1385, pose.x) : 0,
        follow: smoothRange(0.56, 0.85, time) };
}

const SPINE = [[247, 31], [253, 76], [250, 144], [266, 188]];
const PAGES = {
    right: {
        top: [[247, 31], [288, -4], [367, 8], [415, 8]],
        outer: [[415, 8], [435, 28], [456, 112], [479, 166]],
        bottom: [[266, 188], [319, 155], [425, 169], [479, 166]],
    },
    left: {
        top: [[247, 31], [204, -8], [129, 23], [66, 31]],
        outer: [[66, 31], [44, 53], [27, 129], [18, 175]],
        bottom: [[266, 188], [211, 155], [118, 180], [18, 175]],
    },
};

// Both ends follow the existing illustration's curved paper edges.
export function notebookSurface(side, u, v) {
    const page = PAGES[side];
    const top = cubic(page.top, u), bottom = cubic(page.bottom, u);
    const spine = cubic(SPINE, v), outer = cubic(page.outer, v);
    return [0, 1].map(axis => mix(top[axis], bottom[axis], v) + mix(spine[axis], outer[axis], u)
        - mix(mix(page.top[0][axis], page.top[3][axis], u), mix(page.bottom[0][axis], page.bottom[3][axis], u), v));
}

export function notebookTurnAt(u, v, progress, right = notebookSurface('right', u, v), left = notebookSurface('left', u, v)) {
    const theta = Math.PI * progress - 0.3 * Math.sin(Math.PI * progress) * (1 - u);
    const weight = (1 - Math.cos(theta)) / 2;
    return [mix(right[0], left[0], weight) + 14 * Math.sin(theta) * Math.sin(Math.PI * u),
        mix(right[1], left[1], weight) - Math.sin(theta) * (86 * u + 12 * Math.sin(Math.PI * u))];
}
