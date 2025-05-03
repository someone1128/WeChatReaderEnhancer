/**
 * 公众号阅读增强插件 - 弹出窗口脚本
 */

import { Settings } from "../types";

// DOM元素引用
const tocWidthInput = document.getElementById("tocWidth") as HTMLInputElement;
const tocWidthRange = document.getElementById(
  "tocWidthRange"
) as HTMLInputElement;
const rangeProgress = document.getElementById("rangeProgress") as HTMLElement;
const resetButton = document.getElementById("resetButton") as HTMLButtonElement;

// 默认设置
const defaultSettings: Settings = {
  tocWidth: 280,
  minLevel: 1,
  maxLevel: 6,
  isEnabled: true,
};

// 上次触发时间
let lastTocWidthUpdate = 0;
// 宽度更新状态
let pendingWidthUpdate: number | null = null;
let updateTimeoutId: number | null = null;

// 初始化
async function init() {
  try {
    // 获取当前设置
    const settings = await getSettings();

    // 填充表单
    updateForm(settings);

    // 设置事件监听器 (包括进度条)
    setupEventListeners();

    // 处理 logo 图片路径
    setupLogoImages();

    // 初始化进度条UI
    updateRangeProgressUI(); // 调用此函数设置初始状态并添加监听器
  } catch (error) {
    console.error("初始化失败:", error);
  }
}

// 更新表单值
function updateForm(settings: Settings) {
  tocWidthInput.value = settings.tocWidth.toString();
  tocWidthRange.value = settings.tocWidth.toString();
  updateRangeProgressUI();
}

// 获取当前设置
async function getSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    // @ts-ignore
    chrome.storage.sync.get("settings", (data: { settings?: Settings }) => {
      resolve(data.settings || defaultSettings);
    });
  });
}

// 保存设置
async function saveSettings(settings: Settings): Promise<void> {
  return new Promise((resolve) => {
    // @ts-ignore
    chrome.storage.sync.set({ settings }, () => {
      if (chrome.runtime.lastError) {
        console.warn("保存设置出错:", chrome.runtime.lastError);
      }
      resolve();
    });
  });
}

// 通知活跃标签页设置已更改
async function notifySettingsChanged(settings: Settings): Promise<void> {
  return new Promise((resolve) => {
    // @ts-ignore
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        // @ts-ignore
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: "SETTINGS_CHANGED", settings },
          () => {
            if (chrome.runtime.lastError) {
              console.warn("通知标签页出错:", chrome.runtime.lastError);
            }
            resolve();
          }
        );
      } else {
        resolve();
      }
    });
  });
}

// 设置事件监听器
function setupEventListeners() {
  // 数字输入框改变时更新滑块和实时应用设置
  tocWidthInput.addEventListener("input", async () => {
    const width = parseInt(tocWidthInput.value, 10);
    if (width >= 200 && width <= 400) {
      tocWidthRange.value = width.toString();
      updateRangeProgressUI();
      // 立即更新，输入框变化频率较低，不需要节流
      await updateTocWidth(width);
    }
  });

  // 滑块改变时更新数字输入框和实时应用设置
  tocWidthRange?.addEventListener("input", () => {
    if (!tocWidthRange || !tocWidthInput) return;
    const width = parseInt(tocWidthRange.value, 10);
    tocWidthInput.value = width.toString();
    // updateRangeProgressUI(); // UI 更新由 handleRangeInput 处理
    // 使用节流函数，避免频繁更新
    throttledUpdateTocWidth(width);
  });

  // 滑块释放时确保设置被保存
  tocWidthRange?.addEventListener("change", async () => {
    if (!tocWidthRange) return;
    const width = parseInt(tocWidthRange.value, 10);
    // 确保最终值被保存
    if (pendingWidthUpdate !== null) {
      await updateTocWidth(width);
      pendingWidthUpdate = null;
    }
  });

  // 重置为默认设置
  resetButton?.addEventListener("click", async () => {
    if (!tocWidthInput || !tocWidthRange) return;
    tocWidthInput.value = defaultSettings.tocWidth.toString();
    tocWidthRange.value = defaultSettings.tocWidth.toString();
    updateRangeProgressUI(); // 更新UI
    await updateTocWidth(defaultSettings.tocWidth);
    showMessage("已恢复默认宽度");
  });
}

