# 形状与普适样式（Shape & Universal Style）

## 定位

本文档是主题系统（见 theme-i18n-design.md）在**静态资源层**的细化：定义组件的**基础形状**（圆角矩形 / 胶囊 / 圆形）与**普适样式配置**（材质、颜色、不透明度）如何被主题声明、被 Cell/Box 消费。

形状与普适样式遵守 theme-i18n-design.md 的全部设计原则：资源标识即契约、声明优先、可降级、可组合、响应式。Cell 声明"需要什么形状、什么材质"，主题系统决定"具体用什么圆角、什么颜色、如何实现"。

## 核心概念

### 包裹层（Wrapper Layer）

组件的视觉形状由 **N 层嵌套的圆角矩形壳**构成，自外向内编号为第 0、1、2 … 层：

- 第 0 层是最外轮廓，决定组件在布局中的视觉边界
- 每向内一层，与外层保持一个**间距（inset）**，形成描边、衬底、内容区等视觉结构
- 层数由主题按组件角色声明（如按钮 2 层、卡片 3 层），Cell 自身不声明具体层数

包裹层不是额外的布局 Box——它是**形状规范**：渲染时映射为一组嵌套的视觉壳（可以是 Box 子树，也可以是单元素上的多层背景/描边实现），实现方式由渲染层决定。

### 层间关系

主题对每一层声明两项：

| 字段 | 说明 |
|------|------|
| `inset` | 本层与向外一层的间距（px）。第 0 层 inset 恒为 0 |
| `radius` | 本层圆角尺寸 |
| `color`（可选） | 本层壳的填充颜色角色（不声明则该层壳不填充，仅参与圆角递推） |
| `opacity`（可选） | 本层壳的填充不透明度 |

包裹层壳（第 1 层起）在渲染时映射为**绝对定位逐层内缩的视觉壳**（pointer-events: none，
位于内容之下）：纯视觉呈现，不参与 reflow 计算，布局树与拖拽/滚动机制不受影响。

`radius` 支持两种声明方式：

- **显式值**：直接给出 px，如 `{ inset: 4, radius: 10 }`
- **同心规则**：字符串 `'concentric'`，取 `外层 radius − 本层 inset`（iOS 式同心圆角，保证内外轮廓曲率中心重合、视觉平行）

层数超出主题声明范围时，沿用最后一层的规则递推（同心规则天然可递推；显式值以最后一层为准继续内推）。

### 圆角类型（Corner Continuity）

圆角一律为 `g1` 非平滑圆弧（`border-radius`）。曾经设计的 `g2` 曲率平滑
（squircle 类超椭圆）依赖 CSS `corner-shape`——该特性仅 Chromium 支持，
各系统 webview 尚未普及，按跨浏览器一致性约定（见 basic-cell-design.md）
**已舍弃**：主题的 `shape.corner` 声明不再产生任何差异，渲染恒为 g1。

### 基础形状选项

组件的基础形状由 Cell 声明，三选一：

| 形状 | 说明 |
|------|------|
| `rect` | 圆角矩形（默认）。各层圆角取主题的层间关系声明 |
| `capsule` | 胶囊型。短轴全圆角（radius = min(宽,高)/2），忽略主题的逐层 radius，层间 inset 仍生效 |
| `circle` | 圆形。胶囊型的特例：约束宽高相等（1:1）后按胶囊处理 |

胶囊/圆形是**形状级覆盖**：只覆盖 radius 的取值规则，不改变层数与 inset 关系。圆形因几何约束，层数语义退化为同心圆环。

### 角色半径尺度

层规范的第 0 层 `radius` 同时承担**该角色的基准圆角**：Box 级圆角由层规范驱动，
元素级圆角（Cell 内容组件内部的按钮、气泡等 DOM 元素）经 `useShapeRadius(role, fallback)`
读取同一基准值，保证 Box 级与元素级圆角对齐同一尺度。

推荐的角色尺度约定（应用主题可按需调整取值，但角色集合保持稳定）：

