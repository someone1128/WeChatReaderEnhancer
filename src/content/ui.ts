/**
 * 目录UI渲染模块
 */

import { TocItem, Settings } from "../types";
import {
  createElement,
  addClass,
  removeClass,
  toggleClass,
  scrollToElement,
  getElementText,
} from "../utils/dom";
import { findTocItemById, toggleItemExpansion } from "./toc";

// UI元素缓存
let tocContainer: HTMLElement | null = null;
let tocList: HTMLElement | null = null;
let activeTocItem: HTMLElement | null = null;
let progressBar: HTMLElement | null = null;

/**
 * 创建目录容器
 * @param title 目录标题
 * @param settings 插件设置
 * @returns 目录容器元素
 */
export function createTocContainer(
  title: string,
  settings: Settings
): HTMLElement {
  // 创建目录容器元素 - 默认为展开状态
  tocContainer = createElement("div", {
    id: "wechat-toc-container",
    class: "wechat-toc-container", // 默认展开
    style: `width: ${settings.tocWidth}px;`,
  });

  // 创建阅读进度指示器
  progressBar = createElement("div", {
    class: "wechat-toc-progress-bar",
  });
  tocContainer.appendChild(progressBar);

  // 创建标题栏
  const header = createElement("div", { class: "wechat-toc-header" });

  // 添加标题栏双击事件 - 切换展开/折叠状态
  header.addEventListener("dblclick", () => {
    toggleTocPanel();
  });

  // 标题
  const titleElement = createElement(
    "h2",
    { class: "wechat-toc-title" },
    title
  );

  // 控制按钮
  const minimizeButton = createElement(
    "button",
    {
      class: "wechat-toc-button wechat-toc-minimize",
      title: "最小化",
    },
    "×"
  );
  minimizeButton.addEventListener("click", () => {
    minimizeTocPanel();
  });

  // 添加标题和按钮到标题栏
  header.appendChild(titleElement);
  header.appendChild(minimizeButton);

  // 创建目录内容区域
  tocList = createElement("div", {
    class: "wechat-toc-list",
  });

  // 创建页脚区域
  const footer = createFooter();

  // 组装目录容器
  tocContainer.appendChild(header);
  tocContainer.appendChild(tocList);
  tocContainer.appendChild(footer); // 添加页脚

  // 添加最小化状态下的展开按钮
  const expandButton = createElement(
    "button",
    {
      class: "wechat-toc-button wechat-toc-expand",
      title: "展开目录",
    },
    "≡"
  );
  expandButton.addEventListener("click", () => {
    expandTocPanel();
  });
  tocContainer.appendChild(expandButton);

  // 添加收起状态下的竖向文字
  const verticalText = createElement(
    "div",
    {
      class: "wechat-toc-vertical-text",
      title: "展开目录",
    },
    "文章目录"
  );

  // 为竖向文字添加点击事件，点击时展开目录
  verticalText.addEventListener("click", () => {
    expandTocPanel();
  });

  // 添加到页面
  document.body.appendChild(verticalText);

  // 立即调用状态恢复，检查用户是否明确选择了收缩状态
  restorePanelState();

  return tocContainer;
}

/**
 * 渲染目录树
 * @param items 目录树
 * @param container 容器元素
 * @param level 当前级别（用于递归）
 */
