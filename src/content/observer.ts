/**
 * 滚动监听模块
 * 用于监测用户滚动位置并同步高亮目录
 */

import { TocItem } from "../types";
import { throttle } from "../utils/dom";
import { getCurrentHeading } from "./toc";
import { highlightTocItemById, updateProgressBar } from "./ui";
import { saveReadingPosition } from "../utils/storage";

// IntersectionObserver实例
let headingObserver: IntersectionObserver | null = null;

// 当前可见的标题
const visibleHeadings = new Map<
  string,
  { element: HTMLElement; ratio: number }
>();

// 滚动监听器
let scrollHandler: (() => void) | null = null;

/**
 * 初始化滚动监听
 * @param tocItems 目录树
 * @param topOffset 顶部偏移量
 */
export function initScrollObserver(
  tocItems: TocItem[],
  topOffset: number = 100
): void {
  // 销毁已有的观察器
  if (headingObserver) {
    headingObserver.disconnect();
  }

  // 展平目录项，获取所有标题元素
  const allHeadings = flattenTocItems(tocItems);

  // 创建监听器选项
  const observerOptions = {
    root: null, // 使用视口作为根
    rootMargin: `-${topOffset}px 0px 0px 0px`, // 顶部偏移
    threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], // 多个阈值以获取更精确的可见度
  };

  // 创建IntersectionObserver
  headingObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const id = entry.target.id;

      if (entry.isIntersecting) {
        // 标题进入视图，添加到可见标题Map
        visibleHeadings.set(id, {
          element: entry.target as HTMLElement,
          ratio: entry.intersectionRatio,
        });
      } else {
        // 标题离开视图，从可见标题Map中移除
        visibleHeadings.delete(id);
      }
    });

    // 处理高亮逻辑
    updateActiveHeading();
  }, observerOptions);

  // 监听所有标题元素
  allHeadings.forEach((item) => {
    if (headingObserver) {
      headingObserver.observe(item.element);
    }
  });

  // 添加页面滚动节流处理
  window.addEventListener(
    "scroll",
    throttle(() => {
      // 保存当前阅读位置
      saveReadingPosition(window.location.href, window.scrollY);

      // 如果没有通过IntersectionObserver检测到的标题
      // 使用备用方法获取当前标题
      if (visibleHeadings.size === 0) {
        const currentHeading = getCurrentHeading(tocItems, topOffset);
        if (currentHeading) {
          highlightTocItemById(currentHeading.id);
        }
      }
    }, 200)
  );

  // 创建新的滚动处理函数（使用节流）
  scrollHandler = throttle(() => {
    // 检测当前可见标题
    const currentHeading = getCurrentHeading(tocItems);
    if (currentHeading) {
      highlightTocItemById(currentHeading.id);
    }

    // 更新阅读进度
    updateReadingProgress();
  }, 200);

  // 添加滚动事件监听
  window.addEventListener("scroll", scrollHandler);

  // 初始调用一次，确保初始状态正确
  if (scrollHandler) {
    scrollHandler();
  }
}

/**
 * 更新当前活跃标题
 */
function updateActiveHeading(): void {
  if (visibleHeadings.size === 0) return;

  // 转换为数组并按可见比例排序
  const sortedHeadings = Array.from(visibleHeadings.entries()).sort((a, b) => {
    // 首先按可见比例排序
    const ratioDiff = b[1].ratio - a[1].ratio;
    if (Math.abs(ratioDiff) > 0.1) {
      return ratioDiff;
    }

    // 如果可见比例相近，按照元素在页面中的位置排序
    const aRect = a[1].element.getBoundingClientRect();
    const bRect = b[1].element.getBoundingClientRect();
    return aRect.top - bRect.top;
  });

  // 获取最符合条件的标题ID
  if (sortedHeadings.length > 0) {
    const activeId = sortedHeadings[0][0];
    highlightTocItemById(activeId);
  }
}

/**
 * 将嵌套的目录树展平为一维数组
 * @param items 目录树
 * @returns 展平的一维数组
 */
function flattenTocItems(items: TocItem[]): TocItem[] {
  let result: TocItem[] = [];

  items.forEach((item) => {
    result.push(item);
    if (item.children.length > 0) {
      result = result.concat(flattenTocItems(item.children));
    }
  });

  return result;
}

/**
 * 销毁滚动监听器
 */
export function destroyScrollObserver(): void {
  if (headingObserver) {
    headingObserver.disconnect();
    headingObserver = null;
  }

  visibleHeadings.clear();

  if (scrollHandler) {
    window.removeEventListener("scroll", scrollHandler);
    scrollHandler = null;
  }
}

/**
 * 计算并更新阅读进度
 */
function updateReadingProgress(): void {
  // 文档总高度
  const documentHeight = Math.max(
    document.body.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.clientHeight,
    document.documentElement.scrollHeight,
    document.documentElement.offsetHeight
  );

  // 窗口高度
  const windowHeight =
    window.innerHeight || document.documentElement.clientHeight;

  // 已滚动的距离
  const scrollTop =
    window.pageYOffset ||
    document.documentElement.scrollTop ||
    document.body.scrollTop;

  // 有效滚动高度 (总高度减去窗口高度)
  const scrollableHeight = documentHeight - windowHeight;

  // 计算进度百分比
  let progressPercentage = 0;
  if (scrollableHeight > 0) {
    progressPercentage = (scrollTop / scrollableHeight) * 100;
  }

  // 更新进度条
  updateProgressBar(progressPercentage);
}