| 角色 | 语义 | 参考值 |
|------|------|--------|
| `control` | 小控件（按钮、输入框、勾选框、标签等） | 6 |
| `default` | 未指定角色的缺省 | 8 |
| `overlay` | 浮层元素（气泡、弹出卡片、提示条） | 10 |
| `card` | 卡片/面板容器 | 14 |
| `window` | 窗口级容器（对话框、浮动窗口） | 16 |

容器型 Cell 在构造函数声明 `styleRole(role)` 使 Box 级圆角生效；圆形/胶囊元素
继续使用全圆角，不占用角色尺度。

## 普适性配置项

形状之外，主题对组件提供一组**跨主题语义一致**的配置项。配置项的 key 集合是稳定的（契约），取值由主题包给出：

| 配置项 | 说明 | 示例值 |
|--------|------|--------|
| `material` | 材质：组件表面的填充方式 | `solid`（纯色）、`frosted`（毛玻璃，`backdrop-filter` 模糊 + 半透明底）、`outlined`（透明底 + 描边） |
| `color` | 颜色角色：语义化色彩标识，不直接出现色值 | `primary`、`danger`、`surface`、`on-surface` |
| `opacity` | 不透明度 | 0~1 |

约束：

- **色值不出现在 Cell 与配置契约中**。Cell 引用颜色角色（如 `color: 'primary'`），主题包将角色解析为具体色值；这与 theme-i18n-design.md 的「资源标识即契约」一致
- `material` 的实现同样可降级：`frosted` 在不支持 `backdrop-filter` 的环境回退为更高不透明度的 `solid`
- 材质与颜色正交组合：`frosted + primary` 表示主色毛玻璃

### 角色样式表（styles）

普适配置项的取值除由 Cell 逐项声明外，主题还可以**按组件角色集中声明默认值**（`styles` 表），字段与 Cell 的普适配置声明一一对应：

```js
const theme = new Theme({
  // ...
  styles: {                            // 普适样式默认值表（按组件角色声明）
    window:  { color: 'surface' },     // window 角色组件默认 surface 底色
    card:    { color: 'surface' },
    nav:     { color: 'primary' },
    // 字段全集：shape 基础形状 / color 颜色角色 / material 材质 / opacity 不透明度
  },
});
```

解析优先级（与「普适配置是默认值，不是强制约束」一致）：

**Cell 显式声明（`.shape()/.color()/.material()/.opacity()`）> 主题角色样式表（styles，按 styleRole 查询，未声明回退 `styles.default`）> 内建降级**

角色样式表使 Cell 可以只声明 `styleRole('window')`，其余普适配置全部由主题集中给出；
Cell 对个别项的显式声明仍然生效（覆盖默认值）。未声明 `styleRole`/`shape` 的 Box 不参与
角色样式表解析（与层规范同一守卫，避免波及纯布局 Box）。

### 元素级样式表（elements）

角色样式表作用于 **Box 级**（组件表面的底色/材质）；基础实现组件（XxxImpl）**内部
元素**的样式由 `elements` 表集中声明——按钮、输入框、滑块、列表行等元素角色的
默认变体、圆角与阴影：

```js
const theme = new Theme({
  // ...
  elements: {                                 // 元素级样式表（按元素角色声明）
    button: { variant: 'filled', radius: 'capsule', elevation: 0 },
    input:  { variant: 'outlined' },          // 或 'filled'（浅底 + 底部指示线）
    slider: { variant: 'md3' },               // 或 'classic'（细轨道 + 描边圆点）
    list:   { variant: 'md3' },               // 或 'flat'（实色块选中 + 分隔线）
  },
});
```

字段约定：

| 字段 | 说明 | 取值 |
|------|------|------|
| `variant` | 变体名（枚举由各 Impl 定义，见 docs/basic-cell-design.md 共享实现组件清单） | 如 button：filled / tonal / outlined / text |
| `radius` | 元素圆角 | px 数值 / `'capsule'` / 形状尺度角色名（走 `getBaseRadius`） |
| `elevation` | 阴影档 | 0–3（MD3 elevation 近似，`shape.js` 的 `ELEVATIONS` 表） |

