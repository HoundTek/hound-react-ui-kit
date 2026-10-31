# Hound React UI Kit 设计缺陷分析与改进方案

> 版本：v1.1 · 日期：2026-11-01
> **实施进度（2026-11-01）**：阶段 0（库形态）与阶段 1（生命周期 + KitRuntime 实例化 + 结构通知 + dev 警告）已落地——
> demo 分离至 `playground/`、库构建（ESM+CJS）与发布配置就绪；浮动树/可操作集合/ref 注册表/拖拽会话/调度器/实现注册表
> 全部下沉 `src/core/runtime.js`（KitRuntime，默认 runtime 向后兼容，`new DataDag({runtime})` 隔离）；
> 新增 `CellBaseBuilder#destroy`、`BoxBuilder#destroy/detachFromParent`、`DataNode#removeChild/destroy/toJSON`、
> `DataDag#toJSON/restore`；single-slot 覆盖自动销毁旧子 Cell；结构变更经 `runtime.subscribeStructural` 对 React 可见；
> bind 解析失败与 setParent 时序违规输出 dev 警告；清理 `[zdbg]` 调试遗留与 `__enc_test.txt`。
> 验证：库构建通过、playground 浏览器冒烟通过（与 HEAD 基线行为等价）、生命周期/隔离 16 项断言全过。
> **批次 3 已落地（同日）**：统一事件 API——`CellBaseBuilder#on/off/emit` 注册表（多处理器、按序触发、destroy 自动清理）；
> 9 个预设 Cell 的 `cell._onXxx` 私有字段直写全部迁移为 `emit('press'/'select'/'change'/…)`；
> TabBarCell 语义改名 `onChange→onSelect`（onChange 保留为废弃别名 + dev 警告）；
> 测试基建落地：vitest + 4 个回归文件 34 项断言（data-dag 路径/ref/锚点、cell 生命周期、runtime 隔离、reflow 数学、事件 API）；
> TS 迁移第一步落地：`tsc --emitDeclarationOnly` 从 JSDoc 生成 `dist/types/*.d.ts`（零报错），
> package.json 接入 `types` 与 `exports.types`，`build` 脚本串接类型生成。
> 阶段 2 剩余（主题派生/暗色 / i18n 补强 / 受控语义糖）与阶段 3（a11y 专项 / 布局性能 / 视觉回归）待后续批次。
> **批次 4 部分落地（同日）**：态层罩层支持非 hex 色（CSS color-mix + 特性检测，不支持一致降级）；
> 全局字体样式从 `body` 收敛至 kit 作用域 `[data-hk-scope]`（CellRoot/FloatingLayer 标记），不再改写宿主；
> a11y 第一批：浮动窗口 `role=dialog`/`aria-modal`（可操作时）/出现即聚焦/mousedown 聚焦/
> Esc 关闭（closable 或模态窗口）/模态窗口 Tab 焦点陷阱；Dialog/Confirm/Drawer/Modal 预设默认 `operable()`
> （模态语义：遮罩 + Esc + 焦点循环，浏览器验证通过）。
> 附带发现：demo 顶部导航"工作台"切换实际工作正常（先前冒烟 FAIL 为自动化代理点击定位误差，已实证排除）。
> **a11y 第二批已落地（同日）**：MenuImpl 增加 role/itemRole 参数化（menu/tablist/listbox 复用）+
> roving tabindex + 方向键环绕导航 + Home/End（横向自动激活、纵向 Enter 激活，与鼠标同路径）；
> TabBarImpl 接入 tablist/tab/aria-selected；SelectImpl 触发器 aria-haspopup/aria-expanded +
> Enter/Space/ArrowDown 展开移入选中项 + Esc 收起回焦 + 选中回焦触发器；TreeCell 容器 role=tree +
> treeitem/aria-expanded/aria-selected + 上下遍历、右展开入子、左收起回父（WAI-ARIA tree 模式）、Enter 选中。
> 组件测试基建：jsdom + @testing-library/react，新增 menu/tree 键盘 9 项断言（全套 43 项通过）；
> 浏览器定点探测证实 tab-bar 键盘切换与 select 展开焦点正常（此前 FAIL 为程序化 click 不移动焦点的探测误差）。
> 分析范围：`src/` 全量 16,681 行（core / basic-cells / builtin-cells / demo）、`package.json`、构建与文档配置、git 历史。
> 结论先行：**核心抽象（Cell + DataDag + Box + Theme）有独创价值，但当前形态是一个"以库自居的应用"——不具备可发布的库外壳，缺少生命周期终点（unmount），全局可变单例状态阻断多实例/SSR/测试，无障碍与类型系统接近空白。** 本文给出按阶段可落地的改进路线。

