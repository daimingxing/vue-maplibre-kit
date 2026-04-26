/**
 * 当前环境无法联网安装 Vitest 时，先提供最小类型兜底，
 * 避免测试文件与配置文件阻塞库本身的构建校验。
 * 一旦安装真实依赖，该声明会自动被真实类型覆盖。
 */
declare module 'vitest' {
  // 覆盖常用测试 API，保证离线/最小依赖场景下类型可解析。
  export const describe: any;
  export const it: any;
  export const expect: any;
  export const expectTypeOf: any;
  export const afterEach: any;
  export const vi: any;
}

declare module 'vitest/config' {
  export function defineConfig(config: any): any;
}