解析优先级（与角色样式表同构）：**Impl props 显式 > 主题元素级样式表（elements，
按元素角色查询，未声明回退 `elements.default`）> 内建默认**。内建默认即 MD3 化
外观——不声明 `elements` 的主题同样得到美观的呈现；需要旧式朴素外观时可经
`variant: 'classic' / 'flat'` 找回。

#### 交互态层（state layer）

元素的 hover/active 反馈经 `src/core/theme/state-layer.js` 一次性注入的全局 CSS
实现（inline style 无法表达伪类）：元素加 `hk-state` 类，`stateLayerProps(onColor)`
在 JS 侧按 MD3 态层规范预算罩层色（hover 8% / active 12% 的 rgba，经 hexToRgba
合成），以 CSS 变量 `--hk-hover/--hk-active` 携带，`background-image` 渐变叠加；
on-color 非 hex 时罩层缺省 transparent（各浏览器一致地无变化）。`hk-focus` 类提供
focus-visible 光环。同一注入还承担字体基样式（body 无衬线系统字体栈 + 表单控件
继承），保证跨浏览器字体一致。注入 CSS 不使用 `color-mix` 等尚未普及的 CSS 特性。

## 两级样式体系

UI Kit 的组件样式实现分两级：

- **第一级：普适性配置（已实现）**。即本文的形状与普适样式配置：主题经形状描述、
  颜色角色表、材质表与角色样式表（styles）集中声明取值，Cell 只引用形状选项、
  颜色角色、材质标识与组件角色，渲染层统一解析为具体 CSS。覆盖绝大多数主题的
  常规换肤需求（含 Material Design 3 等设计体系的令牌化复刻，见「参考主题」）。
- **第二级：组件级重写（已实现，见 docs/basic-cell-design.md）**。普适配置是**默认值，不是强制约束**。主题可以在两个粒度上绕开普适配置自主实现：
  - **整主题绕行**：主题包声明 `custom: true`，表示该主题的组件样式完全由主题自带的渲染器产出，普适配置项不参与解析（极端风格化主题，如拟物、像素风）（预留）
  - **单组件角色绕行**：主题经 `components: { [kind]: 实现名 }` 声明某 Cell 种类的重写实现，经实现注册表（src/core/cell/implementations.js）解析后整体替换该种类的呈现；未声明/未识别的种类走组装 fallback（见 docs/basic-cell-design.md 双实现机制）

  绕行遵循与 resize 特效注册表相同的模式：声明式描述 + 注册表解析 + 未识别降级。Cell 对是否被绕行无感知。

## 形状描述协议（主题包侧）

主题包中的形状声明示例：

```js
const theme = new Theme({
  name: 'smooth-light',
  shape: {
    corner: 'g1',                       // 圆角类型：恒 g1（g2 已舍弃，声明无效）
    layers: {                           // 层间关系（按组件角色声明）
      default: [
        { inset: 0, radius: 12 },
        { inset: 2, radius: 'concentric' },
        { inset: 6, radius: 'concentric' },
      ],
      button: [
        { inset: 0, radius: 8 },
        { inset: 2, radius: 'concentric' },
      ],
    },
  },
  materials: {                          // 普适配置取值表
    colors: { primary: '#4a90d9', surface: '#ffffff', danger: '#d93a3a', /* ... */ },
    material: { frosted: { blur: 20, baseOpacity: 0.6 }, /* ... */ },
  },
  styles: {                             // 角色样式表（普适配置默认值，按组件角色）
    card:   { color: 'surface' },
    window: { color: 'surface' },
  },
  effects: { resize: { type: 'stretch' } },
});
```

Cell 侧的声明（不感知具体取值）：

```js
// Cell 类型作者在构造函数中声明形状需求
this.shape('capsule')            // 基础形状：rect | capsule | circle
    .styleRole('button')         // 组件角色：主题包裹层规范（shape.layers）与
                                 // 角色样式表（styles）的查询键
    .color('primary')            // 颜色角色（显式声明，覆盖角色样式表默认值）
    .material('frosted');        // 材质
```

未声明 `styleRole` 与 `shape` 的 Box 不参与层规范与角色样式表解析（避免 `default` 角色的圆角波及全部布局 Box）。