export function renderTocTree(
  items: TocItem[],
  container: HTMLElement,
  level: number = 0
): void {
  if (!items.length) return;

  // 创建目录列表
  const listElement = createElement("ul", {
    class: `wechat-toc-list-level-${level}`,
  });

  items.forEach((item) => {
    // 创建列表项
    const listItem = createElement("li", {
      class: `wechat-toc-item wechat-toc-level-${item.level}`,
      "data-id": item.id,
    });

    // 如果有子项，添加展开/折叠图标
    if (item.children.length > 0) {
      const toggleIcon = createElement(
        "span",
        {
          class: `wechat-toc-toggle ${item.isExpanded ? "expanded" : "collapsed"}`,
        },
        item.isExpanded ? "▼" : "▶"
      );

      // 添加点击事件
      toggleIcon.addEventListener("click", () => {
        toggleItemExpansion(item);
        toggleClass(toggleIcon, "expanded", item.isExpanded);
        toggleClass(toggleIcon, "collapsed", !item.isExpanded);
        toggleIcon.textContent = item.isExpanded ? "▼" : "▶";

        // 找到子目录列表
        const childList = listItem.querySelector("ul");
        if (childList) {
          toggleClass(childList, "wechat-toc-hidden", !item.isExpanded);
        }
      });

      listItem.appendChild(toggleIcon);
    }

    // 创建标题链接
    const link = createElement(
      "a",
      {
        href: `#${item.id}`,
        class: "wechat-toc-link",
      },
      item.text
    );

    // 添加点击事件
    link.addEventListener("click", (e) => {
      e.preventDefault();
      scrollToElement(item.element, 60);
      highlightTocItem(listItem);
    });

    // 添加链接到列表项
    listItem.appendChild(link);

    // 添加悬停预览
    const preview = createElement("div", {
      class: "wechat-toc-preview",
    });

    // 获取预览内容（从标题下方提取一部分文本）
    const previewText = getPreviewContent(item.element);
    preview.textContent = previewText;

    listItem.appendChild(preview);

    // 递归渲染子项
    if (item.children.length > 0) {
      const childContainer = createElement("div", {
        class: "wechat-toc-children",
      });

      renderTocTree(item.children, childContainer, level + 1);

      // 如果当前项是折叠状态，隐藏子列表
      if (!item.isExpanded) {
        const childList = childContainer.querySelector("ul");
        if (childList) {
          addClass(childList, "wechat-toc-hidden");
        }
      }

      listItem.appendChild(childContainer);
    }

    // 添加列表项到列表
    listElement.appendChild(listItem);
  });

  // 添加列表到容器
  container.appendChild(listElement);
}

/**
 * 获取标题下方的部分内容作为预览
 * @param headingElement 标题元素
 * @returns 预览文本
 */
function getPreviewContent(headingElement: HTMLElement): string {
  // 默认预览长度
  const maxLength = 100;
  let previewText = "";

  try {
    // 获取标题后面的元素
    let nextElement = headingElement.nextElementSibling;

    // 尝试获取文本内容
    while (nextElement && previewText.length < maxLength) {
      // 跳过其他标题元素
      if (nextElement.tagName.match(/^H[1-6]$/)) {
        break;
      }

      // 获取文本内容
      const text = nextElement.textContent || "";
      previewText += text + " ";

      // 移动到下一个元素
      nextElement = nextElement.nextElementSibling;
    }

    // 截断到最大长度并添加省略号
    if (previewText.length > maxLength) {
      previewText = previewText.substring(0, maxLength) + "...";
    }

    return previewText.trim() || "无预览内容";
  } catch (error) {
    console.error("获取预览内容失败:", error);
    return "无法加载预览";
  }
}

/**
 * 更新阅读进度条
 * @param percentage 百分比值 (0-100)
 */
export function updateProgressBar(percentage: number): void {
  if (!progressBar) return;

  // 确保百分比在有效范围内
  const validPercentage = Math.max(0, Math.min(100, percentage));
  progressBar.style.height = `${validPercentage}%`;
}

/**
 * 高亮当前项
 * @param element 要高亮的元素
 */
export function highlightTocItem(element: HTMLElement): void {
  // 移除之前的高亮
  if (activeTocItem) {
    removeClass(activeTocItem, "wechat-toc-active");
  }

  // 添加高亮到当前项
  addClass(element, "wechat-toc-active");
  activeTocItem = element;

  // 确保当前项在视图中
  ensureVisible(element);
}

/**
 * 通过ID高亮目录项
 * @param id 要高亮的项的ID
 */
export function highlightTocItemById(id: string): void {
  if (!tocList) return;

  const element = tocList.querySelector(`[data-id="${id}"]`);
  if (element && element instanceof HTMLElement) {
    highlightTocItem(element);
  }
}

/**
 * 确保元素在目录的可视范围内
 * @param element 目标元素
 */
function ensureVisible(element: HTMLElement): void {
  if (!tocList) return;

  const elementRect = element.getBoundingClientRect();
  const containerRect = tocList.getBoundingClientRect();

  if (elementRect.bottom > containerRect.bottom) {
    // 元素在容器下方不可见
    tocList.scrollTop += elementRect.bottom - containerRect.bottom;
  } else if (elementRect.top < containerRect.top) {
    // 元素在容器上方不可见
    tocList.scrollTop -= containerRect.top - elementRect.top;
  }
}

/**
 * 切换目录面板的展开/折叠状态
 */
function toggleTocPanel(): void {
  if (!tocContainer) return;

  if (tocContainer.classList.contains("wechat-toc-minimized")) {
    expandTocPanel();
  } else {
    minimizeTocPanel();
  }
}

