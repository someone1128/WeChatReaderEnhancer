/**
 * 公众号阅读增强插件 - 弹出窗口脚本
 */

import { Settings } from "../types";

// DOM元素引用
const isEnabledCheckbox = document.getElementById(
  "isEnabled"
) as HTMLInputElement;
const tocWidthRange = document.getElementById(
  "tocWidthRange"
) as HTMLInputElement;
const tocWidthInput = document.getElementById("tocWidth") as HTMLInputElement;
const minLevelSelect = document.getElementById("minLevel") as HTMLSelectElement;
const maxLevelSelect = document.getElementById("maxLevel") as HTMLSelectElement;
const autoExpandCheckbox = document.getElementById(
  "autoExpand"
) as HTMLInputElement;
const saveButton = document.getElementById("saveButton") as HTMLButtonElement;
const resetButton = document.getElementById("resetButton") as HTMLButtonElement;

// 默认设置
const defaultSettings: Settings = {
  tocWidth: 280,
  autoExpand: true,
  minLevel: 1,
  maxLevel: 6,
  isEnabled: true,
};

// 初始化
async function init() {
  try {
    // 获取当前设置
    const settings = await getSettings();

    // 填充表单
    updateForm(settings);

    // 设置事件监听器
    setupEventListeners();
  } catch (error) {
    console.error("初始化失败:", error);
  }
}

// 更新表单值
function updateForm(settings: Settings) {
  isEnabledCheckbox.checked = settings.isEnabled;
  tocWidthRange.value = settings.tocWidth.toString();
  tocWidthInput.value = settings.tocWidth.toString();
  minLevelSelect.value = settings.minLevel.toString();
  maxLevelSelect.value = settings.maxLevel.toString();
  autoExpandCheckbox.checked = settings.autoExpand;
}

// 从表单获取设置
function getSettingsFromForm(): Settings {
  return {
    isEnabled: isEnabledCheckbox.checked,
    tocWidth: parseInt(tocWidthInput.value, 10),
    minLevel: parseInt(minLevelSelect.value, 10),
    maxLevel: parseInt(maxLevelSelect.value, 10),
    autoExpand: autoExpandCheckbox.checked,
  };
}

// 设置事件监听器
function setupEventListeners() {
  // 宽度滑块和输入框同步
  tocWidthRange.addEventListener("input", () => {
    tocWidthInput.value = tocWidthRange.value;
  });

  tocWidthInput.addEventListener("input", () => {
    tocWidthRange.value = tocWidthInput.value;
  });

  // 确保最小层级小于最大层级
  minLevelSelect.addEventListener("change", () => {
    const minLevel = parseInt(minLevelSelect.value, 10);
    const maxLevel = parseInt(maxLevelSelect.value, 10);

    if (minLevel > maxLevel) {
      maxLevelSelect.value = minLevelSelect.value;
    }
  });

  maxLevelSelect.addEventListener("change", () => {
    const minLevel = parseInt(minLevelSelect.value, 10);
    const maxLevel = parseInt(maxLevelSelect.value, 10);

    if (maxLevel < minLevel) {
      minLevelSelect.value = maxLevelSelect.value;
    }
  });

  // 保存设置
  saveButton.addEventListener("click", async () => {
    try {
      const settings = getSettingsFromForm();
      await saveSettings(settings);

      // 通知当前活跃标签页设置已更改
      await notifySettingsChanged(settings);

      // 显示保存成功
      showMessage("设置已保存");
    } catch (error) {
      console.error("保存设置失败:", error);
      showMessage("保存设置失败", true);
    }
  });

  // 重置为默认设置
  resetButton.addEventListener("click", () => {
    updateForm(defaultSettings);
  });
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
            resolve();
          }
        );
      } else {
        resolve();
      }
    });
  });
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
  messageElement.style.backgroundColor = isError ? "#f44336" : "#4caf50";
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