## 参考主题：Material Design 3 令牌映射

演示应用（src/app.jsx）的参考主题 `hound-md3-light` 以 Material Design 3（light scheme）
为取值基准，验证「普适性配置级」对主流设计体系的令牌化复刻能力。映射关系：

### 颜色角色 ↔ MD3 系统令牌

| UI Kit 颜色角色 | MD3 token | 基准值 |
|------|------|--------|
| `primary` / `on-primary` | primary / onPrimary | `#6750A4` / `#FFFFFF` |
| `primary-container` / `on-primary-container` | primaryContainer / onPrimaryContainer | `#EADDFF` / `#21005D` |
| `surface` / `on-surface` | surface / onSurface | `#FEF7FF` / `#1D1B20` |
| `surface-variant` / `on-surface-variant` | surfaceVariant / onSurfaceVariant | `#E7E0EC` / `#49454F` |
| `outline` / `outline-variant` | outline / outlineVariant | `#79747E` / `#CAC4D0` |
| `error`（别名 `danger`） | error | `#B3261E` |
| `surface-muted`（别名） | surfaceContainer | `#F3EDF7` |
| `text` / `text-secondary` / `text-muted`（别名） | onSurface / onSurfaceVariant / outline | 同上 |
| `primary-soft` / `primary-dark`（别名） | primaryContainer / dark 主题 primary | `#EADDFF` / `#4F378B` |
| `success` / `warning` | MD3 无对应角色，语义扩展，取值自定 | — |

MD3 规范角色与既有别名同值双写：既有 Cell 引用别名零改动获得 MD3 视觉，新代码可直接引用 MD3 规范角色名。

### 形状尺度 ↔ MD3 shape scale

| 组件角色 | 基准圆角 | MD3 档位 |
|------|------|--------|
| `control` | 8 | small |
| `default` | 12 | medium |
| `overlay` | 8 | small |
| `card` | 12 | medium |
| `window` | 28 | extraLarge |
| `nav` | 0 | none（通栏不取圆角） |

MD3 的状态层（hover/press 透明度叠加）、elevation 投影与排版尺度尚未纳入普适配置项，
属于后续演进方向（须满足「对全部主题语义一致」的纳入标准）。

## 解析与渲染

- **形状渲染**：圆角恒为 g1 `border-radius`（g2 已按跨浏览器一致性约定舍弃，见「圆角类型」）；渲染层把层规范解析为具体 CSS
- **注入时机**：形状与普适配置经 ThemeProvider 注入，Box 内容层渲染时读取当前主题的形状描述，把层规范解析为具体 CSS（borderRadius / padding inset）
- **实现落点**（对应 `src/core/theme/shape.js`）：Box 元素自身承担第 0 层（圆角、形状、材质、颜色角色、不透明度；逐项取值按「Cell 显式声明 > 角色样式表 styles > 内建降级」解析）；第 1 层起渲染为绝对定位内缩的视觉壳（pointer-events: none，位于内容之下，不参与 reflow）；浮动视口的包壳（floating-shell）同步应用第 0 层圆角，保证 overflow 裁剪与圆角对齐
- **响应式**：主题切换广播变更，订阅方重新解析形状描述并重新呈现；对 Cell 透明
- **单向性**：主题流向 Cell/Box，Cell 不反向修改主题

## 解耦边界

- Cell/Box 不依赖任何具体主题包，只引用形状选项、颜色角色、材质标识
- 主题包不依赖任何具体 Cell 类型，只消费组件角色命名约定
- 形状实现策略（border-radius）不依赖 Cell 类型，只消费形状描述
- 唯一耦合点：形状选项枚举（rect/capsule/circle）、颜色角色与材质标识的命名空间、层描述协议（inset/radius/concentric）

## 演进方向

- 层规范的组件角色命名空间与冲突处理
- 描边、投影等更多普适配置项的纳入标准（须对全部主题语义一致才可成为普适项）
- 形状与特效合成的协同（如毛玻璃材质与合成型特效共享表面）
- 胶囊/圆形在自由滚动与网格布局下的尺寸约束细化
