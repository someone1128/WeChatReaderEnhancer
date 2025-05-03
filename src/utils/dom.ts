/**
 * DOM操作工具函数
 */

import { TocItem } from "../types";

/**
 * 创建具有指定属性的HTML元素
 * @param tag HTML标签名
 * @param attributes 属性对象
 * @param children 子元素数组或文本内容
 * @returns 创建的HTML元素
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string> = {},
  children?: (HTMLElement | string)[] | string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  // 设置属性
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  // 添加子元素或文本
  if (children) {
    if (typeof children === "string") {
      element.textContent = children;
    } else {
      children.forEach((child) => {
        if (typeof child === "string") {
          element.appendChild(document.createTextNode(child));
        } else {
          element.appendChild(child);
        }
      });
    }
  }

  return element;
}

/**
 * 为元素添加类名
 * @param element HTML元素
 * @param classNames 要添加的类名列表
 */
export function addClass(element: HTMLElement, ...classNames: string[]): void {
  element.classList.add(...classNames);
}

/**
 * 从元素移除类名
 * @param element HTML元素
 * @param classNames 要移除的类名列表
 */
export function removeClass(
  element: HTMLElement,
  ...classNames: string[]
): void {
  element.classList.remove(...classNames);
}

/**
 * 切换元素的类名
 * @param element HTML元素
 * @param className 要切换的类名
 * @param force 强制添加或移除
 */
export function toggleClass(
  element: HTMLElement,
  className: string,
  force?: boolean
): void {
  element.classList.toggle(className, force);
}

/**
 * 查找文章中的所有标题元素
 * @param container 容器元素，默认为document.body
 * @param minLevel 最小标题级别
 * @param maxLevel 最大标题级别
 * @returns 标题元素数组
 */
export function findHeadings(
  container: HTMLElement = document.body,
  minLevel: number = 1,
  maxLevel: number = 6
): HTMLElement[] {
  const selectors = Array.from(
    { length: maxLevel - minLevel + 1 },
    (_, i) => `h${i + minLevel}`
  ).join(", ");

  // 获取所有标题元素
  const headings = Array.from(container.querySelectorAll(selectors));

  // 过滤掉空白的标题元素
  return headings.filter((heading) => {
    // 获取文本内容并去除空格
    const text = heading.textContent?.trim() || "";
    // 检查标题是否有实际内容
    return text.length > 0;
  }) as HTMLElement[];
}

/**
 * 生成唯一ID
 * @returns 唯一ID字符串
 */
export function generateId(): string {
  return `toc-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 平滑滚动到指定元素
 * @param element 目标元素
 * @param offset 偏移量
 */
export function scrollToElement(
  element: HTMLElement,
  offset: number = 0
): void {
  const rect = element.getBoundingClientRect();
  const top = rect.top + window.pageYOffset - offset;

  window.scrollTo({
    top,
    behavior: "smooth",
  });
}

/**
 * 获取元素的文本内容，忽略脚本和样式标签
 * @param element HTML元素
 * @returns 文本内容
 */
export function getElementText(element: HTMLElement): string {
  // 创建一个文档片段来复制元素
  const clone = element.cloneNode(true) as HTMLElement;

  // 移除所有脚本和样式标签
  const scriptsAndStyles = clone.querySelectorAll("script, style");
  scriptsAndStyles.forEach((node) => node.remove());

  // 获取文本内容
  return clone.textContent?.trim() || "";
}

/**
 * 节流函数 - 限制函数调用频率
 * @param fn 要执行的函数
 * @param delay 延迟时间
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
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
