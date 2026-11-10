import { forwardRef, Children, Suspense } from 'react';
import { Text } from '@react-three/drei';
import { sceneFont, fullFont, characters, unavailable } from 'virtual:site-font';
import { needsFullFont } from '../../utils/fontCoverage';

const coverage = new Set(characters);
const unsupported = new Set(unavailable);

// DOM 与三维文字保留同一份字形；访客输入的新字符按需使用完整字体。
const SiteText = forwardRef(function SiteText({ children, font, ...props }, ref) {
  let text = '';
  Children.forEach(children, child => {
    if (typeof child === 'string' || typeof child === 'number') text += child;
  });
  const isSiteFont = !font || font === sceneFont || font === fullFont;
  const needsFull = isSiteFont && needsFullFont(text, coverage, unsupported);
  const resolvedFont = isSiteFont ? (needsFull ? fullFont : sceneFont) : font;
  const element = <Text ref={ref} {...props} font={resolvedFont}>{children}</Text>;
  // 输入额外字符时，仅该文字等待完整字体，保持房间与表单可交互。
  return needsFull ? <Suspense fallback={null}>{element}</Suspense> : element;
});

export default SiteText;
