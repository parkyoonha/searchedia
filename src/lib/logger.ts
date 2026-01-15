const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: any[]) => {
    // 에러는 항상 출력 (프로덕션에서도 필요)
    console.error(...args);
  },
  table: (...args: any[]) => {
    if (isDev) console.table(...args);
  }
};