// 处理 logo 图片路径
function setupLogoImages() {
  const logoImages =
    document.querySelectorAll<HTMLImageElement>(".social-links img");
  logoImages.forEach((img) => {
    const originalSrc = img.getAttribute("src");
    if (originalSrc && originalSrc.startsWith("./logo/")) {
      // 转换为chrome.runtime.getURL格式
      const fileName = originalSrc.replace("./logo/", "");
      try {
        img.src = chrome.runtime.getURL(`logo/${fileName}`);
      } catch (e) {
        console.error(`无法获取 logo URL: logo/${fileName}`, e);
        // 保留原始路径或设置占位符
        // img.src = './placeholder.png';
      }
    }
  });
}

// 更新进度条UI - 设置初始状态并添加事件监听器
function updateRangeProgressUI() {
  if (!tocWidthRange || !rangeProgress) return;

  // 移除旧监听器，以防 init 被多次调用 (虽然不太可能)
  tocWidthRange.removeEventListener("input", handleRangeInput);

  // 设置初始宽度
  handleRangeInput.call(tocWidthRange); // 调用一次设置初始值

  // 添加新监听器
  tocWidthRange.addEventListener("input", handleRangeInput);
}

// 处理滑块输入事件 - 仅更新UI
function handleRangeInput(this: HTMLInputElement) {
  const min = parseInt(this.min);
  const max = parseInt(this.max);
  const value = parseInt(this.value);
  const percentage = ((value - min) / (max - min)) * 100;

  console.log(`Range Input: value=${value}, percentage=${percentage}%`);

  if (rangeProgress) {
    rangeProgress.style.setProperty("width", `${percentage}%`, "important");
    console.log(
      `Applied width ${percentage}% !important to rangeProgress element.`
    );
  } else {
    console.error("rangeProgress element not found!");
  }
}

// 节流函数，限制updateTocWidth的调用频率
function throttledUpdateTocWidth(width: number) {
  pendingWidthUpdate = width;

  const now = Date.now();
  const throttleDelay = 500; // 增加到500毫秒的节流延迟，降低API调用频率

  // 清除之前的定时器
  if (updateTimeoutId !== null) {
    window.clearTimeout(updateTimeoutId);
    updateTimeoutId = null;
  }

  // 如果距离上次更新已经超过节流时间，则立即更新
  if (now - lastTocWidthUpdate > throttleDelay) {
    updateTocWidth(width);
    lastTocWidthUpdate = now;
    pendingWidthUpdate = null;
  } else {
    // 否则设置定时器在节流时间后更新
    updateTimeoutId = window.setTimeout(
      () => {
        if (pendingWidthUpdate !== null) {
          updateTocWidth(pendingWidthUpdate);
          lastTocWidthUpdate = Date.now();
          pendingWidthUpdate = null;
        }
      },
      throttleDelay - (now - lastTocWidthUpdate)
    );
  }
}

// 更新目录宽度
async function updateTocWidth(width: number) {
  try {
    const settings = await getSettings();
    settings.tocWidth = width;
    await saveSettings(settings);
    await notifySettingsChanged(settings);
  } catch (error) {
    console.error("更新宽度失败:", error);
  }
}

// 显示消息
function showMessage(message: string, isError: boolean = false) {
  // 创建消息元素
  const messageElement = document.createElement("div");
  messageElement.textContent = message;
  messageElement.style.position = "fixed";
  messageElement.style.bottom = "16px";
  messageElement.style.left = "50%";
  messageElement.style.transform = "translateX(-50%)";
  messageElement.style.padding = "8px 16px";
  messageElement.style.borderRadius = "4px";
  messageElement.style.backgroundColor = isError ? "#f44336" : "#01CC7A";
  messageElement.style.color = "white";
  messageElement.style.zIndex = "1000";
  messageElement.style.transition = "opacity 0.3s";

  // 添加到页面
  document.body.appendChild(messageElement);

  // 2秒后移除
  setTimeout(() => {
    messageElement.style.opacity = "0";
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.parentNode.removeChild(messageElement);
      }
    }, 300);
  }, 2000);
}

// 初始化
document.addEventListener("DOMContentLoaded", init);
