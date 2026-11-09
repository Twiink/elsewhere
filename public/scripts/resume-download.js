(() => {
  const labels = new WeakMap();

  // 跨域 PDF 通过 Blob 下载，使中文文件名在主站与独立链接页保持一致。
  document.addEventListener('click', async event => {
    const link = event.target?.closest?.('a[data-resume-download]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (link.getAttribute('aria-busy') === 'true') return;

    if (!labels.has(link)) labels.set(link, link.textContent);
    link.setAttribute('aria-busy', 'true');
    link.textContent = '正在准备下载…';
    let objectUrl;
    try {
      const response = await fetch(link.href, { mode: 'cors', credentials: 'omit' });
      if (!response.ok) throw new Error('简历下载失败');
      objectUrl = URL.createObjectURL(await response.blob());
      const fileLink = document.createElement('a');
      fileLink.href = objectUrl;
      fileLink.download = link.download;
      document.body.append(fileLink);
      fileLink.click();
      fileLink.remove();
      link.textContent = labels.get(link);
    } catch {
      link.textContent = '下载失败，点击重试';
    } finally {
      link.removeAttribute('aria-busy');
      if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    }
  });
})();
