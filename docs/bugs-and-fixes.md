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

### 5. 图片查看器重构为medium-zoom库

**问题描述**：
原有自定义图片查看器实现虽然功能完整，但存在一些边缘情况处理不当，且维护成本较高。同时，随着项目规模扩大，需要更成熟的图片查看解决方案。

**解决方案**：

1. 使用成熟的medium-zoom库（3.8k+ stars）替代自定义实现
2. 保留对微信公众号特殊图片格式的支持（如data-src属性处理）
3. 添加动态DOM观察，支持延迟加载的图片

**实现细节**：

1. 安装medium-zoom依赖：`npm install medium-zoom --save`
2. 重构imageViewer.ts，使用medium-zoom API替代原有实现
3. 添加data-zoom-src属性支持，处理微信图片高清链接
4. 实现MutationObserver监听DOM变化，处理动态加载的图片
5. 确保正确处理资源清理和内存回收

**优势**：

1. 代码更精简，降低维护成本
2. 更好的兼容性，medium-zoom经过大量实际应用验证
3. 性能优化更完善，提供更流畅的用户体验
4. 支持更多高级功能（如自定义模板、事件系统）
5. 更好的框架集成支持

**关键代码**：

```typescript
import mediumZoom from "medium-zoom";

// 保存zoom实例的引用，便于后续清理
let zoom: ReturnType<typeof mediumZoom> | null = null;
// 保存MutationObserver实例，用于观察新图片
let observer: MutationObserver | null = null;

export function initImageViewer(): void {
  // 防止重复初始化
  if (zoom) return;

  try {
    // 处理当前页面上的图片
    processArticleImages();

    // 初始化medium-zoom
    zoom = mediumZoom("img.rich_pages, img.wxw-img", {
      background: "rgba(0, 0, 0, 0.85)",
      margin: 24,
      scrollOffset: 0,
    });

    // 设置MutationObserver观察DOM变化
    setupImageObserver();
  } catch (error) {
    console.error("图片查看器初始化失败:", error);
  }
}
```

**经验教训**：

1. 不要重复造轮子，优先考虑使用成熟的开源库
2. 在引入第三方库时，需要评估其性能、维护状态和生态系统
3. 即使使用第三方库，也需要处理好特定场景的适配（如微信图片格式）
4. 动态DOM观察是处理现代Web应用延迟加载内容的有效方式
5. 保持代码模块化，即使替换底层实现也能保持API一致性

### 6. 图片查看器功能增强

**问题描述**：
使用medium-zoom库替代自定义实现后，仍需要一些额外功能来增强用户体验，包括：更精细的缩放控制、图片下载功能，以及性能优化。

**解决方案**：

1. 性能优化：

   - 添加节流函数(throttle)，减少MutationObserver触发的处理频率
   - 优化图片处理逻辑，使用异步处理避免阻塞主线程
   - 简化DOM节点检测，提高观察器效率

2. 添加图片控制功能：
   - 实现图片放大/缩小按钮，允许用户手动调整缩放级别
   - 添加图片下载按钮，支持保存高清图片
   - 添加重置按钮，快速恢复到默认缩放状态

**实现细节**：

1. 节流函数实现，限制高频操作：

```typescript
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
```

2. 图片下载功能：

```typescript
function downloadImage(): void {
  if (!currentImageUrl) return;

  try {
    // 创建一个临时链接
    const a = document.createElement("a");
    a.href = currentImageUrl;

    // 提取文件名
    let filename = "image.jpg";
    const urlParts = currentImageUrl.split("/");
    // ...文件名提取逻辑...

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (error) {
    // 备用下载方法: 打开新标签
    window.open(currentImageUrl, "_blank");
  }
}
```

3. 图片缩放控制：

```typescript
function zoomInImage(): void {
  if (!zoom) return;

  const zoomedImage = document.querySelector(".medium-zoom-image--opened");
  if (zoomedImage instanceof HTMLElement) {
    currentZoomLevel = Math.min(currentZoomLevel + 0.25, 3);
    zoomedImage.style.transform = `scale(${currentZoomLevel})`;
  }
}

function zoomOutImage(): void {
  // ...类似缩小逻辑...
}

function resetZoom(): void {
  // ...重置缩放逻辑...
}
```

**优势**：

1. 改进的性能处理减少了插件对页面性能的影响
2. 新增的下载功能解决了用户保存图片的需求
3. 缩放控制提供了比默认更灵活的图片查看体验
4. 控件UI设计简洁直观，易于使用

**经验教训**：

1. 对于高频触发的事件处理，节流函数是提高性能的有效手段
2. 扩展现有功能时，可以利用DOM操作添加自定义控件
3. 图片操作需要考虑兼容性和错误处理，提供备用方案
4. 使用CSS过渡效果可以提升UI交互的流畅感
5. UI控件应当设计得简洁明了，功能符合用户直觉

### 7. 图片查看器缩放控制冲突修复

**问题描述**：
使用medium-zoom库实现图片查看功能后，添加的自定义缩放控制（放大/缩小/重置）与medium-zoom内部的缩放机制发生冲突，导致出现双重图片或缩放异常。

**原因分析**：

