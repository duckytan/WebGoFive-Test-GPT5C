# H5 五子棋重构版（Canvas + 原生 ES2020）

本项目依据 `/doc` 目录下的需求与架构文档重新实现了一个模块化、可扩展的 H5 五子棋单页应用。整体以原生 JavaScript + Canvas 为核心技术栈，结合事件驱动的多层架构与可插拔的 AI 策略，实现禁手规则、人机/机机对战、存档与回放等核心能力。

## ✨ 功能概览

- **多种模式**：支持 PvP、PvE、EvE，模式切换即时生效
- **禁手检测**：实现三三、四四、长连禁手判定
- **AI 系统**：提供 Beginner / Normal / Hard / Hell 四档难度，基于候选点生成 + 局面评估 + Minimax/Alpha-Beta 搜索
- **Canvas 渲染**：自适应棋盘绘制、最近一步高亮、禁手提示、胜利连线展示
- **存档服务**：本地存档/自动存档、加载恢复、简单的回放播放
- **事件总线**：状态变化统一分发，UI/服务解耦

## 📁 目录结构

```
├── index.html
├── src
│   ├── main.js                # 入口，装配 GameState/RuleEngine/AI 等模块
│   ├── constants.js           # 枚举、配置常量
│   ├── utils/                 # 事件总线、日志、坐标工具
│   ├── core/
│   │   ├── gameState.js       # 中央状态管理
│   │   ├── ruleEngine.js      # 胜负判定与禁手检测
│   │   └── ai/                # AIEngine、候选点、评估、策略
│   ├── application/
│   │   ├── modeManager.js     # 模式与流程控制
│   │   └── gameController.js  # UI 交互协调器
│   ├── ui/                    # CanvasRenderer、HudPanel
│   ├── services/              # SaveLoadService、ReplayService、StorageAdapter
│   └── styles/                # 主题样式
├── tests/                     # Vitest 单元测试
└── doc/                       # 需求与设计文档（原始资料）
```

## 🚀 快速开始

```bash
npm install
npm run dev       # 本地开发（Vite，默认端口 5173）

npm run test      # 运行 Vitest 单元测试
npm run build     # 生产构建
```

开发时可通过浏览器控制台访问调试工具：

```js
window.GomokuApp   // 核心模块实例（state、rules、ai、modeManager…）
window.GomokuDebug // logBoard / logCandidates / testForbidden 等辅助方法
```

## 🧩 核心模块说明

- **GameState**：不可变棋盘 + 历史记录 + 设置管理，向事件总线广播状态变化
- **RuleEngine**：四向线性签名匹配，实现胜负判定、禁手检测、棋型统计
- **AIEngine**：策略工厂管理四档难度，组合候选点生成、局面评估与 Minimax 搜索
- **ModeManager**：统一入口处理落子、流程状态、AI 调度，兼顾 PvP/PvE/EvE
- **CanvasRenderer & HudPanel**：呈现棋盘、HUD 控件、禁手与胜利反馈
- **SaveLoad/Replay**：本地存档、自动存档、简单回放播放控制

更多实现细节与设计意图请参考 `/doc` 下的规范化文档集。

## ✅ 测试

`tests/` 目录包含对核心模块的单元测试（GameState、RuleEngine、AIEngine）。运行 `npm run test` 可查看结果，并生成基础覆盖率报告（`vite.config.js` 已配置）。

## 📄 许可

此代码库旨在演示如何基于结构化文档重构/实现五子棋前端项目，具体授权遵循原仓库设置。
