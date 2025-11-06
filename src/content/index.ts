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
import { initLinkifier, destroyLinkifier } from "./linkifier";
import { detectAndCleanScriptLeak } from "../utils/safeDOM";

// 全局变量
let tocItems: TocItem[] = [];
let settings: Settings;
let isInitialized = false;
const CONTENT_WIDTH_STYLE_ID = "wre-content-max-width-style";
const BOTTOM_BAR_PADDING_STYLE_ID = "wre-bottom-bar-padding-style";
const BOTTOM_BAR_STYLE_ID = "wre-hide-bottom-bar-style";

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

    // 初始化链接识别器
    initLinkifier();

    // 读取页面内容的实际宽度作为默认宽度（如果设置中没有指定）
    const actualWidth = getContentActualWidth();
    if (!settings.contentMaxWidth && actualWidth) {
      settings.contentMaxWidth = actualWidth;
      // 保存检测到的宽度到设置中
      const { saveSettings } = await import("../utils/storage");
      await saveSettings(settings);
    }

    // 先应用页面内容最大宽度覆盖（无论是否找到文章容器）
    applyContentMaxWidth(settings.contentMaxWidth);

    // 应用底部栏隐藏设置
    applyHideBottomBar(settings.hideBottomBar);

    // 查找文章容器
    const articleContainer = findArticleContainer();
    if (!articleContainer) {
      console.warn("未找到文章容器");

      // 即使未找到文章容器，也初始化图片查看器
      initImageViewer();

      // 标记为已初始化
      isInitialized = true;
      return;
    }

    // 再次应用一次，确保在容器出现后样式仍生效
    applyContentMaxWidth(settings.contentMaxWidth);

    // 初始化图片查看器（无论是否有标题元素都初始化）
    initImageViewer();

    // 识别文章中的标题
    const headingElements = findHeadings(
      articleContainer,
      settings.minLevel,
      settings.maxLevel
    );

    if (headingElements.length === 0) {
      console.warn("未找到标题元素");

      // 即使没有标题元素，插件也已经初始化了图片查看器
      isInitialized = true;
      return;
    }

    // 构建目录树
    tocItems = buildTocTree(headingElements);
    if (tocItems.length === 0) {
      console.warn("生成目录树失败");

      // 即使目录树生成失败，插件也已经初始化了图片查看器
      isInitialized = true;
      return;
    }

    // 获取文章标题
    const articleTitle = getArticleTitle();

    // 创建目录容器
    const tocContainer = createTocContainer(articleTitle, settings);

    // 将目录容器添加到页面
    document.body.appendChild(tocContainer);

    // 渲染目录树
    const tocList = getTocList();
    if (tocList) {
      renderTocTree(tocItems, tocList);
    }

    // 恢复目录面板状态
    restorePanelState();

    // 初始化滚动监听
    initScrollObserver(tocItems);

    // 标记为已初始化
    isInitialized = true;

    console.log("公众号阅读增强插件初始化完成");
  } catch (error) {
    console.error("插件初始化失败:", error);
  }
}

/**
 * 清理插件
 */
function cleanup(): void {
  try {
    console.log("清理公众号阅读增强插件...");

    // 移除目录容器
    const tocContainer = getTocContainer();
    if (tocContainer && tocContainer.parentNode) {
      tocContainer.parentNode.removeChild(tocContainer);
    }

    // 销毁滚动监听器
    destroyScrollObserver();

    // 销毁图片查看器
    destroyImageViewer();

    // 销毁链接识别器
    destroyLinkifier();

    // 重置初始化标记
    isInitialized = false;

    console.log("公众号阅读增强插件已清理");
  } catch (error) {
    console.error("插件清理失败:", error);
  }
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

  // 单独处理内容最大宽度：无需完全重建
  if (newSettings.contentMaxWidth !== settings.contentMaxWidth) {
    applyContentMaxWidth(newSettings.contentMaxWidth);
  }

  // 单独处理底部栏隐藏：无需完全重建
  if (newSettings.hideBottomBar !== settings.hideBottomBar) {
    applyHideBottomBar(newSettings.hideBottomBar);
  }

  // 更新设置
  settings = newSettings;
}

/**
 * 获取页面内容的实际宽度
 * @returns 内容区域的实际宽度（像素），如果找不到元素则返回 null
 */
function getContentActualWidth(): number | null {
  try {
    const contentElement = document.querySelector(
      ".pages_skin_pc.wx_wap_desktop_fontsize_2 .rich_media_area_primary_inner"
    ) as HTMLElement;

    if (!contentElement) {
      console.warn("未找到内容区域元素");
      return null;
    }

    // 获取元素的计算样式宽度（排除 padding）
    const computedStyle = window.getComputedStyle(contentElement);
    const width = parseFloat(computedStyle.width);

    if (isNaN(width) || width <= 0) {
      console.warn("无法获取有效的宽度值");
      return null;
    }

    console.log(`检测到内容实际宽度: ${width}px`);
    return Math.round(width);
  } catch (e) {
    console.warn("获取内容宽度失败", e);
    return null;
  }
}

// 覆盖公众号文章容器的最大宽度
function applyContentMaxWidth(width?: number): void {
  try {
    // 清理旧样式
    const prev = document.getElementById(CONTENT_WIDTH_STYLE_ID);
    if (prev && prev.parentNode) prev.parentNode.removeChild(prev);

    // 清理底部栏 padding 样式
    const prevPadding = document.getElementById(BOTTOM_BAR_PADDING_STYLE_ID);
    if (prevPadding && prevPadding.parentNode) prevPadding.parentNode.removeChild(prevPadding);

    if (!width) return;

    // 应用内容最大宽度样式，同时添加左侧 padding
    const style = document.createElement("style");
    style.id = CONTENT_WIDTH_STYLE_ID;
    style.textContent =
      ".pages_skin_pc.wx_wap_desktop_fontsize_2 .rich_media_area_primary_inner{max-width: " +
      width +
      "px !important;padding-left: 250px !important;}";
    document.documentElement.appendChild(style);

    // 同时为底部栏添加 250px 的左侧 padding
    const paddingStyle = document.createElement("style");
    paddingStyle.id = BOTTOM_BAR_PADDING_STYLE_ID;
    paddingStyle.textContent = "#js_article_bottom_bar{padding-left: 250px !important;}";
    document.documentElement.appendChild(paddingStyle);
  } catch (e) {
    console.warn("应用内容最大宽度失败", e);
  }
}

// 隐藏/显示底部栏
function applyHideBottomBar(hide?: boolean): void {
  try {
    // 清理旧样式
    const prev = document.getElementById(BOTTOM_BAR_STYLE_ID);
    if (prev && prev.parentNode) prev.parentNode.removeChild(prev);

    if (!hide) return;

    const style = document.createElement("style");
    style.id = BOTTOM_BAR_STYLE_ID;
    style.textContent = "#js_article_bottom_bar{display: none !important;}";
    document.documentElement.appendChild(style);
  } catch (e) {
    console.warn("应用底部栏隐藏失败", e);
  }
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

// 导出供外部调用
export { init, cleanup };
