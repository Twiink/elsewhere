export function getContactFormIssue({ siteUrl, hostname, accessKey }) {
    if (!accessKey) {
        return {
            reason: 'missing-key',
            message: '站内留言暂未开通，请通过邮箱或微信联系我。',
        };
    }
    if (!siteUrl || hostname !== new URL(siteUrl).hostname) {
        return {
            reason: 'preview',
            message: '当前页面用于预览，留言尚未发送。请通过邮箱或微信联系我。',
        };
    }
    return null;
}
