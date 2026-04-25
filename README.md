# D-Storage Sandbox

一个基于论文流程构建的前端交互式协议沙盘，用来演示去重存储、检索、混合审计、HVT 动态更新和数据交易五条核心流程。

## 项目定位

这个项目不是后端服务，也不是链上合约实现，而是一个纯前端的协议可视化与状态模拟器。页面通过一组分步操作，把论文中的角色、消息、状态迁移、费用结算和公式关系展示出来。

当前实现聚焦于：

- 去重上传流程 `Deduplication`
- 文件检索流程 `Retrieve`
- 混合审计流程 `Audit`
- HVT 动态更新流程 `HVTUpdate`
- 数据市场与所有权转移流程 `Market`

## 技术栈

- `React 18`
- `Vite 5`
- `@vitejs/plugin-react`
- `Tailwind CSS`
- `PostCSS + Autoprefixer`
- `framer-motion`
- `lucide-react`
- `KaTeX`

依赖和脚本定义见 [package.json](./package.json)。

## 如何运行

```bash
npm install
npm run dev
```

构建产物：

```bash
npm run build
npm run preview
```

Vite 配置见 [vite.config.js](./vite.config.js)。当前配置了：

- `base: '/report_4-18_page/'`

这意味着如果部署到静态站点子路径，需要对应保留这个基础路径。

## 渲染方式

这是一个标准的客户端渲染应用（CSR），没有 SSR，也没有服务端模板层。

渲染链路如下：

1. [index.html](./index.html) 提供根节点 `#root`
2. `type="module"` 加载 [src/main.jsx](./src/main.jsx)
3. `main.jsx` 使用 `ReactDOM.createRoot(...).render(...)`
4. `StoreProvider` 包裹整个应用
5. [src/App.jsx](./src/App.jsx) 根据全局状态里的 `activeTab` 渲染不同模块

对应入口代码的核心逻辑是：

- HTML 容器：`<div id="root"></div>`
- React 挂载：`ReactDOM.createRoot(document.getElementById('root'))`

## 整体架构

项目结构很轻，基本可以分成 4 层：

### 1. 应用壳层

- [src/main.jsx](./src/main.jsx)
- [src/App.jsx](./src/App.jsx)

职责：

- 挂载 React 应用
- 注入全局状态
- 组织页面整体布局
- 提供顶部协议标签切换
- 提供左右侧边栏状态视图

其中 `App.jsx` 是页面总控：

- 顶部 `tabs` 控制五个主场景
- 左侧展示当前数据对象和协议参数
- 中间区域承载具体模块页面
- 右侧展示全局协议阶段 `availableStages`

### 2. 全局状态层

- [src/store.jsx](./src/store.jsx)

使用的是 React 原生的：

- `createContext`
- `useContext`
- `useReducer`

这里没有引入 Redux、Zustand 或 MobX。全局状态集中维护：

- 当前激活标签 `activeTab`
- 当前文件对象 `currentFile`
- CSP 侧存储状态 `cspStorage`
- 协议阶段集合 `protocol.availableStages`
- 合约与费用状态 `contract`
- 操作日志 `logs`

各模块通过 `dispatch(...)` 修改这些共享状态，从而让侧边栏和模块内部视图保持同步。

### 3. 业务模块层

位于 [src/modules](./src/modules)：

- [Deduplication.jsx](./src/modules/Deduplication.jsx)
- [Retrieve.jsx](./src/modules/Retrieve.jsx)
- [Audit.jsx](./src/modules/Audit.jsx)
- [HVTUpdate.jsx](./src/modules/HVTUpdate.jsx)
- [Market.jsx](./src/modules/Market.jsx)

这些模块的共同特点：

- 都是 React 函数组件
- 都维护各自的局部流程状态 `phase/currentStep/isProcessing`
- 都通过 `useStore()` 读写全局状态
- 都通过异步 `wait(ms)` 模拟协议步骤推进
- 都把论文中的公式、消息包、状态变化转成可视化时间线

可以把它们理解为“五个独立的交互式场景页”，共享同一个全局协议上下文。

### 4. 展示组件与样式层

- [src/components/Formula.jsx](./src/components/Formula.jsx)
- [src/index.css](./src/index.css)

