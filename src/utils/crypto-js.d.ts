// 项目已使用 crypto-js 运行时依赖；这里只声明当前使用的 SHA-256 接口。
declare module 'crypto-js' {
  const CryptoJS: {
    SHA256(message: string): { toString(): string };
  };
  export default CryptoJS;
}