1. 直接通过CSS `transform: scale()` 修改已打开的图片元素样式，干扰了medium-zoom库的内部工作机制
2. medium-zoom库通过克隆图片并自行管理transform样式来实现缩放效果
3. 我们的自定义缩放作用在medium-zoom创建的元素上，导致两种缩放机制冲突

**解决方案**：

1. 重新设计缩放控制实现方式，使用medium-zoom的API而非直接修改DOM
2. 通过关闭当前查看的图片，调整缩放参数后再重新打开的方式实现不同缩放级别
3. 调整margin参数来配合缩放级别，保持合适的边距比例
4. 删除下载功能，专注于提供高质量的缩放体验

**实现细节**：

```typescript
// 定义缩放常量
const DEFAULT_MARGIN = 40;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

function zoomInImage(): void {
  if (!zoom || !currentImageElement) return;

  // 计算新的缩放级别
  currentZoomLevel = Math.min(currentZoomLevel + ZOOM_STEP, MAX_ZOOM);

  // 关闭当前查看的图片
  zoom.close().then(() => {
    if (!zoom || !currentImageElement) return;

    // 更新margin以适应缩放级别
    zoom.update({
      margin: DEFAULT_MARGIN / currentZoomLevel,
    });

    // 重新打开图片
    zoom.open({ target: currentImageElement });
  });
}
```

**经验教训**：

1. 使用第三方库时，需要深入理解其实现原理，避免干扰其内部工作机制
2. 扩展现有功能时，优先考虑通过API而不是修改DOM来实现
3. 当两种技术方案发生冲突时，应重新审视实现方式，寻找更协调的解决方案
4. 正确使用Promise和异步操作确保UI操作的顺序性
5. 简化功能有时比添加多种功能更重要，专注于核心体验

### 8. 精简图片查看器功能

**问题描述**：
自定义缩放控制功能（放大/缩小/重置按钮）在实际使用中存在问题，点击按钮没有产生预期的缩放效果，反而导致图片关闭。这降低了用户体验，造成功能混乱。

**原因分析**：

1. medium-zoom库的API使用方式与预期不符
2. 实现的缩放逻辑（先close再open）导致交互不流畅
3. 添加的自定义控件与medium-zoom内置行为之间存在冲突
4. 复杂功能增加了代码维护难度

**解决方案**：

1. 完全移除自定义缩放控制功能
2. 恢复至medium-zoom库的基础功能
3. 简化代码，删除所有与缩放控制相关的变量、函数和事件处理
4. 专注于提供简单可靠的图片查看体验

**实现细节**：

```typescript
// 初始化medium-zoom，针对微信公众号文章中的图片
zoom = mediumZoom("img.rich_pages, img.wxw-img", {
  background: "rgba(0, 0, 0, 0.85)",
  margin: 40,
  scrollOffset: 0,
});
```

**经验教训**：

1. 简单胜于复杂，提供简单可靠的功能比提供不稳定的高级功能更重要
2. 在扩展第三方库功能时，需谨慎测试各种边缘情况
3. 当功能实现过于复杂或不稳定时，应考虑回退到更简单的方案
4. 功能设计应以用户体验为中心，避免过度工程化
5. medium-zoom库本身已提供良好的图片查看体验，无需过多定制

### 9. 侧边栏状态持久化

**问题描述**：
用户设置的侧边栏展开/折叠状态在页面刷新或重新打开后无法保持，每次重新打开文章都会重置为展开状态，影响用户体验。

**原因分析**：

1. 之前侧边栏状态使用localStorage存储，但这种存储方式不适合跨页面和跨会话持久化
2. localStorage在部分情况下可能被清除或不可用
3. 初始化逻辑中，优先考虑了settings中的autoExpand设置，而不是用户最后的选择

**解决方案**：

1. 将存储方式从localStorage改为chrome.storage.local
2. 添加错误处理和降级机制，确保在chrome.storage不可用时仍能保持基本功能
3. 优化初始化逻辑，优先使用用户上次的选择，而不是默认设置

**实现细节**：

```typescript
// 保存状态到chrome.storage
try {
  // @ts-ignore
  chrome.storage.local.set({ "wechat-toc-minimized": true });
} catch (error) {
  console.error("保存目录状态失败:", error);
  // 降级到localStorage作为备用
  localStorage.setItem("wechat-toc-minimized", "true");
}

// 恢复状态
try {
  // @ts-ignore
  chrome.storage.local.get("wechat-toc-minimized", (result) => {
    if (result && "wechat-toc-minimized" in result) {
      if (result["wechat-toc-minimized"] === true) {
        minimizeTocPanel();
      } else {
        expandTocPanel();
      }
    } else {
      // 降级到localStorage
      // ...
    }
  });
} catch (error) {
  // 错误处理...
}
```

**优势**：

1. 使用chrome.storage.local存储数据，在浏览器重启后也能保持状态
2. 添加了错误处理机制，提高了代码的健壮性
3. 提供了降级策略，在出现问题时仍能保持基本功能

**经验教训**：

1. 对于需要持久化的用户偏好设置，应使用chrome.storage而非localStorage
2. 功能实现需要考虑异常情况和降级策略
3. 用户体验的细节（如记住用户的UI状态偏好）对整体印象有重要影响
4. 优先考虑用户的实际选择，而不是开发者预设的默认值
