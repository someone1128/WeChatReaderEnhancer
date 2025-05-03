/**
 * 公众号阅读增强插件 - 内容脚本入口
 */

import { Settings, TocItem } from "../types";
import { getSettings } from "../utils/storage";
import { findHeadings } from "../utils/dom";
import { findArticleContainer, buildTocTree, getArticleTitle } from "./toc";
import {
  createTocContainer,
  renderTocTree,
  restorePanelState,
  getTocContainer,
  getTocList,
} from "./ui";
import { initScrollObserver, destroyScrollObserver } from "./observer";
import { initImageViewer, destroyImageViewer } from "./imageViewer";
import { detectAndCleanScriptLeak } from "../utils/safeDOM";

// 全局变量
let tocItems: TocItem[] = [];
let settings: Settings;
let isInitialized = false;

/**
 * 初始化插件
 */
async function init(): Promise<void> {
  // 防止重复初始化
  if (isInitialized) return;

  try {
    console.log("公众号阅读增强插件启动中...");

    // 先检测并清理可能的脚本泄露
    detectAndCleanScriptLeak();

    // 获取插件设置
    settings = await getSettings();

    // 如果插件被禁用，直接返回
    if (!settings.isEnabled) {
      console.log("公众号阅读增强插件已禁用");
      return;
    }

    // 等待DOM加载完成
    if (document.readyState !== "complete") {
      await new Promise<void>((resolve) => {
        window.addEventListener("load", () => resolve());
      });
    }

    // 再次检测并清理可能的脚本泄露（页面完全加载后）
    detectAndCleanScriptLeak();

    // 查找文章容器
    const articleContainer = findArticleContainer();
    if (!articleContainer) {
      console.warn("未找到文章容器");
      return;
    }

    // 识别文章中的标题
    const headingElements = findHeadings(
      articleContainer,
      settings.minLevel,
      settings.maxLevel
    );

    if (headingElements.length === 0) {
      console.warn("未找到标题元素");
      return;
    }

    // 构建目录树
    tocItems = buildTocTree(headingElements);
    if (tocItems.length === 0) {
      console.warn("生成目录树失败");
      return;
    }

    // 获取文章标题
    const articleTitle = getArticleTitle();

    // 创建目录容器
    const tocContainer = createTocContainer(articleTitle, settings);

    // 将目录容器添加到页面
    document.body.appendChild(tocContainer);

    // 确保tocList可用
    const tocList = getTocList();
    if (!tocList) {
      console.warn("目录列表元素不可用");
      return;
    }

    // 渲染目录树到tocList
    renderTocTree(tocItems, tocList);

    // 恢复面板状态（展开/折叠）
    restorePanelState();

    // 初始化滚动监听
    initScrollObserver(tocItems);

    // 初始化图片查看器
    initImageViewer();

    // 设置定期检查脚本泄露
    setInterval(detectAndCleanScriptLeak, 5000);

    // 标记为已初始化
    isInitialized = true;

    console.log("公众号阅读增强插件初始化完成");
  } catch (error) {
    console.error("公众号阅读增强插件初始化失败:", error);
  }
}

/**
 * 清理插件
 */
function cleanup(): void {
  // 移除目录容器
  const tocContainer = getTocContainer();
  if (tocContainer && tocContainer.parentNode) {
    tocContainer.parentNode.removeChild(tocContainer);
  }

  // 销毁滚动监听器
  destroyScrollObserver();

  // 销毁图片查看器
  destroyImageViewer();

  // 重置状态
  tocItems = [];
  isInitialized = false;

  console.log("公众号阅读增强插件已清理");
}

/**
 * 处理设置变化
 * @param newSettings 新的设置
 */
function handleSettingsChange(newSettings: Settings): void {
  // 如果启用状态改变
  if (settings.isEnabled !== newSettings.isEnabled) {
    if (newSettings.isEnabled) {
      init();
    } else {
      cleanup();
    }
  }

  // 如果其他设置改变且插件当前启用，重新初始化
  else if (
    newSettings.isEnabled &&
    (settings.minLevel !== newSettings.minLevel ||
      settings.maxLevel !== newSettings.maxLevel ||
      settings.tocWidth !== newSettings.tocWidth)
  ) {
    cleanup();
    settings = newSettings;
    init();
  }

  // 更新设置
  settings = newSettings;
}

/**
 * 监听来自背景脚本或 popup 的消息
 */
// @ts-ignore
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 在处理任何消息之前，检查文档上下文是否仍然有效
  if (!document.body) {
    console.warn(
      "onMessage: Document body not found, context might be invalid. Aborting message handler."
    );
    // 返回 true 表示将异步发送响应，但我们这里不发送了
    // 或者可以尝试同步返回 { success: false } 或 undefined
    return true;
  }

  try {
    if (message.type === "SETTINGS_CHANGED") {
      console.log("Received SETTINGS_CHANGED message", message.settings);
      handleSettingsChange(message.settings);
      sendResponse({ success: true });
    } else if (message.type === "CLEAN_SCRIPT_LEAK") {
      console.log("Received CLEAN_SCRIPT_LEAK message");
      // 手动触发脚本泄露清理
      detectAndCleanScriptLeak();
      sendResponse({ success: true });
    } else {
      // 处理未知消息类型，可以选择忽略或记录
      console.log("Received unknown message type:", message.type);
      // 如果不处理，最好不要调用 sendResponse 或返回 true
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Extension context invalidated")
    ) {
      console.warn(
        "Caught 'Extension context invalidated' error in onMessage listener. Ignoring."
      );
      // 此时可能无法安全地发送响应
    } else {
      console.error("Error in onMessage listener:", error);
      // 也可以尝试发送错误响应，但不保证成功
      // sendResponse({ success: false, error: error.message });
    }
  }

  // 对于异步响应，确保返回 true
  // 如果所有路径都同步调用 sendResponse，则可以不返回 true
  // 在这个实现中，所有已知路径都同步调用了 sendResponse，但为了保险起见或处理未知消息类型，返回 true 可能是更安全的选择，
  // 尽管这可能导致 Chrome 在某些情况下报告"消息端口关闭"的错误，如果 sendResponse 最终没有被调用。
  // 如果我们确定所有分支都能同步响应，可以移除 return true。
  // 考虑到上面的 early return，以及 catch 块可能不发送响应，保留 return true 可能是必要的，让 Chrome 知道响应可能是异步的。
  return true;
});

// 页面加载完成后初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// 处理页面卸载
window.addEventListener("unload", cleanup);

// 监听DOM变化，检测脚本泄露
const observer = new MutationObserver((mutations) => {
  let shouldCheck = false;

  for (const mutation of mutations) {
    if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
      // 如果添加了新节点，标记需要检查
      shouldCheck = true;
      break;
    }
  }

  if (shouldCheck) {
    detectAndCleanScriptLeak();
  }
});

// 开始观察DOM变化
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// 确保页面卸载时断开观察器
window.addEventListener("unload", () => {
  observer.disconnect();
});
