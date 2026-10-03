# 基础 Cell 与高级 Cell（Basic & Advanced Cells）

## 定位

本文档定义预设 Cell 的两级划分：**基础 Cell**（不可互相派生的原语，不得依赖任何其他 Cell 的实现）与**高级 Cell**（由基础 Cell / 其他高级 Cell 组装，可多级依赖；可经实现注册表被主题整体重写）。它是 theme-shape-design.md「两级样式体系」在**组件实现**维度上的展开：第一级普适性配置解决"样式如何集中声明"，本文的双实现机制解决"组件实现如何替换"（第二级组件级重写）。

核心不变量：**同种 Cell 的数据契约（Schema）与展示内容不随实现改变**——主题切换的是样式与实现，不是数据。

## 基础 Cell 的种数论证

划分判据：在**交互手势 / 展示内容 / 结构职能**三个维度上，不可由其他种组装得出的原语。多于这个集合则出现种间可互相派生（违反最小性），少于这个集合则某类交互/展示/结构无处安放（组装时牵强）。

| # | 基础 Cell | 维度 | 不可派生性论证 |
|---|-----------|------|----------------|
| 1 | TextCell 文本 | 展示 | 一切内容的最终载体（居于 core/builtin-cells，框架自带） |
| 2 | MediaCell 媒体 | 展示 | 非文本内容（glyph / img / video / audio），文本无法表达 |
| 3 | ButtonCell 按钮 | 交互：按压 | 离散触发；拖拽/输入无法模拟"瞬时触发"语义 |
| 4 | SliderCell 滑块 | 交互：一维拖拽 | 连续/分档取值；按钮只能步进逼近，无法表达"拖到任意位置" |
| 5 | InputCell 文本输入 | 交互：文本输入 | 自由文本产生，与取值/触发正交（原生 input 为手势载体） |
| 6 | PanelCell 面板 | 结构：静态容器 | 固定结构的 slot 组合容器 |
| 7 | ListCell 列表 | 结构：数据驱动重复 | 数组数据 → N 个重复项 + 滚动；静态容器无法表达"数量由数据决定" |
| 8 | WindowCell 窗口 | 结构：浮动层 | 脱离主布局树的浮动视口容器（居于 core/builtin-cells，框架自带） |

**排除项**（常被误认为基础的候选）：

- **开关 / 多档开关**——滑块的 2 档 / n 档组装（滑块族）
- **选项 / 勾选（checkbox / radio）**——按钮 + 状态标记组装（按钮族）
- **二维坐标选择器**——两个一维拖拽的正交组合（滑块族）
- **进度条**——只读滑块（滑块族）
- **滚动**——Box 层能力（moveX/moveY + FloatingScrollbar），不是 Cell
- **菜单 / 页标签 / 标签页**——按钮的多级组装链（按钮族）

基础 Cell 的实现统一拆为两层：

```
基础 Cell  = 纯受控实现组件 XxxImpl（props 进、回调出，无 Cell 依赖）
           + Cell 壳（Schema ↔ XxxImpl 绑定，renderContent 壳视图）
```

`XxxImpl` 可引用主题/i18n 等基础设施 Hook（useThemeColor、useText），但**不得 import 任何其他 Cell 或其 Impl**。高级 Cell 的组装 fallback 复用的正是这些 Impl。

## 双实现机制

```
高级 Cell  = Schema（数据契约，与实现无关）
           + kind（如 'switch'）
           + renderContent(createImplDispatcher(kind, AssembledView))

渲染时（createImplDispatcher，src/core/cell/cell-react.jsx）：
  theme.getComponent(kind)          // 主题声明的重写实现名（theme.components）
    → 实现注册表解析（src/core/cell/implementations.js）
      命中     → 渲染主题自定义实现（组件级重写，两级样式体系第二级）
      未声明/未识别 → 渲染 AssembledView（组装 fallback，降级保证）
```

- **组装 fallback 是实现级组装**：AssembledView 是 React 视图，直接组合基础/高级 Cell 暴露的 `XxxImpl` 纯组件；数据全部在高级 Cell 自己的 Schema（单一数据源），天然支持数据驱动重复（`items.map(ButtonImpl)`）
- **实现注册表**与 resize 特效注册表同构：声明式描述 + 注册表解析 + 未识别降级。自定义实现以 `registerCellImpl(kind, name, Component)` 注册，组件约定 props `{ cell }`（与 renderContent 一致，内部 useCellData 取数）
- **主题侧声明**：`new Theme({ components: { switch: 'md3-switch' } })`——声明式，未声明的 kind 一律走组装 fallback；声明了未注册的实现名同样降级 fallback
- 不采用"真子 Cell 实例组装"（slots + fill + 数据绑定）：父子双份数据需要同步绑定，且 Box 层"content 优先于子 Box"的语义与之冲突；页面作者层的 fill 组合用法不受影响

## 依赖规则

