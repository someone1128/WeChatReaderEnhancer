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
 * 监听来自背景脚本的消息
 */
// @ts-ignore
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SETTINGS_CHANGED") {
    handleSettingsChange(message.settings);
    sendResponse({ success: true });
  }
});

// 页面加载完成后初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// 处理页面卸载
window.addEventListener("unload", cleanup);
