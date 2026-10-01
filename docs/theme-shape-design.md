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

圆角的曲线品质分两类，作为形状描述的一部分由主题声明：

| 类型 | 含义 | CSS 实现 |
|------|------|----------|
| `g1` | 非平滑（切线连续）。普通圆弧圆角 | `border-radius` |
| `g2` | 曲率平滑（曲率连续，squircle 类超椭圆） | `corner-shape: squircle`（配合 `border-radius` 给尺寸） |

G2 的实现按运行时能力**分级降级**（与尺寸变化特效同一思路，见 theme-i18n-design.md「可降级」）：

1. 首选 `corner-shape: squircle`（CSS Backgrounds 4，能力检测 `CSS.supports('corner-shape: squircle')`）
2.（保留）`clip-path: path(...)` / SVG mask 的超椭圆路径——依赖盒像素尺寸，首版未启用
3. 降级为 `border-radius`（G1 呈现，功能不受影响）

主题只声明 `{ corner: 'g2' }`，不感知实现路径；实现解析由形状渲染注册表完成（见「解析与渲染」）。

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

## 主题自主实现

普适配置是**默认值，不是强制约束**。主题可以在两个粒度上绕开普适配置自主实现：

- **整主题绕行**：主题包声明 `custom: true`，表示该主题的组件样式完全由主题自带的渲染器产出，普适配置项不参与解析（极端风格化主题，如拟物、像素风）
- **单组件角色绕行**：主题对特定组件角色（如 `button`）提供自定义样式函数/组件，仅该角色不走普适解析，其余角色仍用普适配置

绕行遵循与 resize 特效注册表相同的模式：声明式描述 + 注册表解析 + 未识别降级。Cell 对是否被绕行无感知。

## 形状描述协议（主题包侧）

主题包中的形状声明示例：

```js
const theme = new Theme({
  name: 'smooth-light',
  shape: {
    corner: 'g2',                       // 圆角类型：g1 | g2
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
  effects: { resize: { type: 'stretch' } },
});
```

Cell 侧的声明（不感知具体取值）：

```js
// Cell 类型作者在构造函数中声明形状需求
this.shape('capsule')            // 基础形状：rect | capsule | circle
    .styleRole('button')         // 组件角色：主题包裹层规范（shape.layers）的查询键
    .color('primary')            // 颜色角色
    .material('frosted');        // 材质
```

未声明 `styleRole` 与 `shape` 的 Box 不参与层规范解析（避免 `default` 角色的圆角波及全部布局 Box）。

## 解析与渲染

- **形状渲染注册表**：与 resize-effects 同构。渲染层按 `corner` 类型从注册表解析实现策略（g1 → border-radius；g2 → corner-shape / clip-path / 降级），未识别类型降级为 g1
- **注入时机**：形状与普适配置经 ThemeProvider 注入，Box 内容层渲染时读取当前主题的形状描述，把层规范解析为具体 CSS（borderRadius / cornerShape / clip-path / padding inset）
- **实现落点**（首版，对应 `src/core/theme/shape.js`）：Box 元素自身承担第 0 层（圆角、形状、材质、颜色角色、不透明度）；第 1 层起渲染为绝对定位内缩的视觉壳（pointer-events: none，位于内容之下，不参与 reflow）；浮动视口的包壳（floating-shell）同步应用第 0 层圆角，保证 overflow 裁剪与圆角对齐
- **响应式**：主题切换广播变更，订阅方重新解析形状描述并重新呈现；对 Cell 透明
- **单向性**：主题流向 Cell/Box，Cell 不反向修改主题

## 解耦边界

- Cell/Box 不依赖任何具体主题包，只引用形状选项、颜色角色、材质标识
- 主题包不依赖任何具体 Cell 类型，只消费组件角色命名约定
- 形状实现策略（corner-shape / clip-path / border-radius）不依赖 Cell 类型，只消费形状描述
- 唯一耦合点：形状选项枚举（rect/capsule/circle）、圆角类型枚举（g1/g2）、颜色角色与材质标识的命名空间、层描述协议（inset/radius/concentric）

## 演进方向

- 层规范的组件角色命名空间与冲突处理
- 描边、投影等更多普适配置项的纳入标准（须对全部主题语义一致才可成为普适项）
- 形状与特效合成的协同（如毛玻璃材质与合成型特效共享表面）
- 胶囊/圆形在自由滚动与网格布局下的尺寸约束细化
