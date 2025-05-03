/**
 * 公众号阅读增强插件 - 背景脚本
 * 处理扩展生命周期和全局状态
 */

import { Settings, BackgroundMessage, BackgroundResponse } from "../types";

// 监听扩展安装
// @ts-ignore
chrome.runtime.onInstalled.addListener(
  (details: chrome.runtime.InstalledDetails) => {
    if (details.reason === "install") {
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
        console.log("默认设置已初始化");
      });

      // 打开欢迎页面
      // chrome.tabs.create({ url: 'welcome.html' });
    }
  }
);

// 监听来自内容脚本的消息
// @ts-ignore
chrome.runtime.onMessage.addListener(
  (
    message: BackgroundMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: BackgroundResponse) => void
  ) => {
    if (message.type === "GET_SETTINGS") {
      // 获取设置并返回给内容脚本
      // @ts-ignore
      chrome.storage.sync.get("settings", (data: { settings?: Settings }) => {
        sendResponse({ settings: data.settings as Settings });
      });
      return true; // 保持消息通道打开以便异步响应
    }

    if (message.type === "SAVE_SETTINGS") {
      // 保存用户设置
      // @ts-ignore
      chrome.storage.sync.set({ settings: message.settings }, () => {
        sendResponse({ success: true });
      });
      return true;
    }

    if (message.type === "REPORT_SCRIPT_LEAK") {
      // 记录脚本泄露报告
      console.warn("收到脚本泄露报告:", message.details);

      // 可以将报告存储到 storage 中以便分析
      // @ts-ignore
      chrome.storage.local.get("scriptLeakReports", (data) => {
        const reports = data.scriptLeakReports || [];
        reports.push({
          timestamp: Date.now(),
          url: sender.tab?.url || "unknown",
          details: message.details,
        });

        // 最多保留10条记录
        if (reports.length > 10) {
          reports.shift();
        }

        // @ts-ignore
        chrome.storage.local.set({ scriptLeakReports: reports });
      });

      sendResponse({ success: true });
      return true;
    }

    return false;
  }
);

// 定期检查所有活动标签页以发现可能的脚本泄露问题
function checkActiveTabsForLeaks() {
  // @ts-ignore
  chrome.tabs.query(
    {
      active: true,
      url: ["https://mp.weixin.qq.com/s*"],
    },
    (tabs) => {
      if (tabs.length > 0) {
        tabs.forEach((tab) => {
          if (tab.id) {
            // 向内容脚本发送清理命令
            // @ts-ignore
            chrome.tabs
              .sendMessage(tab.id, {
                type: "CLEAN_SCRIPT_LEAK",
              })
              .catch((err) => {
                // 忽略错误（可能是内容脚本尚未加载）
              });
          }
        });
      }
    }
  );
}

// 每分钟检查一次可能的脚本泄露
setInterval(checkActiveTabsForLeaks, 60000);

// 监听标签页更新事件
// @ts-ignore
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 当页面完成加载时，如果是微信公众号页面，检查脚本泄露
  if (
    changeInfo.status === "complete" &&
    tab.url?.includes("mp.weixin.qq.com/s")
  ) {
    setTimeout(() => {
      // @ts-ignore
      chrome.tabs
        .sendMessage(tabId, {
          type: "CLEAN_SCRIPT_LEAK",
        })
        .catch((err) => {
          // 忽略错误（可能是内容脚本尚未加载）
        });
    }, 2000); // 等待2秒确保内容脚本已加载
  }
});

// 仅用于保持服务工作进程活动
console.log("公众号阅读增强插件背景服务工作进程已启动");
