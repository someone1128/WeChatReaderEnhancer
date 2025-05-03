# 公众号阅读增强插件 (WeChat Reader Enhancer)

![版本](https://img.shields.io/badge/版本-1.0.0-blue)
![许可证](https://img.shields.io/badge/许可证-MIT-green)

## 📖 项目简介

公众号阅读增强插件是一款 Chrome 浏览器扩展，旨在提升用户在电脑上阅读微信公众号文章的体验。本插件提供多种功能增强，让阅读体验更加舒适高效。

### 核心功能

- **文章目录导航**：自动生成结构化目录，轻松了解文章结构并快速跳转
- **图片查看增强**：点击文章图片可放大查看，支持全屏浏览
- **阅读位置追踪**：滚动文章时，目录中自动高亮当前阅读位置
- **界面定制优化**：精心设计的UI，不影响原文阅读体验

![插件预览](docs/images/preview.png)

## ✨ 功能详解

### 文章目录导航

- **自动结构化**：智能识别文章中的标题层级，生成结构化目录
- **快速跳转**：点击目录项直接跳转到文章对应位置，支持平滑滚动
- **实时位置追踪**：根据阅读位置自动高亮对应目录项
- **折叠与展开**：支持多级目录的折叠与展开，方便浏览长文结构
- **界面适应**：可展开/折叠的侧栏设计，不占用阅读空间

### 图片查看增强

- **一键放大**：点击文章内任意图片，即可放大查看
- **高清显示**：自动获取图片高清版本，提供最佳观看体验
- **简洁控制**：简单的交互设计，点击图片外区域或ESC键即可关闭
- **自动适配**：适配文章中的各种图片格式和大小

## 🚀 安装方式

### 从 Chrome 网上应用店安装（推荐）

1. 访问[Chrome 网上应用店](https://chrome.google.com/webstore/category/extensions)
2. 搜索"公众号阅读增强插件"
3. 点击"添加到 Chrome"按钮

### 开发者安装

1. 克隆仓库

   ```bash
   git clone https://github.com/username/WeChatReaderEnhancer.git
   cd WeChatReaderEnhancer
   ```

2. 安装依赖

   ```bash
   npm install
   ```

3. 构建项目

   ```bash
   npm run build
   ```

4. 在 Chrome 浏览器中加载扩展
   - 打开 chrome://extensions/
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目的 `dist` 目录

## 🔧 使用指南

### 文章目录功能

1. 安装插件后访问任意微信公众号文章
2. 插件会自动在页面左侧生成目录面板
3. 点击目录项可跳转到相应位置
4. 点击标题前的图标可展开或折叠子目录
5. 点击竖向"文章目录"文字或展开按钮可展开折叠状态的目录

### 图片查看功能

1. 点击文章中的任意图片即可放大查看
2. 图片查看模式下，点击图片外的暗色区域可关闭查看器
3. 按ESC键也可关闭图片查看器

## 📂 项目结构

```
WeChatReaderEnhancer/
├── src/                   # 源代码
│   ├── background/        # 背景脚本
│   ├── content/           # 内容脚本（目录、图片查看器等）
│   ├── popup/             # 弹出窗口
│   ├── styles/            # 样式文件
│   ├── types/             # TypeScript类型定义
│   └── utils/             # 工具函数
├── public/                # 静态资源
├── dist/                  # 构建输出
├── docs/                  # 文档
└── README.md              # 项目说明
```

## 🔨 开发指南

### 环境要求

- Node.js 14.0 或更高版本
- npm 6.0 或更高版本

### 开发流程

1. 克隆仓库并安装依赖

   ```bash
   git clone https://github.com/username/WeChatReaderEnhancer.git
   cd WeChatReaderEnhancer
   npm install
   ```

2. 启动开发服务器（自动监听文件变化并重新构建）

   ```bash
   npm run dev
   ```

3. 构建生产版本
   ```bash
   npm run build
   ```

### 调试扩展

1. 在Chrome中打开 chrome://extensions/
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"，选择项目的`dist`目录
4. 访问任意微信公众号文章测试功能

## 🐛 常见问题

**Q: 为什么某些文章没有显示目录？**  
A: 插件依赖文章中的HTML标题标签来生成目录。如果文章没有使用标准的h1-h6标签，可能无法正确生成目录。

**Q: 图片查看器不工作怎么办？**  
A: 确保您点击的是文章正文中的图片，广告或其他特殊图片可能不支持查看功能。

**Q: 插件影响页面加载速度吗？**  
A: 插件经过性能优化，对页面加载速度影响极小。它仅在页面完全加载后开始工作。

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)。

## 📞 联系方式

- 项目仓库: [GitHub](https://github.com/username/WeChatReaderEnhancer)
- 问题反馈: [Issues](https://github.com/username/WeChatReaderEnhancer/issues)

## 🙏 鸣谢

- [medium-zoom](https://github.com/francoischalifour/medium-zoom) - 提供优秀的图片缩放功能
