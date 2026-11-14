const base = '/media/images/textures/draft';
export const DRAFT_ASSETS = Object.fromEntries(['room', 'chair', 'pencil', 'notebook', 'mug', 'plane', 'paper-ball'].map(name => [name, `${base}/${name}-v1.webp`]));
export const DRAFT_ACTIONS = [
    { id: 'chair', label: '拉拉椅子', message: '坐一会儿，灵感不着急。' },
    { id: 'pencil', label: '试试铅笔', message: '第一笔，画出来了。' },
    { id: 'notebook', label: '翻翻草稿本', message: '下一页，还可以画点什么。' },
    { id: 'mug', label: '点点咖啡杯', message: '还热着，慢慢想。' },
    { id: 'plane', label: '放飞纸飞机', message: '让想法先飞一会儿。' },
    { id: 'paper-ball', label: '碰碰纸团', message: '揉掉的草稿，也有自己的弹性。' },
];
