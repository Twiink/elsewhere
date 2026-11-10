// 同一资源的前台加载与空闲预取共用 Promise；失败后允许后续请求重试。
export function createResourceCache(load) {
  const pending = new Map();
  return key => {
    if (!pending.has(key)) {
      const promise = Promise.resolve().then(() => load(key)).catch(error => {
        pending.delete(key);
        throw error;
      });
      pending.set(key, promise);
    }
    return pending.get(key);
  };
}
