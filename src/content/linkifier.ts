/**
 * 链接识别与转换模块
 * 自动将文章中的纯文本URL转换为可点击链接
 */

import { throttle } from "../utils/dom";
import LinkifyIt from "linkify-it";
import tlds from "tlds";

// 创建linkify实例并配置
const linkifier = new LinkifyIt();
// 加载完整的顶级域名列表
linkifier.tlds(tlds);
// 配置linkify只匹配明确的URL模式
linkifier.set({ fuzzyLink: false }); // 禁用模糊匹配
linkifier.set({ fuzzyIP: false }); // 禁用IP模糊匹配
linkifier.set({ fuzzyEmail: false }); // 禁用邮箱模糊匹配

// MutationObserver实例
let observer: MutationObserver | null = null;

// 定义链接内联样式 - 只保持必要的属性，不改变颜色
const LINK_INLINE_STYLE = `
  text-decoration: none !important; 
  cursor: pointer !important;
`;

/**
 * 初始化链接识别与转换
 */
export function initLinkifier(): void {
  // 如果已经初始化，直接返回
  if (observer) {
    console.log("链接识别已初始化，跳过");
    return;
  }

  try {
    console.log("初始化链接识别...");

    // 添加动态处理悬停样式的脚本
    addHoverScript();

    // 处理当前页面上的文本
    processArticleLinks();

    // 设置MutationObserver观察DOM变化
    setupLinkObserver();

    console.log("链接识别初始化完成");
  } catch (error) {
    console.error("链接识别初始化失败:", error);
  }
}

/**
 * 添加处理链接悬停效果的脚本
 */
function addHoverScript(): void {
  // 检查是否已添加脚本
  if (document.getElementById("wechat-linkifier-script")) {
    return;
  }

  // 创建脚本元素
  const script = document.createElement("script");
  script.id = "wechat-linkifier-script";
  script.textContent = `
    // 添加全局事件监听器来处理链接的悬停效果
    document.addEventListener('mouseover', function(e) {
      if (e.target && e.target.classList && e.target.classList.contains('linkified')) {
        e.target.style.textDecoration = 'underline';
      }
    }, true);

    document.addEventListener('mouseout', function(e) {
      if (e.target && e.target.classList && e.target.classList.contains('linkified')) {
        e.target.style.textDecoration = 'none';
      }
    }, true);
  `;

  // 添加到页面
  document.head.appendChild(script);
}

/**
 * 处理文章中的链接
 */
function processArticleLinks(): void {
  try {
    // 找到文章内容区域 - 使用微信文章的实际ID
    const contentContainer =
      document.getElementById("js_content") ||
      document.querySelector(".rich_media_content");
    if (!contentContainer) {
      console.warn("未找到文章内容区域");
      return;
    }

    // 获取所有文本节点并处理
    processTextNodes(contentContainer);
  } catch (error) {
    console.error("处理文章链接失败:", error);
  }
}

/**
 * 检查URL是否以http/https开头
 * @param url 要检查的URL
 * @returns 是否是有效的URL
 */
function isValidHttpUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

/**
 * 处理元素中的所有文本节点
 * @param element 要处理的元素
 */
function processTextNodes(element: Element): void {
  // 跳过已经处理过的元素
  if (element.getAttribute("data-linkified") === "true") {
    return;
  }

  // 创建节点过滤器
  const filter = {
    acceptNode(node: Node): number {
      // 只处理非空文本节点
      if (node.textContent && node.textContent.trim().length > 0) {
        // 跳过已在链接中的文本节点
        const parent = node.parentElement;
        if (parent && (parent.tagName === "A" || parent.closest("a"))) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_REJECT;
    },
  };

  // 递归处理所有子元素的文本节点
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    filter
  );

  interface LinkifyMatch {
    index: number;
    lastIndex: number;
    raw: string;
    schema: string;
    text: string;
    url: string;
  }

  const nodesToReplace: { node: Text; html: string }[] = [];

  // 遍历所有文本节点
  while (walker.nextNode()) {
    const textNode = walker.currentNode as Text;
    const text = textNode.textContent || "";

    // 使用linkify-it查找链接
    const matches = linkifier.match(text) as LinkifyMatch[] | null;

    if (matches && matches.length > 0) {
      // 如果找到链接，创建替换HTML
      let lastIndex = 0;
      let html = "";

      // 过滤只保留http/https链接
      const validMatches = matches.filter((match) => isValidHttpUrl(match.url));

      if (validMatches.length === 0) {
        continue; // 如果没有有效链接，跳过此节点
      }

      validMatches.forEach((match: LinkifyMatch) => {
        // 添加链接前的文本
        html += text.slice(lastIndex, match.index);

        // 添加链接HTML，使用最小的内联样式
        html += `<a href="${match.url}" target="_blank" rel="noopener noreferrer" class="linkified" style="${LINK_INLINE_STYLE}">${match.text}</a>`;

        lastIndex = match.lastIndex;
      });

      // 添加最后一个链接后的文本
      html += text.slice(lastIndex);

      // 将此节点添加到替换列表
      nodesToReplace.push({ node: textNode, html });
    }
  }

  // 替换文本节点
  nodesToReplace.forEach(({ node, html }) => {
    const temp = document.createElement("div");
    temp.innerHTML = html;

    const parent = node.parentElement;
    if (parent) {
      const fragment = document.createDocumentFragment();
      while (temp.firstChild) {
        fragment.appendChild(temp.firstChild);
      }

      parent.replaceChild(fragment, node);
    }
  });

  // 添加事件监听器处理鼠标悬停样式 - 只添加下划线
  const links = element.querySelectorAll("a.linkified");
  links.forEach((link) => {
    link.addEventListener("mouseover", function (this: HTMLElement) {
      this.style.textDecoration = "underline";
    });

    link.addEventListener("mouseout", function (this: HTMLElement) {
      this.style.textDecoration = "none";
    });
  });

  // 标记已处理
  element.setAttribute("data-linkified", "true");
}

/**
 * 设置链接观察器，监视DOM变化以处理动态加载的内容
 */
function setupLinkObserver(): void {
  // 如果已经有观察器，先断开
  if (observer) {
    observer.disconnect();
  }

  // 创建节流处理函数，200ms内只处理一次
  const throttledProcessLinks = throttle(() => {
    processArticleLinks();
  }, 200);

  // 创建新的MutationObserver实例
  observer = new MutationObserver((mutations) => {
    let shouldProcess = false;

    // 检查是否有内容变化
    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        shouldProcess = true;
        break;
      }
    }

    // 如果内容有变化，处理链接
    if (shouldProcess) {
      throttledProcessLinks();
    }
  });

  // 开始观察DOM变化
  const contentContainer =
    document.getElementById("js_content") ||
    document.querySelector(".rich_media_content");
  if (contentContainer) {
    observer.observe(contentContainer, {
      childList: true,
      subtree: true,
    });
  } else {
    // 如果找不到内容容器，观察整个body
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
}

/**
 * 销毁链接识别器
 */
export function destroyLinkifier(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }

  // 移除脚本
  const scriptElement = document.getElementById("wechat-linkifier-script");
  if (scriptElement) {
    scriptElement.remove();
  }
}
