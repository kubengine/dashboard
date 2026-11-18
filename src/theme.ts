/** 工作台共用设计令牌；字体与图标均由本地系统或项目依赖提供。 */
export const consoleTheme = {
  token: {
    colorPrimary: '#2563eb',
    colorInfo: '#2563eb',
    colorSuccess: '#168568',
    colorWarning: '#b76b08',
    colorError: '#d03f49',
    colorText: '#172b4d',
    colorTextSecondary: '#596b83',
    colorBorder: '#dce3ed',
    colorBorderSecondary: '#e8edf4',
    colorBgLayout: '#f4f7fb',
    borderRadius: 8,
    fontSize: 14,
    controlHeight: 36,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
  components: {
    Button: {
      primaryShadow: '0 2px 3px rgba(37, 99, 235, 0.12)',
      fontWeight: 500,
    },
    Card: { headerFontSize: 15, headerHeight: 56, paddingLG: 24 },
    Table: {
      headerBg: '#f7f9fc',
      headerColor: '#596b83',
      rowHoverBg: '#f4f8ff',
      cellPaddingBlock: 16,
    },
    Tabs: { horizontalItemGutter: 28 },
  },
};