1. **基础 Cell**：只依赖 core 基础设施（Box / Cell 基座 / DataTree / i18n / theme），不得依赖任何其他 Cell 或其 Impl
2. **高级 Cell**：组装 fallback 只能由其声明的 deps（基础 Cell 或更低级高级 Cell 的 `XxxImpl`）组合而成；deps 构成**有向无环图**
3. **多级依赖**：高级 Cell 可依赖其他高级 Cell 的 Impl（示例链：ButtonImpl → MenuImpl → TabBarImpl → Tab 组装视图）
4. **数据契约**：同 kind 的自定义实现与组装 fallback 共用同一 Schema；实现替换对页面作者透明

## 示范链

### 滑块族（SliderTrackImpl 组装）

| 高级 Cell | 组装方式 | Schema |
|-----------|----------|--------|
| SwitchCell 开关 | 两档滑块（min0/max1/step1，enabled↔value）+ label | label / enabled / disabled |
| MultiSwitchCell 多档开关 | 多档滑块（step1、0..n-1、档标记刻点）+ 当前档位文本 | label / options / index / disabled |
| ProgressCell 进度条 | 只读滑块（interactive:false、无滑块）+ 百分比文本 | percent / showText / color / trackColor |

其中 SwitchCell 附带组件级重写示例：`registerCellImpl('switch', 'md3-switch', Md3SwitchImpl)`（MD3 风格 52×32 胶囊开关），演示主题经 `components: { switch: 'md3-switch' }` 启用。

### 按钮族（ButtonImpl 多级组装）

```
ButtonImpl（基础）
  → MenuImpl（菜单 = 按钮列表；纵向/横向两态）
    → TabBarImpl（页标签栏 = 横向菜单，二级依赖）
      → Tab 组装视图（标签页 = 页标签栏 + 内容区，三级依赖）
```

## 共享实现组件清单（XxxImpl）

组装 fallback 的积木。基础 Impl 位于 src/basic-cells/（TextImpl 居于 core），高级共享 Impl 随其 Cell 文件导出，全部经 src/core/ui-kit.jsx 统一出口。

**变体机制**：实现组件的样式档位（MD3 变体）。解析优先级为 **Impl props 显式 >
theme.elements 元素级样式表 > 内建默认**（见 docs/theme-shape-design.md「元素级
样式表」）；变体只改变样式，不改变 props/Schema 数据契约。交互反馈（hover/active
罩层、focus 光环）由 core/theme/state-layer.js 的注入 CSS 统一提供。

| Impl | 来源 | 变体（elements 角色） | 组装props（要点） |
|------|------|------------------------|-------------------|
| TextImpl | core/builtin-cells | size 语义档：title-large / title / body / label | text / size / color（支持角色名）/ bold / align |
| ButtonImpl | basic-cells/button | filled / tonal / outlined / text（button） | label / icon / variant / type(兼容) / size / disabled / block / align / color(数据色) / onPress |
| SliderTrackImpl | basic-cells/slider | md3 / classic（slider） | min / max / step / value / interactive / ticks / variant / onChange |
| InputImpl | basic-cells/input | outlined / filled（input） | value / placeholder / type(text\|password) / variant / onChange / onSubmit |
| ListImpl | basic-cells/list | md3(胶囊选中行) / flat（list） | items / selectedId / variant / onSelect |
| OptionImpl | checkbox | 跟随 ButtonImpl | label / checked / markOn / markOff / onToggle（checkbox、radio 共用） |
| SelectImpl | select | 跟随 ButtonImpl | options / value / placeholder / open(可受控) / onChange（select、picker 共用） |
| CalendarImpl | calendar | 跟随 ButtonImpl | year / month / selected / onSelect（calendar、date-picker 共用） |
| NoticeImpl | notice | type 语义色 | text / type / closable / capsule / elevated / onClose（notice、toast、message、alert 共用） |
| MenuImpl | menu | 跟随 ButtonImpl | 按钮列表（menu 本体，tab-bar 依赖） |
| TabBarImpl | tab-bar | 跟随 ButtonImpl | 横向菜单（tab-bar 本体，tab 依赖） |
| TextareaImpl | textarea | outlined / filled（input 通道） | value / placeholder / variant / onChange（textarea、editor 共用） |

## 预设归类映射（全量迁移完成）

按族归类全部预设（✓ = 已接入双实现机制；基础 = 8 种基础 Cell；◆ = 纯 slot 容器，无自有内容视图，Box 结构即实现）：

