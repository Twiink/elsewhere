import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// 控制台签名，供 Awwwards 评审查看。
if (typeof window !== 'undefined') {
  console.log(
    "%c TOM KING %c 个人作品集 %c",
    'background: #111; color: #fff; padding: 5px 10px; font-weight: bold; border-radius: 3px 0 0 3px;',
    'background: #f33; color: #fff; padding: 5px 10px; font-weight: bold; border-radius: 0 3px 3px 0;',
    'background: transparent'
  );
  console.log(
    "%c欢迎来访！%c一起看看代码与交互实现。🚀",
    'font-weight: bold; color: #f33; font-size: 14px;',
    'color: #666; font-size: 14px;'
  );
}


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
