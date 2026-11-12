// 每帧只做少量准备工作；前台进入优先于后台预取。
export function createFrameQueue({
    requestFrame = callback => requestAnimationFrame(callback),
    now = () => performance.now(),
    budgetMs = 4,
    maxJobs = 16,
} = {}) {
    const pending = [];
    let scheduled = false;

    function flush() {
        scheduled = false;
        const started = now();
        let completed = 0;
        while (pending.length && completed < maxJobs && (completed === 0 || now() - started < budgetMs)) {
            pending.sort((a, b) => a.priority - b.priority);
            const job = pending.shift();
            try { job.resolve(job.run()); }
            catch (error) { job.reject(error); }
            completed++;
        }
        if (pending.length && !scheduled) {
            scheduled = true;
            requestFrame(flush);
        }
    }

    return {
        enqueue(run, priority = 0) {
            let job;
            const promise = new Promise((resolve, reject) => {
                job = { run, resolve, reject, priority };
                pending.push(job);
            });
            if (!scheduled) {
                scheduled = true;
                requestFrame(flush);
            }
            return { promise, prioritize() { job.priority = 0; } };
        },
    };
}
