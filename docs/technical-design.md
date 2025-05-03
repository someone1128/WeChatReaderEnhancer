# 公众号阅读增强插件 - 技术设计文档

## 技术架构

我们采用标准的 Chrome 扩展 Manifest V3 架构来实现该插件。

### 主要组件

1. **Manifest 文件** - 定义插件基本信息、权限和资源
2. **Content Script** - 在公众号文章页面中执行的脚本，负责：
   - 识别页面中的标题元素
   - 构建目录结构
   - 注入目录 UI 组件
   - 处理导航与高亮逻辑
3. **Background Service Worker** - 处理扩展的生命周期和全局状态
4. **Popup UI** - 用户配置界面（未来版本）
5. **样式文件** - 定义目录 UI 的样式

## 详细设计

### Manifest (manifest.json)

```json
{
  "manifest_version": 3,
  "name": "公众号阅读增强器",
  "description": "为微信公众号文章生成结构化目录，提升阅读体验",
  "version": "1.0.0",
  "permissions": ["storage"],
  "host_permissions": ["https://mp.weixin.qq.com/*"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["https://mp.weixin.qq.com/s*"],
      "js": ["content.js"],
      "css": ["toc.css"]
    }
  ],
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### 内容脚本 (content.ts)

Content Script 是插件的核心，主要处理：

1. **标题识别与解析**

   - 使用 DOM 选择器识别文章中的标题元素（h1-h6）
   - 提取标题文本与层级关系
   - 创建目录树数据结构

2. **目录 UI 生成**

   - 创建侧边栏容器
   - 根据目录树数据生成 HTML 目录
   - 插入到页面 DOM 中
   - 处理可折叠/展开逻辑

3. **导航与滚动同步**

   - 监听点击事件，实现目录项点击导航
   - 使用 IntersectionObserver API 监听滚动，实现目录项自动高亮
   - 处理平滑滚动效果

4. **性能优化**
   - 使用 DOM 操作批处理，减少重排
   - 使用节流函数处理滚动事件
   - 懒加载与移除不在视图内的 DOM 元素

### 样式设计 (toc.css)

定义目录 UI 的样式，包括：

- 侧边栏容器样式（固定位置、宽度、高度）
- 目录项样式（缩进、高亮状态）
- 折叠/展开图标样式
- 滚动条样式
- 响应式布局适配

### 数据结构

目录项的数据结构:

```typescript
interface TocItem {
  id: string; // 标题元素的唯一ID
  level: number; // 标题级别 (1-6)
  text: string; // 标题文本内容
  element: HTMLElement; // 原始DOM元素引用
  children: TocItem[]; // 子标题项
  isExpanded: boolean; // 是否展开子项
}
```

## 技术挑战与解决方案

### 挑战 1: 准确识别公众号文章标题

**解决方案**:

- 分析多个公众号文章页面 DOM 结构，找出共同模式
- 使用多种选择器策略（标签选择器、类选择器、内容启发式）结合
- 针对不同的文章结构采用不同的解析策略

### 挑战 2: 目录与文章滚动同步精确性

**解决方案**:

- 使用 IntersectionObserver API 代替传统滚动事件
- 设置适当的阈值和根边距
- 综合考虑多个可见标题，采用最接近顶部的标题作为当前位置

### 挑战 3: 性能优化

**解决方案**:

- 目录更新使用 RequestAnimationFrame 避免卡顿
- 大型 DOM 操作使用 DocumentFragment 批处理
- 滚动事件使用 throttle 函数限制调用频率

## 安全考虑

1. 严格的内容安全策略(CSP)
2. 避免 eval 和 innerHTML 等不安全操作
3. 用户数据只存储在本地，不发送到外部服务器

## 测试策略

1. 单元测试: 测试核心逻辑函数
2. 集成测试: 测试 DOM 操作与事件处理
3. 端到端测试: 在真实公众号文章上测试完整功能

## 未来技术扩展

1. 使用 Shadow DOM 隔离插件样式
2. 添加用户数据同步功能
3. 支持更多内容识别能力，如图表、代码块等特殊内容
