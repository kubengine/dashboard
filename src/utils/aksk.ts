// src/utils/aksk.ts
import CryptoJS from 'crypto-js'; // 安装：pnpm add crypto-js

/**
 * 获取时间戳（格式：YYYYMMDDHHmmss）
 */
export const getTimestamp = (): string => {
    const date = new Date();
    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
};

/**
 * 生成随机字符串（nonce）
 */
export const getNonce = (length = 16): string => {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let nonce = '';
    for (let i = 0; i < length; i++) {
        nonce += chars[Math.floor(Math.random() * chars.length)];
    }
    return nonce;
};

/**
 * AK/SK 签名（与后端算法一致：HMAC-SHA256 + Base64）
 */
export const signAKSK = ({
    ak,
    sk,
    timestamp,
    nonce,
}: {
    ak: string;
    sk: string;
    timestamp: string;
    nonce: string;
}): string => {
    const signStr = `${ak}${timestamp}${nonce}`;
    // HMAC-SHA256 加密 + Base64 编码
    const hmac = CryptoJS.HmacSHA256(signStr, sk);
    return CryptoJS.enc.Base64.stringify(hmac)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};