职责：

- `Formula.jsx` 使用 `KaTeX` 把 LaTeX 字符串渲染成公式
- `index.css` 注入 Tailwind 基础层，并补充玻璃态面板、滚动条、网格背景和 KaTeX 包装样式

样式体系以 Tailwind utility class 为主，少量公共样式通过自定义类抽出：

- `.glass-panel`
- `.glass-card`
- `.animate-pulse-soft`
- `.bg-grid-slate-800/[0.05]`

## 状态流设计

项目的核心不是数据请求，而是“状态机驱动的前端演示”。

### 全局状态

全局状态主要承担“跨模块共享上下文”的职责，例如：

- 当前文件的拥有者
- 文件标签、见证值、根哈希
- 当前协议所处阶段
- 审计结果
- 转移过程中的资金托管状态

这使得一个模块执行后的结果，可以被另一个模块继续使用。例如：

- 上传完成后，文件状态进入 `STORED`
- 检索模块会从 `STORED` 继续推进到 `RETRIEVING`、`DECRYPTING`
- 市场模块会修改 `owner`、`uid`、`uidProof`、`witness`

### 模块内状态

每个模块内部还维护自己的局部状态，例如：

- 当前步骤索引
- 当前动画流对象
- 请求包/证明对象/树结构
- 成功与失败分支

这样的拆分比较合理：

- 全局状态负责共享语义
- 局部状态负责页面交互细节

## 五个模块分别做什么

### Deduplication

演示论文中的去重上传主流程，包括：

- 本地预处理
- 身份认证
- 去重探测
- 唯一块认证生成
- 上传与链上登记

它会更新：

- `currentFile.status`
- `currentFile.fileTag`
- `currentFile.uidProof`
- `currentFile.witness`
- `currentFile.rootHash`
- 各个 `blocks` 的状态

### Retrieve

演示用户如何在身份验证通过后取回数据，包括：

- 检索请求
- CSP 身份校验
- 返回 `C` 和 `{Key_i}`
- 本地解密私密块
- 重组原始文件

### Audit

演示混合审计和结算逻辑，包括：

- 提交审计请求
- 合约生成 challenge
- CSP 提交证明
- 合约验证
- 成功结算或失败罚没

模块中有一条显式的失败分支：

- `tamperMode`

它用来模拟篡改后导致验证失败的路径。

### HVTUpdate

演示增强 MHT/HVT 的动态更新。这个模块更像一个树结构可视化实验台，包含：

- 初始状态
- 修改叶子
- 删除叶子
- 插入叶子

树数据直接在模块内以对象形式维护，并随着场景切换重算显示。

### Market

演示数据市场中的所有权转移，包括：

- 买家请求
- 卖家证明与保证金
- CSP 更新 owner
- 安全信道传输 `sk`
- 买家验证
- 合约最终结算

这个模块会直接改写全局文件拥有者相关信息，因此和其他模块的耦合最明显。

## 目录结构

```text
.
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src
    ├── App.jsx
    ├── main.jsx
    ├── store.jsx
    ├── index.css
    ├── components
    │   └── Formula.jsx
    └── modules
        ├── Deduplication.jsx
        ├── Retrieve.jsx
        ├── Audit.jsx
        ├── HVTUpdate.jsx
        └── Market.jsx
```

## 工具与框架总结

如果只用一句话概括：

这是一个使用 `Vite` 构建、`React` 渲染、`Tailwind` 编写样式、`framer-motion` 增强动画、`KaTeX` 渲染公式的纯前端协议演示项目。

## 当前实现特点

- 无后端接口调用
- 无数据库
- 无 SSR
- 无路由系统
- 无第三方状态库
- 通过本地状态模拟链上与 CSP 交互

这让项目非常适合：

- 论文演示
- 答辩展示
- 协议教学
- 前端交互原型验证

## 后续可扩展方向

- 接入真实路由，把五个模块拆成独立页面
- 增加日志面板，把 `store.logs` 直接可视化
- 补充类型系统，迁移到 TypeScript
- 将协议常量和枚举从组件中抽离
- 为状态迁移补测试
- 如果要接真实链路，可引入 API 层或合约交互层

