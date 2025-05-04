/**
 * 图片查看器模块
 * 提供文章内图片点击放大功能
 */

import mediumZoom from "medium-zoom";

// 保存zoom实例的引用，便于后续清理
let zoom: ReturnType<typeof mediumZoom> | null = null;
// 保存MutationObserver实例，用于观察新图片
let observer: MutationObserver | null = null;

/**
 * 节流函数 - 限制函数调用频率
 * @param fn 要执行的函数
 * @param delay 延迟时间(ms)
 */
function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

/**
 * 初始化图片查看器
 */
export function initImageViewer(): void {
  // 防止重复初始化
  if (zoom) {
    console.log("图片查看器已初始化，跳过");
    return;
  }

  try {
    console.log("初始化图片查看器...");

    // 添加内联样式确保z-index正确，避免与其他元素冲突
    const inlineStyles = `
      .medium-zoom-overlay,
      .medium-zoom-image--opened {
        z-index: 20000;
      }
    `;

    // 添加内联样式
    const styleEl = document.createElement("style");
    styleEl.textContent = inlineStyles;
    document.head.appendChild(styleEl);

    // 处理当前页面上的图片
    processArticleImages();

    // 初始化medium-zoom，针对id="img-content"下的所有图片
    zoom = mediumZoom("#img-content img", {
      background: "rgba(0, 0, 0, 0.85)",
      margin: 40,
      scrollOffset: 0,
    });

    // 设置MutationObserver观察DOM变化，处理动态加载的图片
    setupImageObserver();

    console.log("图片查看器初始化完成");
  } catch (error) {
    console.error("图片查看器初始化失败:", error);
  }
}

/**
 * 处理文章中的所有图片，为其添加缩放属性
 */
function processArticleImages(): void {
  try {
    // 查找id="img-content"下的所有图片
    const articleImages = document.querySelectorAll(
      "#img-content img"
    ) as NodeListOf<HTMLImageElement>;

    // 使用requestIdleCallback或setTimeout分批处理图片，避免阻塞主线程
    setTimeout(() => {
      articleImages.forEach((img) => {
        // 确保图片有data-zoom-src属性
        prepareImageForZoom(img);
      });
    }, 0);
  } catch (error) {
    console.error("处理文章图片失败:", error);
  }
}

/**
 * 为图片准备缩放功能
 * @param img 图片元素
 */
function prepareImageForZoom(img: HTMLImageElement): void {
  // 如果图片已经处理过，跳过
  if (img.hasAttribute("data-zoom-processed")) {
    return;
  }

  // 优先使用data-src属性（通常包含原始图片URL）
  const dataSrc = img.getAttribute("data-src");
  if (dataSrc) {
    // 设置data-zoom-src属性，medium-zoom将使用它作为缩放时的图片源
    img.setAttribute("data-zoom-src", dataSrc);
  }

  // 标记为已处理
  img.setAttribute("data-zoom-processed", "true");

  // 添加alt属性提升可访问性(如果没有)
  if (!img.alt) {
    img.alt = "文章图片";
  }

  // 如果zoom实例已存在，将新图片添加到zoom中
  if (zoom) {
    zoom.attach(img);
  }
}

/**
 * 设置图片观察器，监视DOM变化以处理动态加载的图片
 */
function setupImageObserver(): void {
  // 如果已经有观察器，先断开
  if (observer) {
    observer.disconnect();
  }

  // 创建节流处理函数，200ms内只处理一次
  const throttledProcessImages = throttle(() => {
    processArticleImages();
  }, 200);

  // 创建新的MutationObserver实例
  observer = new MutationObserver((mutations) => {
    let hasNewImages = false;

    // 检查是否有新的图片被添加
    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        // 快速检查是否有img标签
        const hasImgNode = Array.from(mutation.addedNodes).some(
          (node) =>
            node instanceof HTMLElement &&
            (node.tagName === "IMG" || node.querySelector("img"))
        );

        if (hasImgNode) {
          hasNewImages = true;
          break;
        }
      }
    }

    // 如果找到新图片，触发处理
    if (hasNewImages) {
      throttledProcessImages();
    }
  });

  // 开始观察DOM变化
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * 销毁图片查看器
 */
export function destroyImageViewer(): void {
  try {
    // 断开观察器
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    if (zoom) {
      // 使用medium-zoom的detach方法移除所有图片的缩放行为
      zoom.detach();
      zoom = null;
    }

    console.log("图片查看器已销毁");
  } catch (error) {
    console.error("销毁图片查看器失败:", error);
  }
}
