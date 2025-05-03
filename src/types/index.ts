/**
 * 公众号阅读增强插件 - 类型定义
 */

// 目录项数据结构
export interface TocItem {
  id: string; // 标题元素的唯一ID
  level: number; // 标题级别 (1-6)
  text: string; // 标题文本内容
  element: HTMLElement; // 原始DOM元素引用
  children: TocItem[]; // 子标题项
  isExpanded: boolean; // 是否展开子项
}

// 插件设置
export interface Settings {
  tocWidth: number; // 目录宽度
  minLevel: number; // 识别的最小标题级别
  maxLevel: number; // 识别的最大标题级别
  isEnabled: boolean; // 插件是否启用
}

// 脚本泄露报告
export interface ScriptLeakReport {
  timestamp: number; // 报告时间戳
  url: string; // 发生泄露的页面URL
  details: any; // 泄露详情
}

// 背景脚本消息类型
export type BackgroundMessage =
  | { type: "GET_SETTINGS" }
  | { type: "SAVE_SETTINGS"; settings: Settings }
  | { type: "REPORT_SCRIPT_LEAK"; details: any }
  | { type: "CLEAN_SCRIPT_LEAK" };

// 背景脚本响应类型
export type BackgroundResponse = { settings: Settings } | { success: boolean };
