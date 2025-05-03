/**
 * 图片查看器模块
 * 提供文章内图片点击放大功能
 */

import { createElement } from "../utils/dom";

// 缓存图片查看器元素
let imageViewer: HTMLElement | null = null;
let imageElement: HTMLImageElement | null = null;
let isVisible = false;
let clickEventBound = false;
// 添加冷却时间状态
let isInCooldown = false;
// 缓存已加载的图片URL
const preloadedImages = new Set<string>();

/**
 * 创建图片查看器
 * @returns 图片查看器元素
 */
function createImageViewer(): HTMLElement {
  // 创建容器
  const viewer = createElement("div", {
    class: "wechat-image-viewer",
  });

  // 创建背景遮罩
  const overlay = createElement("div", {
    class: "wechat-image-overlay",
  });

  // 点击背景关闭查看器
  overlay.addEventListener("click", () => {
    hideImageViewer();
  });

  // 创建图片容器
  const imageContainer = createElement("div", {
    class: "wechat-image-container",
  });

  // 创建图片元素
  imageElement = createElement("img", {
    class: "wechat-image-content",
    alt: "图片预览",
  }) as HTMLImageElement;

  // 图片加载错误处理
  imageElement.addEventListener("error", () => {
    console.error("图片加载失败");
    hideImageViewer();
  });

  // 阻止图片点击冒泡（避免点击图片也关闭查看器）
  imageElement.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // 创建关闭按钮
  const closeButton = createElement(
    "button",
    {
      class: "wechat-image-close",
      title: "关闭",
    },
    "×"
  );

  // 点击按钮关闭查看器
  closeButton.addEventListener("click", () => {
    hideImageViewer();
  });

  // 组装查看器
  imageContainer.appendChild(imageElement);
  viewer.appendChild(overlay);
  viewer.appendChild(imageContainer);
  viewer.appendChild(closeButton);

  return viewer;
}

/**
 * 初始化图片查看器
 */
export function initImageViewer(): void {
  // 防止重复初始化
  if (imageViewer || clickEventBound) {
    console.log("图片查看器已初始化，跳过");
    return;
  }

  try {
    console.log("初始化图片查看器...");

    // 创建查看器
    imageViewer = createImageViewer();

    // 添加内联样式确保查看器样式加载
    const inlineStyles = `
      .wechat-image-viewer {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 20000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
        will-change: opacity, visibility;
        pointer-events: none;
      }
      .wechat-image-viewer-active {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }
      .wechat-image-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.85);
        cursor: zoom-out;
      }
      .wechat-image-container {
        position: relative;
        max-width: 90%;
        max-height: 90%;
        z-index: 20001;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: scale(0.9);
        transition: transform 0.3s ease;
        will-change: transform;
      }
      .wechat-image-viewer-active .wechat-image-container {
        transform: scale(1);
      }
      .wechat-image-content {
        max-width: 100%;
        max-height: 90vh;
        object-fit: contain;
        box-shadow: 0 5px 30px rgba(0, 0, 0, 0.3);
        cursor: default;
        will-change: transform;
      }
      .wechat-image-close {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 40px;
        height: 40px;
        background-color: rgba(0, 0, 0, 0.6);
        border: none;
        border-radius: 50%;
        color: white;
        font-size: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 20002;
        transition: background-color 0.2s ease;
      }
      .wechat-image-close:hover {
        background-color: rgba(0, 0, 0, 0.8);
      }
    `;

    // 添加内联样式
    const styleEl = document.createElement("style");
    styleEl.textContent = inlineStyles;
    document.head.appendChild(styleEl);

    // 添加查看器到页面但先不显示 - 避免影响文档布局
    document.body.appendChild(imageViewer);
    imageViewer.style.display = "none";

    // 初始化后延迟一小段时间再设为flex，避免可能的布局闪烁
    setTimeout(() => {
      if (imageViewer) {
        imageViewer.style.display = "flex";
      }
    }, 100);

    // 添加键盘事件监听（ESC关闭）
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isVisible) {
        hideImageViewer();
      }
    });

    // 添加图片点击事件委托
    document.addEventListener("click", handleImageClick, { passive: false });
    clickEventBound = true;

    // 预加载文章中所有图片
    setTimeout(preloadArticleImages, 1000);

    console.log("图片查看器初始化完成");
  } catch (error) {
    console.error("图片查看器初始化失败:", error);
    // 确保在初始化失败时恢复状态
    resetViewerState();
  }
}

/**
 * 预加载文章中的图片
 */
function preloadArticleImages() {
  try {
    // 找出文章中的所有图片
    const articleImages = Array.from(
      document.querySelectorAll("img.rich_pages, img.wxw-img")
    ) as HTMLImageElement[];

    // 如果图片太多，只预加载前10张
    const imagesToPreload = articleImages.slice(0, 10);

    // 逐个预加载图片
    imagesToPreload.forEach((img) => {
      const url = getOriginalImageUrl(img);
      if (url && !preloadedImages.has(url)) {
        // 添加到已加载集合
        preloadedImages.add(url);

        // 创建一个新的Image对象进行预加载
        const preloadImg = new Image();
        preloadImg.src = url;
      }
    });
  } catch (error) {
    console.error("预加载图片失败:", error);
  }
}