- **基础（8）**：text✓(core)、media✓、button✓、slider✓、input✓、panel✓、list✓、window✓(core)
- **滑块族**（SliderTrackImpl）：switch✓、multi-switch✓、progress✓、rate✓（离散一维）、joycon✓（二维 = 两正交一维）
- **按钮族**（ButtonImpl）：checkbox✓、radio✓、tag✓、stepper✓、pagination✓、index-bar✓、breadcrumb✓、nav-bar✓、accordion✓、carousel✓、upload✓、login✓
- **菜单/列表族**（ButtonImpl/ListImpl，多级）：menu✓ → tab-bar✓ / select✓ / picker✓ → tab✓ / table✓ / tree✓ / kanban✓ / order✓ / date-picker✓ / calendar✓
- **输入族**（InputImpl/TextareaImpl）：textarea✓、editor✓、search✓、chat✓、color-picker✓、login✓
- **展示族**（TextImpl/主题色容器）：avatar✓、badge✓、title✓、divider✓、stat✓、icon✓、skeleton✓、empty✓、result✓、loading✓、timeline✓、process✓、chart✓、bar✓、document✓、profile✓
- **容器族**：section✓、settings✓、card◆、group◆、grid◆、tiling◆、dashboard◆、form◆、field◆、control◆、page◆（纯 slot 容器，经 Box 配方与 styleRole 走普适性配置，无需内容分发器）
- **浮层族**（NoticeImpl + 主题色容器）：toast✓、message✓、notice✓、alert✓、popover✓、tooltip✓、confirm✓、drawer✓、dialog◆、floating-panel◆

迁移一个高级 Cell 的步骤：① 确认其组装来源（族）与 Schema 契约不变；② 将实现拆为 `XxxImpl` 纯组件（若族内尚无）；③ renderContent 换为 `createImplDispatcher(kind, AssembledView)`；④ 在预设归类中标注已落地。

## 布局健壮性约定

所有预设 Cell（基础与高级）的实现组件遵守两条布局约定（已全量审计落地）：

1. **嵌套内容必须用盒包裹**：视图内自绘的嵌套内容块（items.map 的行/卡片/气泡、
   展开区、下拉层等）必须是独立布局盒——display（flex/block）+ `boxSizing:
   'border-box'` + 明确宽/高约束（'100%' 或具体值）；flex 行内的文本容器必须
   `minWidth: 0` 才能正确省略截断，溢出风险处补 overflow。经 defineSlot/fill
   挂载的子 Cell 由框架自动挂 Box（cell-base `_mountBox`），slot 容器无需额外处理。
2. **border 不得影响布局尺寸**：任何 border 与同一 style 对象内的
   `boxSizing: 'border-box'` 配对；状态切换不得改变 border 宽度（选中/未选、
   有/无）——用恒定宽度（未选 transparent）、outline 或 boxShadow 内环替代。
   focus 反馈一律用 outline（不参与布局，见 core/theme/state-layer.js）。

## 跨浏览器一致性约定

导致各浏览器/webview 呈现不一致的实现手段一律舍弃（已全量落地）：

- **字体**：任何文字必须显式字体与字号。字族由 core/theme/state-layer.js
  注入的全局 CSS 统一（body 无衬线系统字体栈 + 基准字号 + 表单控件
  `font-family: inherit`）——不声明时 Firefox/Safari 默认衬线、Chrome/Edge
  默认无衬线，且表单控件不继承文档字体；字号由文本承载元素逐个显式声明
- **圆角**：恒为 g1 `border-radius`。g2 曲率平滑依赖 CSS `corner-shape`
  （仅 Chromium 支持）已舍弃，`cornerStyle` 不再产生 cornerShape
- **CSS 特性**：未在各系统 webview 普及的特性一律不使用（corner-shape、
  color-mix 等）。交互态层罩层色在 JS 侧预算（hexToRgba），不经 color-mix
- **图形**：界面上的装饰性符号一律用 SVG 固定几何绘制，不用文本字形
  ——共享字形库 src/basic-cells/glyphs.jsx（GlyphChevron/Close/Check/
  Triangle/Radio/Checkbox/Minus/Plus/Info/Warning，currentColor 继承父级
  颜色，size 定尺寸）。★/☆/▲/▼/◉/○/☑/☐/✕/✓/▾/▸/‹›/ℹ 等字形随浏览器
  回退字体渲染，尺寸与粗细不一致。数据文本（字母、分隔符等）不是图标，
  按文字规则处理

## 解耦边界

- 基础 Cell 之间、基础 Cell 与高级 Cell 之间唯一共享的是 core 基础设施与主题/i18n 资源标识
- 高级 Cell 依赖的是**实现组件接口**（Impl 的 props 契约），不是对方 Cell 的 Schema 或 Box 结构
- 实现注册表不感知 Theme；Theme 只持有实现名声明；解析在 Cell 视图层渲染时完成——主题切换经 ThemeProvider 触发改判，对页面作者透明

## 演进方向

- 二维坐标选择器：SliderTrackImpl 的正交组合（x/y 双轴，joycon 已示范）或专用 2D 拖拽面
- 运行时主题热切换下的实现替换动画与状态保持
- 自定义实现的 props 契约标准化（当前为 `{cell}` 全量开放，后续可收紧为 Schema 子集 + 受控回调）
