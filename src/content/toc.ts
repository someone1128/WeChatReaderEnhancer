/**
 * 目录生成核心逻辑
 */

import { TocItem } from "../types";
import { findHeadings, generateId, getElementText } from "../utils/dom";

/**
 * 从标题元素数组生成目录树
 * @param headings 标题元素数组
 * @returns 目录树
 */
export function buildTocTree(headings: HTMLElement[]): TocItem[] {
  if (!headings.length) return [];

  // 按照在文档中出现的顺序排序标题
  headings.sort((a, b) => {
    const posA = a.getBoundingClientRect().top;
    const posB = b.getBoundingClientRect().top;
    return posA - posB;
  });

  // 为每个标题创建基础目录项
  const items: TocItem[] = headings.map((heading) => {
    // 获取标题级别
    const level = parseInt(heading.tagName.substring(1), 10);

    // 为标题元素添加ID（如果没有）
    if (!heading.id) {
      heading.id = generateId();
    }

    return {
      id: heading.id,
      level,
      text: getElementText(heading),
      element: heading,
      children: [],
      isExpanded: true,
    };
  });

  // 构建树结构
  const root: TocItem[] = [];
  const stack: TocItem[] = [];

  items.forEach((item) => {
    // 清空栈直到找到一个级别小于当前项的父级
    while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      // 一级标题，添加到根节点
      root.push(item);
    } else {
      // 子标题，添加到父标题的children中
      stack[stack.length - 1].children.push(item);
    }

    // 将当前项压入栈中
    stack.push(item);
  });

  return root;
}

/**
 * 查找文章的主要内容容器
 * @returns 主要内容容器元素
 */
export function findArticleContainer(): HTMLElement | null {
  // 微信公众号文章主要内容容器的常见选择器
  const selectors = [
    // 主要内容区域
    "#js_content",
    ".rich_media_content",
    // 回退选择器
    "article",
    ".article",
    ".post-content",
  ];

  for (const selector of selectors) {
    const container = document.querySelector(selector);
    if (container && container instanceof HTMLElement) {
      return container;
    }
  }

  // 如果找不到特定容器，返回body作为回退
  return document.body;
}

/**
 * 尝试识别文章标题
 * @returns 文章标题文本
 */
export function getArticleTitle(): string {
  // 微信公众号文章标题的常见选择器
  const selectors = ["#activity-name", ".rich_media_title", "h1.title", "h1"];

  for (const selector of selectors) {
    const titleElement = document.querySelector(selector);
    if (titleElement && titleElement.textContent) {
      return titleElement.textContent.trim();
    }
  }

  return "文章目录";
}

/**
 * 展开或折叠目录项
 * @param item 目录项
 * @param isExpanded 是否展开
 */
export function toggleItemExpansion(item: TocItem, isExpanded?: boolean): void {
  // 如果未指定isExpanded，则切换当前状态
  item.isExpanded = isExpanded !== undefined ? isExpanded : !item.isExpanded;

  // 递归设置所有子项
  if (item.children.length > 0) {
    item.children.forEach((child) => {
      // 如果父项折叠，所有子项也折叠；如果父项展开，子项状态不变
      if (!item.isExpanded) {
        toggleItemExpansion(child, false);
      }
    });
  }
}

/**
 * 查找目录中对应的元素
 * @param items 目录树
 * @param id 目标ID
 * @returns 找到的目录项或null
 */
export function findTocItemById(items: TocItem[], id: string): TocItem | null {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }

    if (item.children.length > 0) {
      const found = findTocItemById(item.children, id);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

/**
 * 获取当前视图中最顶部的标题
 * @param items 目录树
 * @param topOffset 顶部偏移量
 * @returns 当前视图中最顶部的标题
 */
export function getCurrentHeading(
  items: TocItem[],
  topOffset: number = 100
): TocItem | null {
  // 展平目录树
  const flatItems = flattenTocItems(items);

  // 按照元素在页面中的位置排序
  const visibleItems = flatItems
    .filter((item) => {
      const rect = item.element.getBoundingClientRect();
      return rect.top <= topOffset && rect.bottom > 0;
    })
    .sort((a, b) => {
      const rectA = a.element.getBoundingClientRect();
      const rectB = b.element.getBoundingClientRect();
      return Math.abs(rectA.top - topOffset) - Math.abs(rectB.top - topOffset);
    });

  return visibleItems.length > 0 ? visibleItems[0] : null;
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