/**
 * 处理图片点击事件
 */
function handleImageClick(e: MouseEvent): void {
  try {
    // 如果查看器正在显示或处于冷却状态，不处理点击
    if (isVisible || isInCooldown) {
      return;
    }

    const target = e.target as HTMLElement;

    // 检查点击的是否是文章中的图片
    if (
      target.tagName === "IMG" &&
      (target.classList.contains("rich_pages") ||
        target.classList.contains("wxw-img"))
    ) {
      console.log("检测到图片点击:", target);

      // 立即阻止默认行为和冒泡，避免页面产生其他反应
      e.preventDefault();
      e.stopPropagation();

      // 获取高清图片URL
      const originalSrc = getOriginalImageUrl(target as HTMLImageElement);
      if (originalSrc) {
        console.log("显示图片:", originalSrc);

        // 使用requestAnimationFrame确保在下一帧渲染前显示图片，减少闪烁
        requestAnimationFrame(() => {
          showImageViewer(originalSrc);
        });
      }
    }
  } catch (error) {
    console.error("处理图片点击失败:", error);
    resetViewerState();
  }
}

/**
 * 获取图片的原始URL（高清图）
 * @param imgElement 图片元素
 * @returns 原始图片URL
 */
function getOriginalImageUrl(imgElement: HTMLImageElement): string {
  // 优先使用data-src属性（通常包含原始图片URL）
  const dataSrc = imgElement.getAttribute("data-src");

  // 如果找到data-src，则使用它
  if (dataSrc) {
    // 不要移除参数，返回完整URL
    return dataSrc;
  }

  // 回退到src属性
  return imgElement.src;
}

/**
 * 显示图片查看器
 * @param imageUrl 图片URL
 */
function showImageViewer(imageUrl: string): void {
  if (!imageViewer || !imageElement) {
    console.error("图片查看器元素不可用");
    return;
  }

  try {
    // 设置状态为可见
    isVisible = true;

    // 如果图片已经预加载过，可以更快地显示
    const isPreloaded = preloadedImages.has(imageUrl);

    // 阻止背景滚动 - 确保在设置图片前就锁定滚动，避免页面跳动
    document.body.style.overflow = "hidden";

    // 添加加载中标记
    imageElement.classList.add("loading");

    // 设置图片源
    imageElement.src = imageUrl;

    // 图片加载完成后移除加载标记
    imageElement.onload = () => {
      if (imageElement) {
        imageElement.classList.remove("loading");
      }

      // 如果是首次加载此图片，添加到预加载集合
      if (!isPreloaded) {
        preloadedImages.add(imageUrl);
      }
    };

    // 显示查看器
    imageViewer.classList.add("wechat-image-viewer-active");

    console.log("图片查看器已显示");
  } catch (error) {
    console.error("显示图片查看器失败:", error);
    resetViewerState();
  }
}

/**
 * 隐藏图片查看器
 */
function hideImageViewer(): void {
  if (!imageViewer) {
    console.warn("图片查看器不存在");
    // 确保即使查看器不存在，也恢复滚动
    document.body.style.overflow = "";
    return;
  }

  try {
    // 设置冷却状态，防止快速重复点击
    isInCooldown = true;

    // 隐藏查看器
    imageViewer.classList.remove("wechat-image-viewer-active");
    isVisible = false;

    // 恢复背景滚动
    document.body.style.overflow = "";

    // 使用requestAnimationFrame确保在下一帧时处理图片，减少闪烁
    requestAnimationFrame(() => {
      // 延迟清空图片源，避免立即清空导致图片状态错误
      if (imageElement) {
        // 保留图片URL一段时间，等动画结束再清空
        setTimeout(() => {
          if (imageElement) {
            // 先将src设为空白图片，而不是立即清空
            imageElement.src =
              "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
          }

          // 冷却结束
          setTimeout(() => {
            isInCooldown = false;
          }, 300);
        }, 300); // 等待过渡动画完成
      } else {
        // 如果没有图片元素，也需要结束冷却
        setTimeout(() => {
          isInCooldown = false;
        }, 300);
      }
    });

    console.log("图片查看器已隐藏");
  } catch (error) {
    console.error("隐藏图片查看器失败:", error);
    // 确保即使出错，也恢复滚动和冷却状态
    resetViewerState();
  }
}

/**
 * 重置查看器状态
 */
function resetViewerState(): void {
  isVisible = false;
  isInCooldown = false;
  document.body.style.overflow = "";
}

/**
 * 销毁图片查看器
 */
export function destroyImageViewer(): void {
  try {
    // 移除事件委托
    if (clickEventBound) {
      document.removeEventListener("click", handleImageClick);
      clickEventBound = false;
    }

    // 移除图片查看器
    if (imageViewer && imageViewer.parentNode) {
      imageViewer.parentNode.removeChild(imageViewer);
    }

    // 恢复状态
    imageViewer = null;
    imageElement = null;
    isVisible = false;
    isInCooldown = false;

    // 清空预加载图片集合
    preloadedImages.clear();

    // 确保页面可以滚动
    document.body.style.overflow = "";

    console.log("图片查看器已销毁");
  } catch (error) {
    console.error("销毁图片查看器失败:", error);
    // 确保即使出错，也恢复滚动
    document.body.style.overflow = "";
  }
}