/**
 * 最小化目录面板
 */
export function minimizeTocPanel(): void {
  if (!tocContainer) return;

  addClass(tocContainer, "wechat-toc-minimized");

  // 使用chrome.storage.local代替localStorage存储状态
  try {
    // @ts-ignore
    chrome.storage.local.set({ "wechat-toc-minimized": true });
  } catch (error) {
    console.error("保存目录状态失败:", error);
    // 降级到localStorage作为备用
    localStorage.setItem("wechat-toc-minimized", "true");
  }
}

/**
 * 展开目录面板
 */
export function expandTocPanel(): void {
  if (!tocContainer) return;

  removeClass(tocContainer, "wechat-toc-minimized");

  // 使用chrome.storage.local代替localStorage存储状态
  try {
    // @ts-ignore
    chrome.storage.local.set({ "wechat-toc-minimized": false });
  } catch (error) {
    console.error("保存目录状态失败:", error);
    // 降级到localStorage作为备用
    localStorage.setItem("wechat-toc-minimized", "false");
  }
}

/**
 * 根据存储的状态恢复面板状态
 */
export function restorePanelState(): void {
  try {
    // 尝试从chrome.storage.local获取状态
    // @ts-ignore
    chrome.storage.local.get("wechat-toc-minimized", (result) => {
      // 如果找到存储的状态且明确为收缩，则收缩面板
      if (result && "wechat-toc-minimized" in result) {
        if (result["wechat-toc-minimized"] === true) {
          minimizeTocPanel();
        }
        // 如果为false或未定义，默认为展开状态，不需要操作
      } else {
        // 如果chrome.storage中没有，尝试从localStorage中获取
        const minimized = localStorage.getItem("wechat-toc-minimized");
        if (minimized === "true") {
          minimizeTocPanel();
        }
        // 如果为"false"或null，默认为展开状态，不需要操作
      }
    });
  } catch (error) {
    console.error("恢复目录状态失败:", error);
    // 如果chrome.storage失败，降级到localStorage
    const minimized = localStorage.getItem("wechat-toc-minimized");
    if (minimized === "true") {
      minimizeTocPanel();
    }
    // 如果为"false"或null，默认为展开状态，不需要操作
  }
}

/**
 * 获取目录容器
 * @returns 目录容器元素
 */
export function getTocContainer(): HTMLElement | null {
  return tocContainer;
}

/**
 * 获取目录列表
 * @returns 目录列表元素
 */
export function getTocList(): HTMLElement | null {
  return tocList;
}

/**
 * 获取进度条元素
 * @returns 进度条元素
 */
export function getProgressBar(): HTMLElement | null {
  return progressBar;
}

// 创建页脚内容的辅助函数
function createFooter(): HTMLElement {
  const footer = createElement("div", {
    class: "wechat-toc-footer",
  });

  const socialLinks = [
    {
      name: "即刻",
      url: "https://web.okjike.com/u/ec41d7d5-407d-4395-ac8a-bd0f04fb202c",
      icon: "jike.png",
    },
    {
      name: "哔哩哔哩",
      url: "https://space.bilibili.com/444418069",
      icon: "blibli.png",
    },
    {
      name: "小红书",
      url: "https://www.xiaohongshu.com/user/profile/63eccfa2000000002600707d",
      icon: "xhs.png",
    },
  ];

  const linksContainer = createElement("div", {
    class: "wechat-toc-footer-links",
  });

  socialLinks.forEach((linkInfo) => {
    const link = createElement("a", {
      href: linkInfo.url,
      target: "_blank",
      rel: "noopener noreferrer",
      title: `访问我的${linkInfo.name}主页`,
      class: "wechat-toc-footer-link",
    });

    const img = createElement("img", {
      src: `./logo/${linkInfo.icon}`, // 初始设置相对路径
      alt: linkInfo.name,
      class: "wechat-toc-footer-icon",
    });

    // 尝试使用 chrome.runtime.getURL 获取正确路径
    try {
      img.src = chrome.runtime.getURL(`logo/${linkInfo.icon}`);
    } catch (e) {
      console.error(`无法获取页脚图标 URL: logo/${linkInfo.icon}`, e);
      // 保留原始路径或显示文字
      link.textContent = linkInfo.name; // 如果图片加载失败，显示文字
    }

    link.appendChild(img);
    linksContainer.appendChild(link);
  });

  footer.appendChild(linksContainer);

  return footer;
}
