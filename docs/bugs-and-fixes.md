# 已知问题与修复记录

本文档记录项目开发中遇到的各种问题及其解决方案，以便团队成员学习和避免类似问题重复出现。

## 图片查看器相关问题

### 1. 图片查看器关闭后再次点击图片立即闪烁问题

**问题描述**：用户第一次点击图片可以正常放大查看，但关闭查看器后再次点击图片时，查看器会快速闪现然后立即关闭。

**原因分析**：

- 缺少事件处理的冷却机制，导致关闭查看器后事件状态混乱
- 在 `handleImageClick` 函数中没有判断查看器当前是否可见
- 查看器关闭动画过程中状态管理不完善

**解决方案**：

1. 添加冷却时间状态变量 `isInCooldown`，防止查看器关闭动画过程中再次触发点击事件
2. 在 `handleImageClick` 函数开始处增加状态检查，如果查看器正在显示或处于冷却状态，直接返回不处理
3. 优化 `hideImageViewer` 函数，确保动画完成后再允许新的点击事件
4. 改进 `resetViewerState` 函数，同时重置可见状态和冷却状态
5. 确保所有异常处理路径都调用 `resetViewerState` 重置状态

**修复代码关键部分**：

```typescript
// 添加冷却时间状态
let isInCooldown = false;

function handleImageClick(e: MouseEvent): void {
  try {
    // 如果查看器正在显示或处于冷却状态，不处理点击
    if (isVisible || isInCooldown) {
      return;
    }

    // 其余处理逻辑...
  }
}

function hideImageViewer(): void {
  try {
    // 设置冷却状态，防止快速重复点击
    isInCooldown = true;

    // 查看器关闭处理...

    // 动画完成后解除冷却状态
    setTimeout(() => {
      isInCooldown = false;
    }, 300);
  } catch (error) {
    resetViewerState(); // 确保出错时也重置状态
  }
}

function resetViewerState(): void {
  isVisible = false;
  isInCooldown = false;
  document.body.style.overflow = "";
}
```

**经验教训**：

1. 实现交互元素时，要考虑事件处理的时序性，特别是在有动画效果的情况下
2. 对于模态窗口类UI，需特别关注打开/关闭状态的管理
3. 添加防抖或冷却机制可以避免快速重复触发导致的状态混乱
4. 确保所有异常处理路径都能正确还原UI状态

### 2. 第二次点击图片出现404错误问题

**问题描述**：第一次点击图片正常显示，但关闭后再次点击相同图片时，图片先显示加载中状态，然后变成404错误，查看器随即自动关闭。

**原因分析**：

- 微信图片URL中的查询参数（如 `?wx_fmt=png`）对图片加载至关重要，不能被移除
- 在 `getOriginalImageUrl` 函数中错误地移除了URL参数（使用了 `dataSrc.split("&")[0]`）
- 图片关闭时将图片src直接设置为空字符串，可能导致浏览器缓存失效

**解决方案**：

1. 修改 `getOriginalImageUrl` 函数，保留微信图片URL中的所有查询参数
2. 优化图片关闭处理逻辑，不立即清空图片src，而是先设置为1x1透明像素的base64图片
3. 确保动画结束后再进行资源清理，避免视觉上的闪烁

**修复代码关键部分**：

```typescript
// 获取图片的原始URL（高清图）
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

function hideImageViewer(): void {
  try {
    // 设置状态和动画...

    // 延迟清空图片源，避免立即清空导致图片状态错误
    if (imageElement) {
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
      }, 300);
    }
  } catch (error) {
    resetViewerState();
  }
}
```

**经验教训**：

1. 处理第三方资源URL时，不要随意修改或删除URL参数，特别是对于大型平台如微信的资源
2. 图片URL中的查询参数通常包含必要的格式、认证或缓存控制信息
3. 在Web应用中清理资源时，使用1x1透明像素图片比使用空字符串更安全
4. 理解CDN和资源分发系统的工作原理，避免错误处理导致资源不可访问

### 3. 插件代码在页面上显示问题

**问题描述**：在浏览页面时，插件的压缩后JavaScript代码意外地显示在了页面内容中。用户可以看到整个压缩后的插件代码。

**原因分析**：

