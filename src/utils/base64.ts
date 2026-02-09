/**
 * Base64 编码（浏览器环境）：普通字符串 → Base64 字符串
 * @param str 原始普通字符串（支持中文）
 * @returns Base64 编码字符串
 */
export const base64Encode = (str: string): string => {
    // 边界处理：空字符串直接返回
    if (!str || typeof str !== 'string') return '';

    try {
        // 步骤 1：转义 Unicode 字符（解决中文乱码）
        const escapedStr = encodeURIComponent(str);
        // 步骤 2：将转义后的字符串转为 ASCII 格式
        const asciiStr = unescape(escapedStr);
        // 步骤 3：Base64 编码
        return btoa(asciiStr);
    } catch (error) {
        console.error('Base64 编码失败：', error);
        return '';
    }
};

/**
 * Base64 解码（浏览器环境）：Base64 字符串 → 普通字符串
 * @param base64Str Base64 编码字符串
 * @returns 原始普通字符串（支持中文还原）
 */
export const base64Decode = (base64Str: string): string => {
    // 边界处理：空字符串直接返回
    if (!base64Str || typeof base64Str !== 'string') return '';

    try {
        // 步骤 1：Base64 解码为 ASCII 格式
        const asciiStr = atob(base64Str);
        // 步骤 2：还原 Unicode 字符（解决中文乱码）
        const escapedStr = escape(asciiStr);
        // 步骤 3：解码为原始字符串
        return decodeURIComponent(escapedStr);
    } catch (error) {
        console.error('Base64 解码失败（无效的 Base64 格式）：', error);
        return '';
    }
};