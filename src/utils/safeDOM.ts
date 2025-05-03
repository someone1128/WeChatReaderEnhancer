/**
 * 安全DOM操作工具
 * 提供安全的DOM操作方法，防止脚本泄露到页面内容
 */

/**
 * 安全地创建DOM元素
 * @param tagName 标签名称
 * @param attributes 属性对象
 * @param content 内容（字符串或子元素数组）
 * @returns 创建的DOM元素
 */
export function safeCreateElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  attributes: Record<string, string> = {},
  content?: string | (HTMLElement | Text)[]
): HTMLElementTagNameMap[K] {
  try {
    // 创建元素
    const element = document.createElement(tagName);

    // 添加属性
    Object.entries(attributes).forEach(([key, value]) => {
      if (typeof value === "string") {
        element.setAttribute(key, value);
      }
    });

    // 添加内容
    if (content) {
      if (typeof content === "string") {
        // 使用textContent而不是innerHTML，防止XSS
        element.textContent = content;
      } else if (Array.isArray(content)) {
        content.forEach((child) => {
          if (child instanceof Node) {
            element.appendChild(child);
          }
        });
      }
    }

    return element;
  } catch (error) {
    console.error("安全创建DOM元素失败:", error);
    // 返回一个空的元素作为回退
    return document.createElement(tagName);
  }
}

/**
 * 安全地将脚本或样式注入到页面
 * @param code 脚本或样式代码
 * @param type 类型（'script' 或 'style'）
 */
export function safeInjectCode(code: string, type: "script" | "style"): void {
  try {
    if (type === "style") {
      const styleElement = document.createElement("style");
      styleElement.textContent = code;
      document.head.appendChild(styleElement);
    } else if (type === "script") {
      // 对于脚本，使用blob URL而不是直接插入代码
      const blob = new Blob([code], { type: "text/javascript" });
      const scriptElement = document.createElement("script");

      // 使用blob URL
      const url = URL.createObjectURL(blob);
      scriptElement.src = url;

      // 脚本加载后释放blob URL
      scriptElement.onload = () => {
        URL.revokeObjectURL(url);
        scriptElement.remove(); // 注入后移除脚本标签
      };

      document.head.appendChild(scriptElement);
    }
  } catch (error) {
    console.error(`安全注入${type}代码失败:`, error);
  }
}

/**
 * 安全地将HTML字符串转换为DocumentFragment
 * 移除所有脚本标签和危险属性
 * @param html HTML字符串
 * @returns DocumentFragment
 */
export function safeParseHTML(html: string): DocumentFragment {
  try {
    // 创建一个DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // 移除所有脚本标签
    const scripts = doc.querySelectorAll("script");
    scripts.forEach((script) => script.remove());

    // 移除所有可能导致XSS的危险属性
    const allElements = doc.querySelectorAll("*");
    allElements.forEach((el) => {
      // 移除on*属性和javascript:URLs
      Array.from(el.attributes).forEach((attr) => {
        if (
          attr.name.toLowerCase().startsWith("on") ||
          attr.value.toLowerCase().includes("javascript:")
        ) {
          el.removeAttribute(attr.name);
        }
      });
    });

    // 创建DocumentFragment并添加内容
    const fragment = document.createDocumentFragment();
    Array.from(doc.body.childNodes).forEach((node) => {
      fragment.appendChild(node.cloneNode(true));
    });

    return fragment;
  } catch (error) {
    console.error("安全解析HTML失败:", error);
    return document.createDocumentFragment();
  }
}

/**
 * 检测页面上是否存在脚本注入问题
 * 如果发现插件代码暴露在页面中，尝试清理
 */
export function detectAndCleanScriptLeak(): void {
  try {
    // 寻找可能的泄露脚本内容
    const possibleLeaks = Array.from(
      document.querySelectorAll("pre, code, div.content")
    ).filter((el) => {
      const text = el.textContent || "";
      // 检查是否包含我们插件的特征字符串
      return (
        text.includes("wechat-toc") ||
        text.includes("wechat-image-viewer") ||
        text.includes("公众号阅读增强插件")
      );
    });

    // 如果找到泄露，进行清理
    if (possibleLeaks.length > 0) {
      console.warn("检测到可能的脚本泄露，正在清理...");
      possibleLeaks.forEach((el) => {
        // 清空内容或移除元素
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
      console.log("脚本泄露清理完成");
    }
  } catch (error) {
    console.error("检测和清理脚本泄露失败:", error);
  }
}
