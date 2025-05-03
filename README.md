# 公众号阅读增强插件 (WeChat Reader Enhancer)

![版本](https://img.shields.io/badge/版本-1.0.0-blue)
![许可证](https://img.shields.io/badge/许可证-MIT-green)

## 📖 项目简介

公众号阅读增强插件是一款 Chrome 浏览器扩展，旨在提升用户阅读微信公众号文章的体验。通过自动生成文章的结构化目录，让您轻松了解文章结构、快速导航到感兴趣的部分，并在阅读长文时保持位置感知。

![插件预览](docs/images/preview.png)

## ✨ 主要功能

- **自动目录生成**: 识别文章中的 HTML 标题标签，生成结构化目录
- **快速导航**: 点击目录项直接跳转到文章对应位置
- **位置追踪**: 滚动文章时，目录中自动高亮当前阅读位置
- **折叠与展开**: 支持多级目录的折叠与展开，方便浏览文章结构

## 🚀 安装方式

### 从 Chrome 网上应用店安装

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

1. 安装插件后访问任意微信公众号文章
2. 插件会自动在页面右侧生成目录面板
3. 点击目录项可跳转到相应位置
4. 点击标题前的图标可展开或折叠子目录
5. 使用右上角按钮可最小化或展开目录面板

详细使用说明请参阅[用户手册](docs/user-manual.md)。

## 📂 项目结构

```
WeChatReaderEnhancer/
├── src/                  # 源代码
├── public/               # 静态资源
├── dist/                 # 构建输出
├── docs/                 # 文档
│   ├── product-requirements.md  # 产品需求
│   ├── technical-design.md      # 技术设计
│   ├── ui-design.md             # UI设计
│   ├── project-plan.md          # 项目计划
│   └── faq.md                   # 常见问题
└── README.md             # 项目说明
```

## 🔨 开发指南

### 环境要求

- Node.js 14.0 或更高版本
- npm 6.0 或更高版本

### 开发流程

1. 安装依赖

```bash
npm install
```

2. 启动开发服务器

```bash
npm run dev
```

3. 构建生产版本

```bash
npm run build
```

4. 运行测试

```bash
npm test
```

详细开发文档请参阅[开发指南](docs/development-guide.md)。

## 🤝 贡献指南

欢迎为项目提供贡献！请先阅读我们的[贡献指南](CONTRIBUTING.md)了解详情。

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)。

## 📞 联系方式

- 项目仓库: [GitHub](https://github.com/username/WeChatReaderEnhancer)
- 问题反馈: [Issues](https://github.com/username/WeChatReaderEnhancer/issues)
- 电子邮件: example@email.com

## 🙏 鸣谢

感谢所有为本项目做出贡献的开发者和测试者。
