/**
 * 存储相关工具函数
 */

import { Settings } from "../types";

/**
 * 获取插件设置
 * @returns Promise，解析为设置对象
 */
export function getSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    // @ts-ignore
    chrome.storage.sync.get("settings", (data: { settings?: Settings }) => {
      // 默认设置
      const defaultSettings: Settings = {
        tocWidth: 280,
        minLevel: 1,
        maxLevel: 6,
        isEnabled: true,
      };

      resolve(data.settings || defaultSettings);
    });
  });
}

/**
 * 保存插件设置
 * @param settings 要保存的设置
 * @returns Promise，解析为是否成功
 */
export function saveSettings(settings: Settings): Promise<boolean> {
  return new Promise((resolve) => {
    // @ts-ignore
    chrome.storage.sync.set({ settings }, () => {
      resolve(true);
    });
  });
}

/**
 * 向背景脚本发送消息
 * @param message 消息对象
 * @returns Promise，解析为响应结果
 */
export function sendMessage<T>(message: any): Promise<T> {
  return new Promise((resolve) => {
    // @ts-ignore
    chrome.runtime.sendMessage(message, (response: T) => {
      resolve(response);
    });
  });
}

/**
 * 保存用户上次阅读位置
 * @param url 文章URL
 * @param position 滚动位置
 */
export function saveReadingPosition(url: string, position: number): void {
  const key = `reading_position_${hashString(url)}`;
  const data = { url, position, timestamp: Date.now() };

  // @ts-ignore
  chrome.storage.local.set({ [key]: data });
}

/**
 * 获取用户上次阅读位置
 * @param url 文章URL
 * @returns Promise，解析为上次阅读位置
 */
export function getReadingPosition(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const key = `reading_position_${hashString(url)}`;

    // @ts-ignore
    chrome.storage.local.get(key, (result: any) => {
      const data = result[key];

      if (data && data.url === url) {
        resolve(data.position);
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * 简单的字符串哈希函数
 * @param str 输入字符串
 * @returns 哈希值
 */
function hashString(str: string): string {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(36);
}
