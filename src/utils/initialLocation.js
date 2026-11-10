export function parseStudioLink(search) {
  const parameters = new URLSearchParams(search);
  return { noteId: parameters.get('note'), wishes: parameters.get('view') === 'wishes' };
}

// 在路由同步元信息前捕获，供稍后加载的阅读面板使用。
export const initialStudioLink = parseStudioLink(globalThis.location?.search ?? '');
