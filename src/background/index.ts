/**
 * 公众号阅读增强插件 - 背景脚本
 * 处理扩展生命周期和全局状态
 */

import { Settings, BackgroundMessage, BackgroundResponse } from '../types';

// 监听扩展安装
// @ts-ignore
chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
  if (details.reason === 'install') {
    // 初始化默认设置
    const defaultSettings: Settings = {
      tocWidth: 280, // 目录宽度
      autoExpand: true, // 自动展开目录
      minLevel: 1, // 识别的最小标题级别
      maxLevel: 6, // 识别的最大标题级别
      isEnabled: true, // 插件是否启用
    };
    
    // 存储默认设置
    // @ts-ignore
    chrome.storage.sync.set({ settings: defaultSettings }, () => {
      console.log('默认设置已初始化');
    });
    
    // 打开欢迎页面
    // chrome.tabs.create({ url: 'welcome.html' });
  }
});

// 监听来自内容脚本的消息
// @ts-ignore
chrome.runtime.onMessage.addListener((
  message: BackgroundMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: BackgroundResponse) => void
) => {
  if (message.type === 'GET_SETTINGS') {
    // 获取设置并返回给内容脚本
    // @ts-ignore
    chrome.storage.sync.get('settings', (data: { settings?: Settings }) => {
      sendResponse({ settings: data.settings as Settings });
    });
    return true; // 保持消息通道打开以便异步响应
  }
  
  if (message.type === 'SAVE_SETTINGS') {
    // 保存用户设置
    // @ts-ignore
    chrome.storage.sync.set({ settings: message.settings }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  return false;
});

// 仅用于保持服务工作进程活动
console.log('公众号阅读增强插件背景服务工作进程已启动'); 