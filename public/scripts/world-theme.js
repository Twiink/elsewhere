// 每次访问默认白天，在 React 启动前设置纸页底色。
(() => {
    document.documentElement.dataset.worldTheme = 'paper';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#fafafa');
})();