---

## 一、系统现状快照

| 维度 | 现状 |
|---|---|
| 定位 | React UI 组件库（Cell 体系 + Box 自研布局引擎 + 主题/国际化） |
| 规模 | 8 基础 Cell + 75 高级预设 Cell + core 引擎层，约 16.7k 行 |
| 设计文档 | 7 篇（docs/），质量高，与代码注释互相引用 |
| 类型 | 0 个 `.ts/.tsx/.d.ts`，全部 JS + JSDoc |
| 测试 | 0 个测试文件、无测试框架 |
| 构建 | 仅 `vite` dev 脚本；无库构建、无 `vite.config` |
| 发布配置 | `main` 指向 `src/index.jsx`（应用挂载入口） |

---

## 二、设计缺陷清单

按严重程度分级：**P0 阻断级**（无法作为库使用）、**P1 架构级**（长期侵蚀可维护性）、**P2 规范级**（一致性/体验）、**P3 工程级**（配套设施）。

### P0-1 库入口即应用入口，导入即挂载

`package.json` 的 `main` 指向 [src/index.jsx](file:///Users/frank/Code/HoundTek/hound-react-ui-kit/src/index.jsx)——该文件执行 `ReactDOM.createRoot(...).render(...)`。任何消费方 `import 'hound-react-ui-kit'` 会立刻在宿主页面 `#root` 挂载整个 demo 应用并抛错。真正的公共 API 出口是 [src/core/ui-kit.jsx](file:///Users/frank/Code/HoundTek/hound-react-ui-kit/src/core/ui-kit.jsx)，但它深埋在 `src/core/` 下且未对包外暴露。

**根因**：demo（`src/app.jsx`、`src/demo/`、`index.html`）与库源码同目录混居，没有"库产物 vs 演示产物"的边界。

### P0-2 发布配置缺失

`package.json` 缺少库必需的全部字段：

- 无 `build` 脚本、无 `exports`/`files`——发布物是裸源码（含 demo）；
- 无 `peerDependencies`——`react`/`react-dom` 在 `devDependencies`，但消费方版本约束未声明，React 19 硬性依赖被隐藏；
- 无 `types`——见 P1-6；
- 无 `sideEffects`——全局 CSS 注入（P2-4）使 tree-shaking 不安全；
- 无 lint/format/CI 配置。

### P1-1 生命周期只有"生"没有"死"：无 unmount / 无清理

这是核心架构最大的缺口：

- [cell-base.jsx](file:///Users/frank/Code/HoundTek/hound-react-ui-kit/src/core/cell/cell-base.jsx) 有 `mount()`，**没有 `unmount()`**；`_mounts`、`_dataNode`、`_slots` 一旦建立永不释放。`DataNode` 无 `removeChild`/`destroy`，`DataDag` 无法裁剪子树。
- 引用链 `DataNode._cell ↔ Cell._mounts ↔ Box._parent` 构成强引用环：页面动态增删 Cell（如关闭并丢弃一个 Dialog）后，整棵子树连同订阅者无法回收——**内存泄漏是结构性的**。
- `fill()` 对 single slot 的"覆盖"语义只清空 `slot.children` 数组（cell-base.jsx L334-342），**已挂载的旧子 Box/DataNode 并未从渲染树摘除、旧订阅并未解除**，覆盖后旧视图仍可能存活。
- `close()` 仅置 `_visible = false`（box.jsx L618-625），builder 永久留在模块级 `_floatingTree` 中；`unregisterFloating` 存在但**没有任何调用路径**通向 Cell 层。

### P1-2 模块级全局可变单例，阻断多实例 / SSR / 测试

[box-component.jsx](file:///Users/frank/Code/HoundTek/hound-react-ui-kit/src/core/box/box-component.jsx)（2,324 行）在模块顶层持有大量可变全局状态：

| 全局状态 | 位置 | 后果 |
|---|---|---|
| `_dragSession` | L57 | 两个应用同时拖拽互相污染 |
| `_contentRefRegistry` / `_layerRefRegistry` | L495 / L528 | 以路径字符串为键，跨实例路径撞名 |
| `_floatingTree` / `_operableWindows` / `_floatingListeners` | L1528-1536 | 浮动窗口树是**进程级单例**，微前端/多根场景互相穿窗 |
| `reflowScheduler` 单例 | [scheduler.jsx](file:///Users/frank/Code/HoundTek/hound-react-ui-kit/src/core/box/scheduler.jsx) L64 | 所有视口根共享一个 250ms 节流 timer，一个根的重排拖累全部根 |
| `_impls` 实现注册表 | [implementations.js](file:///Users/frank/Code/HoundTek/hound-react-ui-kit/src/core/cell/implementations.js) L20 | 主题重写实现全局注册，多主题并存时 `(kind, name)` 冲突 |

直接推论：**无法 SSR**（模块加载即建 Map/Set）、**无法并行测试**（用例间状态残留）、**HMR 状态漂移**。库的"实例"概念（DataDag）与"运行时"概念（全局注册表）没有对齐。

### P1-3 构造期副作用，违背 React 渲染契约

`floatingViewport()` 在**构造/配方期**立即调用 `registerFloating(this)`（box.jsx L406-410）——一个 Cell 只要被 `new` 出来就进入全局浮动树，即使从未 `mount()`。React 19 StrictMode 的双调用、渲染期构造 Cell 的写法都会造成重复注册或幽灵窗口。同理 `operable()` 直接写入全局 `_operableWindows`。

**命令式 builder + 配方重放**与 React 声明式模型之间缺一层"事务边界"：所有结构变更应在 `mount()`/`unmount()` 时刻原子生效。

### P1-4 结构变更对 React 不可见

React 层只订阅**数据**变更（`useCellData`/`useNodeData`），**结构**变更（`fill` 新子 Cell、single slot 覆盖、多挂载）不触发任何重渲染——`CellRoot` 直接读 `cell._mounts`（cell-react.jsx L26），依赖数据写入"顺带"引发的重渲染来间接刷新视图。这使动态布局更新的正确性不可推理，也让"覆盖即泄漏"（P1-1）更难被发现。

### P1-5 双路径体系与字符串引用的脆弱性

- DataNode 路径（`@/a/b`）与 Box 路径在 `#m1` 挂载后缀处分叉（cell-base.jsx L251），两套字符串口径靠注释约定维持；
- 锚点（`@name`）、bind（`'@userProfile#name'`）、ref 目标全是**字符串软引用**：重命名/移动节点后静默失效，`resolve` 失败返回 `null`，错误在远离发生点处才以 `undefined` 呈现；
- `subscribe()` 对绑定目标在**订阅时刻**解析一次（cell-base.jsx L470-483），目标节点此后才被创建/替换时订阅永久丢失；
- `setParent` 要求"父先挂载、本 Cell 后挂载"（cell-base.jsx L710-712），时序约束只写在 JSDoc 里，违反时无任何运行时报错。

### P1-6 零类型系统

16.7k 行无任何 TS 声明。对一个以"链式 DSL + 动态生成 setter"为核心 DX 的库，这是双重打击：

- `schema()` 在实例上动态挂 `setXxx` 方法（cell-base.jsx L93-98），静态不可分析、无 IDE 补全——**库最大的卖点（语义化 setter）在类型层面完全不可见**；
- 大量 `@param {Object}` 级别的 JSDoc 无法约束 75 个预设 Cell 的 Schema 契约（"同 kind 各实现共用同一 Schema"仅靠文档约定）；
- 消费方升级无类型护栏，而 P0/P1 的修复必然伴随 breaking change。

### P1-7 自研布局引擎的规模与性能上限

- `_performReflow` 每次对**整棵子树**强制 `child._needsReflow = true` 全量重算（box.jsx L1110），无脏区/无收敛判定；拖拽分界线时成本为 O(全树)；
- 全局 250ms 节流 + 特效追赶掩盖重排成本，交互"跟手性"有硬上限；
- λ 二分精度 `LAMBDA_EPSILON = 1`（px 级，box.jsx L875），子项尺寸存在 1px 量化误差；`Infinity` 用 `1e10` 魔数替代（L832-833）；
- 手写 flexbox 重实现缺少 `flex-grow`/`justify-content`/`baseline` 等语义，表达力天花板低，而 `box-reflow-math.md` 描述的凸优化模型与实现的启发式分支已有出入；
- `zIndex()` 记录但不参与渲染排序（box.jsx L433-438 注释自述"仅记录"）——死 API；`close()/open()` 只作用于挂载 0，多挂载语义不一致（cell-base.jsx L753-764）。

### P2-1 无障碍接近空白

全库 `aria-*`/`role`/`tabIndex`/`onKeyDown` 命中仅 **6 处 / 5 个文件**（其中 2 处在 box-component）。对照 75 个预设 Cell：Dialog/Drawer/Menu/Tree/Tabs/Select 等 WAI-ARIA 明确要求的角色、焦点陷阱、键盘导航、`focus-visible` 管理全部缺失。浮动窗口体系（层叠/遮罩/可操作窗口）没有键盘等价物。**这是组件库被企业项目拒用的第一杀手。**

### P2-2 事件与受控 API 风格不统一

回调注入存在至少三种并存风格：

1. 私有字段直写：`cell._onPress = handler`（button.jsx L164、login.jsx L91、nav-bar.jsx L113、pagination.jsx L99、tab-bar.jsx L80——视图内以 `cell._onPress` 读取）；
2. Schema 数据字段 + `setXxx`；
3. Impl 组件 props（`onChange`/`onToggle`/`onSubmit`）。

命名语义漂移：nav-bar 选中回调叫 `_onSelect`，tab-bar 同样的"切换激活项"却叫 `_onChange`；pagination 的页码变更也叫 `_onChange`。受控/非受控边界未定义（外部 `setData` 与内部交互写入之间没有 `value`/`onValueChange` 约定）。消费方跨组件的心智成本随预设数量线性增长。

### P2-3 主题迁移不彻底，硬编码色残留

颜色角色体系已建立，但全库仍有 **133 处 hex/rgba 字面量散布在 40 个组件文件**（如 color-picker 11 处、button 8 处、notice 6 处、list 6 处）。主题切换时这些残留色不跟随，"整体重写"承诺打折。另有：

- `stateLayerProps` 仅支持 hex 输入，非 hex（命名色/hsl）时 hover/active 罩层静默降级为 `transparent`（state-layer.js L60-63）——功能性色板丢失交互态；
- `Theme` 无令牌派生与暗色/亮色成对切换机制，`getCornerType` 等已废弃 API 仍保留（theme.js L73-80）。

### P2-4 全局样式副作用越界

[state-layer.js](file:///Users/frank/Code/HoundTek/hound-react-ui-kit/src/core/theme/state-layer.js) L27-35 注入的 CSS **无条件改写宿主 `body` 字体与字号**。组件库不应重置应用级样式；且该注入藏在 `stateLayerProps` 的副作用里（调用即注入），无显式开关、无作用域收敛。

### P2-5 i18n 能力单薄 + 内置文案不可译

[i18n.js](file:///Users/frank/Code/HoundTek/hound-react-ui-kit/src/core/i18n/i18n.js) 只有 `{name}` 插值与两级回退：无复数（Intl.PluralRules）、无日期/数字格式化（Intl.*）、无语言包按需加载。75 个预设的内部文案（关闭按钮、分页"上一页"等）大多硬编码中文，`useText` 未系统性接入——库自身不满足国际化。

### P3-1 巨型文件与层次违规

`box-component.jsx` 2,324 行混杂：三层渲染、拖拽会话、浮动窗口树管理、滚动同步、ref 注册表、样式计算——至少 5 个职责。`CellRoot` 读 `cell._mounts`、`ContentLayer` 读 `builder._xxx` 私有字段，类内部实现成为事实上的跨层契约。

### P3-2 仓库卫生

- `src/builtin-cells/__enc_test.txt` 遗留测试垃圾文件已提交；
- `docs/` 设计文档优秀但**无任何组件级 API 文档/示例**，75 个预设的 Schema 契约只存在于源码；
- 提交信息风格中英混用（`feat(ui-kit)：` 全角冒号 vs `fix(box):` 半角）。

---

## 三、改进方案

### 阶段 0：库形态修复（先让"库"成立）

**目标**：`npm i hound-react-ui-kit` 后可安全 import，demo 不再污染包体。

1. **源码分层**：`src/` 只保留库（`core/`、`basic-cells/`、`builtin-cells/`、`ui-kit.jsx`）；`app.jsx`、`demo/`、`index.html` 移入 `playground/`。`src/index.jsx` 改为纯 re-export `./core/ui-kit`。
2. **库构建**：新增 `vite.config.ts`，`build.lib` 模式产出 ESM + CJS + CSS 分离；`package.json` 补齐：

```jsonc
{
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.cjs" },
    "./style.css": "./dist/index.css"
  },
  "files": ["dist"],
  "sideEffects": ["*.css", "src/core/theme/state-layer.js"],
  "peerDependencies": { "react": "^18.0.0 || ^19.0.0", "react-dom": "^18.0.0 || ^19.0.0" },
  "scripts": { "build": "vite build", "dev": "vite --root playground" }
}
```

3. **清理**：删除 `__enc_test.txt`；统一 commit 规范（conventional commits + 半角冒号），加 `commitlint` + `husky`。

**验收**：新建空白 React 项目安装本地包，`import { ButtonCell } from 'hound-react-ui-kit'` 渲染成功且不挂载 demo；`dist` 产物体积与模块清单入 CI。

### 阶段 1：生命周期与运行时实例化（架构补全的核心）

**目标**：消灭结构性泄漏与全局状态，为测试/SSR/多实例铺路。

1. **引入 `KitRuntime`（实例级运行时容器）**：把 `reflowScheduler`、`_floatingTree`、`_operableWindows`、`_contentRefRegistry`、`_layerRefRegistry`、`_dragSession`、实现注册表全部下沉到 `DataDag`（或新建 `Kit` 门面）持有的 runtime 实例。`DataDag` 构造时创建，销毁时释放。模块级单例仅保留纯函数。
   - 迁移策略：先以 `getDefaultRuntime()` 兼容层过渡（现有模块级 API 委托给默认 runtime），再逐步让 Box/Cell 显式接收 runtime 引用。
2. **补全 unmount 语义**：
   - `CellBaseBuilder.unmount(mountIndex?)`：从父 Box 摘除子 Box、解除数据订阅、`unregisterFloating`、清理 `_mounts`；全部挂载卸载后释放 `_dataNode`（配合 `DataNode.removeChild()`）。
   - single slot 覆盖 / `fill` 替换时，对旧子 Cell 自动执行 unmount（而非仅清数组）。
   - `DataNode` 增加 `removeChild(name)`、`destroy()`，`DataDag` 增加 `toJSON()/fromJSON()`（快照/恢复/持久化）。
3. **挂载事务边界**：`floatingViewport()`、`operable()` 等不再在构造期触碰 runtime，改为配方记录、`mount()` 时原子注册；`unmount()` 对称注销。StrictMode 双调用安全。
4. **结构变更通知**：runtime 增加结构版本号（`structuralVersion`），`fill`/`unmount`/覆盖时 bump；`CellRoot`/`ContentLayer` 订阅该版本触发重渲染——把"结构对 React 不可见"补成显式通道。
5. **引用健壮性**：bind/anchor/ref 解析失败在 dev 模式 `console.warn`（含 Cell id 与路径）；`subscribe()` 对绑定目标改为惰性解析 + 目标替换时自动重订阅；`setParent` 时序违规直接 throw。
6. **拆分 `box-component.jsx`**：按职责拆为 `floating-tree.js`（树/层级/遮罩计算）、`drag-session.js`（分界线拖拽）、`ref-registry.js`、`layers/`（Content/Edge/Corner）、`overlay-style.js`。纯机械重构，先于 runtime 下沉做，避免一次大爆炸。

**验收**：Dialog 打开→关闭→丢弃 1000 次后堆快照无 Cell/Box/DataNode 残留；两个独立 `DataDag` 实例的浮动窗口互不可见；vitest 可并行跑 runtime 单测。

### 阶段 2：API 统一与 DX

1. **事件契约统一**：定义规范——预设 Cell 一律通过 Schema 声明数据字段 + 显式 `on` 注册方法（如 `cell.onPress(fn)` 存于实例公开字段，禁止视图直写 `cell._onPress`）。语义命名表：`onPress`（瞬时动作）/`onChange`（值变更）/`onSelect`（选中项变更）/`onToggle`（开合）——tab-bar、pagination 等按表改名，提供一版 deprecated 别名过渡。
2. **受控语义**：明确"DataNode 是唯一状态源"，外部同步经 `bind`；为常用输入类 Cell 提供 `controlled(value, onCommit)` 糖。
3. **TypeScript 渐进迁移**：
   - 第一步：`tsconfig.json`（`allowJs` + `declaration`）从 JSDoc 生成 `dist/*.d.ts`，CI 加 `tsc --noEmit` 消费方冒烟；
   - 第二步：core 层（cell-base/data-dag/theme/box）改写 TS，`schema()` 泛型化——`schema<{title: string}>()` 使 `setTitle` 可被类型推导，消灭动态 setter 的类型盲区；
   - 第三步：预设 Cell 迁移，Schema 即类型契约。
4. **主题系统增强**：
   - 令牌派生：从种子色生成色板（luminance 映射），支持 `light/dark` 成对主题与运行时切换；
   - 态层色改用 CSS `color-mix` + 特性检测回退 hexToRgba，非 hex 色不再丢交互态；
   - 移除 `getCornerType` 等废弃 API（major 版本窗口）；实现注册表挂 runtime 实例，多主题并存不冲突。
5. **样式副作用收敛**：全局 CSS 不再触碰 `body`；字体栈经 `ThemeProvider` 下发到 kit 根容器；注入函数改为显式 `mountGlobalStyles(scope)` 或随主题 Provider 自动挂载一次。
6. **i18n 补强**：接入 `Intl`（复数/日期/数字）；为 75 个预设建立内置语言包（zh-CN/en），预设内部文案全部走 `useText`；语言包按需 import。

### 阶段 3：质量基建与长期演进

1. **测试金字塔**（vitest + playwright）：
   - 单元：data-dag 路径/ref/锚点、box `_calculateLayout`（以 box-reflow-math.md 用例表驱动）、cell mount/unmount 生命周期、scheduler 节流；
   - 组件：每类基础 Cell + 20% 抽样预设的行为测试；
   - 视觉回归：主题 × 预设矩阵截图（Playwright），防 P2-3 类回归。
2. **无障碍专项**（按 WAI-ARIA APG 分批）：
   - 第一批：Dialog/Drawer/Modal 焦点陷阱 + Esc + `aria-modal`；浮动窗口键盘切换；
   - 第二批：Menu/Select/Tabs/Tree 键盘导航与 role 映射；
   - 第三批：全量 `focus-visible` 态、`aria-live`（Toast/Notice）、对比度审计（axe-core 进 CI）。
3. **布局引擎性能**：reflow 脏区标记（仅容器尺寸实际变化的子树重算）、调度从全局 250ms timer 改为 per-runtime `requestAnimationFrame` 合帧；λ 二分精度提到 0.5px 并输出亚像素尺寸；评估以 CSS Flex 承担交叉轴、引擎只管主轴的混合方案，逐步收缩自研面。
4. **文档站**：以 playground 为底生成组件文档站（每预设：Schema 表 + 事件表 + 可运行示例），docs/ 设计文档与 API 参考分层。

---

## 四、优先级矩阵与实施顺序

| 序号 | 事项 | 级别 | 依赖 | 建议批次 |
|---|---|---|---|---|
| 1 | 库入口/构建/发布配置（阶段 0） | P0 | 无 | 第 1 批 |
| 2 | unmount/生命周期补全 | P1 | 3 | 第 2 批 |
| 3 | KitRuntime 实例化 + box-component 拆分 | P1 | 无 | 第 2 批 |
| 4 | 挂载事务边界 + 结构通知 | P1 | 3 | 第 3 批 |
| 5 | 事件/受控 API 统一 | P2 | 无 | 第 3 批 |
| 6 | TS 迁移（d.ts → core → 预设） | P1 | 5 | 第 4 批 |
| 7 | 主题派生/暗色/态层修复 | P2 | 3 | 第 4 批 |
| 8 | a11y 三批专项 | P1 | 5 | 第 4-6 批 |
| 9 | 测试金字塔 + CI | P3 | 1-3 | 随各批推进 |
| 10 | 布局引擎性能演进 | P2 | 9 | 长期 |

**迁移原则**：

- 阶段 0 无破坏性，可立即执行；阶段 1 起进入 major 版本窗口（1.0.0 → 2.0.0），废弃 API（`zIndex` 记录、`getCornerType`、`slots/addSlot` 兼容层）集中一次性清理；
- 每批次以"测试先行"兜底：先为 data-dag / reflow 数学 / 生命周期写回归用例，再做结构改造；
- 全局单例的下沉采用"兼容层委托 → 显式注入 → 移除默认"三步走，避免大爆炸式切换。

---

## 五、风险与权衡

| 风险 | 缓解 |
|---|---|
| runtime 下沉触碰 Box/Cell/渲染三层全部代码 | 先拆 box-component（纯机械），再以 getDefaultRuntime 委托过渡，单测护航逐步收敛调用点 |
| unmount 语义引入后，既有 demo 页面依赖"永不销毁"的隐式行为 | 兼容期 unmount 仅由显式调用触发；single-slot 覆盖的自动卸载先在 dev 模式 warn |
| 事件 API 改名波及 75 预设 | 保留旧名 deprecated 别名一个 major 版本，CI 输出别名使用计数 |
| TS 迁移期间 JSDoc 与类型双源漂移 | 以 `.d.ts` 生成为唯一出口，禁手写声明文件 |
| 自研布局引擎的既有正确性依赖经验细节（EPSILON、#m 后缀、强制子树重算） | box-reflow-math 用例表驱动回归测试先行，任何性能改造不得改变对外尺寸契约 |

---

## 附：证据索引

- 入口问题：`package.json` L5（`main: src/index.jsx`）、src/index.jsx L10-16
- 生命周期缺失：cell-base.jsx L781-787（只有 mount）、L334-342（覆盖不清理）、box.jsx L618-625（close 不注销）
- 全局状态：box-component.jsx L57 / L495 / L528 / L1528-1536、scheduler.jsx L64、implementations.js L20
- 构造期副作用：box.jsx L406-410
- 双路径：cell-base.jsx L251（`#m` 后缀）
- 动态 setter：cell-base.jsx L93-98
- 全树强制重排：box.jsx L1110
- a11y 统计：`aria-*|role|tabIndex|onKeyDown` 全库仅 6 处命中
- 硬编码色统计：hex/rgba 字面量 133 处 / 40 文件
- 事件风格：`cell._onPress/_onSubmit/_onSelect/_onChange` 直写 19 处（button/login/nav-bar/pagination/tab-bar/core builtin-cells）
- 遗留文件：src/builtin-cells/__enc_test.txt
