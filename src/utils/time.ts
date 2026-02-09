import dayjs from "dayjs";

export const getRelativeTime = (targetTime: string) => {
  if (!targetTime) return "";

  try {
    const target = dayjs(targetTime);
    const now = dayjs();
    const diffInSeconds = now.diff(target, "second");
    const diffInMinutes = now.diff(target, "minute");
    const diffInHours = now.diff(target, "hour");
    const diffInDays = now.diff(target, "day");
    const diffInMonths = now.diff(target, "month");
    const diffInYears = now.diff(target, "year");

    if (diffInYears > 0) {
      return `${diffInYears}年前`;
    } else if (diffInMonths > 0) {
      return `${diffInMonths}个月前`;
    } else if (diffInDays > 0) {
      return `${diffInDays}天前`;
    } else if (diffInHours > 0) {
      return `${diffInHours}小时前`;
    } else if (diffInMinutes > 0) {
      return `${diffInMinutes}分钟前`;
    } else if (diffInSeconds > 30) {
      return `${diffInSeconds}秒前`;
    } else {
      return "刚刚";
    }
  } catch (error) {
    console.error("相对时间计算错误:", error);
    return "";
  }
};