- 内容脚本注入方式不当，导致脚本被视为页面内容处理
- 未正确使用Chrome扩展的content_scripts配置
- 可能在动态创建的DOM元素中错误地包含了脚本代码
- 发生了脚本与页面的跨域污染

**解决方案**：

1. 确保content_scripts在manifest.json中正确配置
2. 使用Chrome扩展API推荐的方式注入脚本，而非手动添加script标签
3. 检查并修复任何可能将脚本内容暴露给DOM的代码
4. 隔离插件代码，使用沙箱模式执行

**修复代码关键部分**：

```json
// manifest.json中的正确配置
"content_scripts": [
  {
    "matches": ["https://mp.weixin.qq.com/s*"],
    "js": ["content.js"],
    "css": ["toc.css"],
    "run_at": "document_idle"
  }
]
```

```typescript
// 动态注入脚本的正确方式 (如果需要)
const script = document.createElement("script");
script.src = chrome.runtime.getURL("inject.js");
script.onload = function () {
  this.remove(); // 注入后移除script标签
};
(document.head || document.documentElement).appendChild(script);
```

**经验教训**：

1. 始终按照Chrome扩展开发最佳实践来注入内容脚本
2. 避免直接将代码作为字符串插入到DOM中
3. 注意跨域和沙箱隔离，确保插件代码与网页内容严格分离
4. 使用Chrome扩展的web_accessible_resources正确管理可访问资源
5. 进行充分的错误处理，避免插件代码暴露到页面环境中

### 4. 图片查看器性能问题和内容偏移问题

**问题描述**：
点击图片放大查看时存在明显延迟，并且在点击图片时会导致文章内容发生微小偏移，影响用户体验。

**原因分析**：

- 图片加载和渲染过程中的性能问题，未使用现代的性能优化技术
- 查看器元素影响了页面布局，导致DOM重排和内容偏移
- 事件处理没有充分优化，导致点击响应延迟
- 缺少图片预加载机制，每次需要重新从网络请求图片

**解决方案**：

1. 添加图片预加载功能，提前加载文章中的图片
2. 使用CSS `will-change` 属性优化动画性能
3. 添加 `pointer-events: none` 使查看器在非活动状态下不接收事件
4. 使用 `requestAnimationFrame` 进行渲染优化
5. 使用更合理的DOM初始化方式，避免影响页面布局
6. 优化事件监听器，使用 `{ passive: false }` 提高事件处理性能

**修复代码关键部分**：

```typescript
// 添加图片预加载集合
const preloadedImages = new Set<string>();

// 添加CSS性能优化
const inlineStyles = `
  .wechat-image-viewer {
    /* ... 其他样式 ... */
    will-change: opacity, visibility;
    pointer-events: none;
  }
  .wechat-image-viewer-active {
    /* ... 其他样式 ... */
    pointer-events: auto;
  }
`;

// 避免影响页面布局
document.body.appendChild(imageViewer);
imageViewer.style.display = "none";
setTimeout(() => {
  if (imageViewer) {
    imageViewer.style.display = "flex";
  }
}, 100);

// 预加载图片
function preloadArticleImages() {
  try {
    const articleImages = Array.from(
      document.querySelectorAll("img.rich_pages, img.wxw-img")
    ) as HTMLImageElement[];

    const imagesToPreload = articleImages.slice(0, 10);
    imagesToPreload.forEach((img) => {
      const url = getOriginalImageUrl(img);
      if (url && !preloadedImages.has(url)) {
        preloadedImages.add(url);
        const preloadImg = new Image();
        preloadImg.src = url;
      }
    });
  } catch (error) {
    console.error("预加载图片失败:", error);
  }
}

// 使用requestAnimationFrame优化渲染
requestAnimationFrame(() => {
  showImageViewer(originalSrc);
});
```

**经验教训**：

1. 现代Web应用需要充分考虑性能优化，特别是对于有动画效果的交互元素
2. 使用CSS `will-change` 可以让浏览器为即将发生变化的元素创建单独的图层，提高动画性能
3. 使用 `pointer-events: none` 可以让元素在不需要交互时完全不接收事件，减少事件处理开销
4. 通过 `requestAnimationFrame` 可以将视觉更新与浏览器的渲染周期同步，减少闪烁和重绘
5. 图片预加载是提高图片查看器响应速度的重要技术，能显著改善用户体验
6. 减少DOM的布局影响（Layout Thrashing）是提高页面性能的关键
