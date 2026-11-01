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

其中 SwitchCell 附带组件级重写示例：`registerCellImpl('switch', 'md3-switch', Md3SwitchImpl)`（MD3 风格开关），演示主题经 `components: { switch: 'md3-switch' }` 启用。两种实现共用同一轨道几何（轨道 44×24、滑块 18、内缩 3px），Cell 高度统一 40，避免早期 56px 轨道与 MD3 轨道尺寸互不协调。

**开关的拖动中间过程**（两态滑块与多档进度条同理）：滑块尺寸在开/关两态保持
恒定（18px），只改变位置与配色，不再"开态大、关态小"。按下时先用 `.hk-slide`
过渡把滑块动画移到点击处（`drag.pos` + `live:false`）；指针移动进入连续拖动后
去掉过渡（`live:true`）保证跟手，每移动到一个新位置都重新落点；松开时清空拖动
预览、交回数据驱动的静止位置，由 `.hk-slide` 过渡动画吸附到目标端——即「按下的
一次动画 → 拖动中反复跟随 → 松开后动画归位」三段过程。多档开关 / 滑块 / 进度
条同样由 `SliderTrackImpl` 的 `following`（是否已进入连续拖动）+ `preview`
（滑块视觉位置）两个状态实现同一套节奏：`preview` 存的是**指针处的连续比例**，
不是吸附后的取值——因此按下的一瞬间滑块会先动画**移到指针处**（连续量本身
也如此，不吸附到下一个刻点），拖动时逐帧跟手；数据按吸附值写入，松手后清空
预览，再由取值驱动动画吸附到档位。多档进度条在按下阶段只走预览、不写数据
（`tapMode='step'`），进入拖动（位移 >4px）后才按指针位置连续换档。

**短按语义**（<4px 位移且 <300ms 的一次点击）与拖动分开处理：
- 开关：短按**直接切换**开关状态（不按点击位置推断开/关）；按住或拖动仍按
  落点是否越过轨道中线判定
- 多档位进度条（MultiSwitchCell）：短按的**邻近区间**界定为「当前档点 → 左右
  相邻档点的中点」之间（首/末档外侧没有邻居，该侧不设限）。落在区间内时朝指针
  所在的一侧移动**相邻一档**（点击位置本身不作为取值，也不跨档跳跃，避免误触）；
  落在区间外时**按离点击位置最近的状态切换**（按档点圆心的像素距离取最近档位），
  因此快速点向轨道另一侧会直接跳到最近档位。只有按住拖动才按指针位置连续换档
  （`SliderTrackImpl` 的 `tapMode='step'`，滑块 / 摇杆等连续量仍为默认 `'jump'`，
  短按即跳到点击处）。
  档标记刻点的内缩取**轨道高一半**（端部圆角半径）：两端的档点圆心与色条两侧
  胶囊圆角的圆心重合，档点既不贴边也不越界（md3 内缩 2px / classic 3px）。

### 离散取值族（直接点选）

**RateCell 评分不走滑块轨道**：评分是离散选择，拖拽轨道在语义与手感上都不直观。
组装 fallback 为一排 SVG 五角星（固定几何，不用 ★/☆ 文本字形，避免浏览器
回退字体的尺寸/粗细差异），每颗星是独立 `button`（`aria-label` + `aria-pressed`，
28×28 热区）：悬停预览到光标所在星、点击直接写 `value`；键盘走按钮原生
Enter/Space。亮/暗两态都用**实心**星形，未点亮星取主题 `outline-variant`
（与点亮星同形不同色，暗色主题自动跟随），不再用空心描边。Schema 不变
（value / count / color / disabled），主题仍可经 `theme.components.rate` 整体重写。

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
| ButtonImpl | basic-cells/button | filled / tonal / outlined / text（button）+ size small / default / large / icon | label / icon / variant / type(兼容) / size / disabled / block / align / color(数据色) / onPress |
| SliderTrackImpl | basic-cells/slider | md3 / classic（slider） | min / max / step / value / interactive / showThumb / ticks / variant / color / trackColor / ariaLabel / onChange |
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
- **滑块族**（SliderTrackImpl）：switch✓、multi-switch✓、progress✓、joycon✓（二维 = 两正交一维）
- **离散取值族**（直接点选，无滑块轨道）：rate✓（一排可点击星，悬停预览 + 点击写值）
- **按钮族**（ButtonImpl）：checkbox✓、radio✓、tag✓、stepper✓、pagination✓、index-bar✓、breadcrumb✓、nav-bar✓、accordion✓、carousel✓、upload✓、login✓
- **菜单/列表族**（ButtonImpl/ListImpl，多级）：menu✓ → tab-bar✓ / select✓ / picker✓ → tab✓ / table✓ / tree✓ / kanban✓ / order✓ / date-picker✓ / calendar✓
- **输入族**（InputImpl/TextareaImpl）：textarea✓、editor✓、search✓、chat✓、color-picker✓（输入条 + 色相环伪窗口，不用浏览器取色器）、login✓
- **展示族**（TextImpl/主题色容器）：avatar✓、badge✓、title✓、divider✓、stat✓、icon✓、skeleton✓、empty✓、result✓、loading✓、timeline✓、process✓（圆点与连线同一水平面，标题在下）、chart✓、bar✓、document✓、profile✓
- **容器族**：section✓、settings✓、card◆、group◆、grid◆、tiling◆、dashboard◆、form◆、field◆、control◆、page◆、app-bar◆、split◆、footer◆、row◆、board◆（纯 slot 容器，经 Box 配方与 styleRole 走普适性配置，无需内容分发器；后五种为页面结构容器——顶栏/分栏/页脚/横向行/布局板块）
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
3. **非法布局的柔和错误卡片**：reflow 判定主轴约束不可满足时（固定子项合计
   超过容器、或剩余空间低于非固定子项最小值合计），不再用红底闪烁提示，而是
   在内容层渲染 `LayoutErrorCard`——danger 8% 浅底 + 28% 内描边 + 「布局错误」
   标题与 `需要 Npx · 可用 Mpx` 明细（尺寸来自 `box._layoutError` 的
   required/available 诊断）。按容器宽高分三档变种：small（紧凑内边距、明细仅在
   宽 ≥150 且高 ≥46 时显示、无图标）/ medium（宽 ≥180、图标 14）/ large（宽 ≥320
   且高 ≥110、图标 16、明细常显），保证大中小尺寸下都读得清、不裁切；卡片
   自身 `user-select: none`。

## 视觉一致性约定

预设 Cell 的外观由主题令牌统一，不在实现组件内自造样式。以下落地规则：

1. **背景归容器，组件不自套底与描边**：预设 Cell 的内容视图一律透明底、无描边，
   随父容器（`styleRole` / `material` / `color` 声明处）的背景呈现。只有两类例外：
   浮层（toast / message / tooltip / popover / 各窗口预设）与其底色即是语义一部分的
   卡片容器（panel / section / card / kanban 列与卡 / chat 气泡 / table 表头）。
   早期"每个组件自带 surface 底 + 外框"的做法已全量清理——嵌套后层层底色与外框
   与页面背景不融洽，且让瓦片/卡片的内外层级失真。**浮层（`styleRole('overlay')`）
   与伪窗口只保留底色 + 投影、不画边框**，其内部多个 Cell 也不再各自套一层方框
   （`getWindowFrameStyle`/`getOverlayShadowStyle` 统一负责外框样式，内部视图
   一律透明），否则弹窗里会看到"层层方框套娃"。
2. **描边用内阴影，不用 border**：描边改 `boxShadow: inset 0 0 0 <w>px` 与既有
   投影合并，不参与盒模型——边框粗细变化不会再挤压文字（按钮 outlined 变体、
   notice/alert tonal 描边均如此）。确需 border 时同 style 内配 `boxSizing: 'border-box'`。
3. **按钮变体与尺寸成体系**：`ButtonImpl` 提供 MD3 四变体——`filled`（主色实底）/
   `tonal`（同色浅底）/ `outlined`（描边）/ `text`（纯文字），解析优先级
   `props.variant > theme.elements.button.variant > type 推导（兼容旧接口）`；
   四尺寸——`small` 24 / `default` 32 / `large` 40 / `icon` 24（水平内边距按档位
   10/16/16/4 递减，不再一律 16px）。同一思路适用于其他带按钮的预设：密度高的
   格子（日历日格、翻页页码、图标位）用 `size="icon"`，工具栏用 `small/default`，
   主操作才用 `large`。数据色经 `color` 传入时按变体落地（实底/浅底/描边/文字）。
   带前置字形且左对齐的按钮（勾选行、列表项），左内边距取
   `max(8, 圆角半径 − 字形半宽)`，使字形中心与按钮圆角圆心对齐。
4. **数字一律等宽**：所有会变化的数值与对齐比较用的数字（滑块值、进度百分比、
   badge 计数、stat 值/涨跌、stepper 值、金额列、表头与表格数字、图表轴标签、
   时间轴时间、日期年月、页码、日历日格）必须用 `TABULAR_NUMS`
   （`fontVariantNumeric: 'tabular-nums'`，core/theme/state-layer.js，等价工具类
   `.hk-num`）。否则数字宽度随字形变化，滚动/增减时文本抖动、列不对齐。
5. **滑块色条分体几何**（MD3）：滑块两端的色条是**两条独立胶囊**（各自
   `border-radius`），以滑块中心为界，两侧各让出 `滑块半宽 + 4px` 的断口与滑块
   保持间距；已填充段宽 `max(0px, calc(中心 - 断口))`、未填充段
   `left: min(calc(中心 + 断口), 100%)`。滑块与档位刻点的中心位置一律用
   `clamp()` 钳制到轨道内（`[半宽, 100% - 半宽]`），保证取值为 0% / 100% 时
   滑块与两端刻点**完整包含在色条内部**，不出界、不被裁切。
6. **可交互元素限制文本选择**：按压/切换类元素（按钮、选项与菜单行、开关行、
   索引字符等）一律 `user-select: none`——core 注入的全局规则覆盖
   `[data-hk-scope] button` 与 `[role="option"]`，自绘行加 `.hk-noselect`，组件内联
   兜底；纯阅读文本、输入/文本域保持可选中，避免拖拽操作误选文字。
7. **颜色选择器自绘 + 弹窗**：不使用浏览器原生 `<input type="color">`（各平台
   取色弹窗样式与交互不一致）。`ColorPickerCell` 本身只是 40 高的输入条（色块 +
   hex 读数 + 展开箭头），点击以**伪窗口**（浮动视口 overlay）弹出面板：色相环
   （`conic-gradient` 环带，0 度 = 右侧 = 色相 0，顺时针递进）+ 环内**斜 45°
   正方形取色块**（正方形旋转 45° 后外接框恰为环内圆，形成"钻石"观感）+ 常用
   色板 + hex 读数。拖动色相环写色相、拖动方块写饱和度/明度，取值经
   `cell.emit('pick')` 回传宿主，宿主只暴露 `color` 数据。
   **色值以 HSL 字符串存储**（`hsl(150, 67%, 32%)`）：HSL 是取色的原生表达，
   色相/饱和度/明度彼此独立，不会像 hex 那样每次写值都经 RGB 取整再反解、
   把色相抖到相邻值（灰阶、极暗、极亮时 hex 往返甚至会丢色相）；hex 仅用于
   输入解析（兼容旧数据）、读数显示与色板。方块**内部坐标取 HSV**（横轴饱和度、
   纵轴自下而上明度，旋转后四角依次为顶部白、右侧纯色相、底部黑、左侧黑）：
   纯 HSL 的 S/L 平面旋转 45° 后有两角为白、两角为黑，视觉发白不适合作取色块；
   指针落点先按 `rotate(45deg)` 逆变换回方块本地坐标，再由 HSV 经 `hsvToHsl`
   落成 HSL 存储值。色相直接读自 HSL 字符串（无彩色时读不到有意义的值，只在
   改色相时以 `s=1 / v=1` 作基准），因此不需要"记忆色相"状态，指针也不会随
   写值往返归零。
   `DatePickerCell` 同构：输入条 + 伪窗口月历（标题栏「年 月」+ 上下月 + 周历
   网格），`open` 由 schema 数据驱动，`navigate`/`pick` 事件回传宿主。
   两个弹窗的落点统一走 `builtin-cells/popover-anchor.js` 的 `placePopover`
   （默认在触发器下方 4px，空间不足翻到上方，水平方向钳制在视口内），
   与 `SelectCell`/`PickerCell` 共用同一套落点规则。
8. **窄内容按钮形态**：IndexBar 是一列**颜色不同的可点击字符**（选中项主色加粗、
   其余 `text-muted`，等分高度），不再让按钮撑破外壳；Pagination 页数超一屏时
   **固定输出 7 个槽位**（首末页常显 + 当前页邻域 + 至多两个省略占位，省略占位
   与页码同宽 24），槽位数恒定 = 页码区总宽恒定，翻页不会因省略号数量变化而抖动
   整行宽度；页码按钮用 `size="icon"` + `aria-label`；
   Breadcrumb 祖先项用 `text/small` 按钮、分隔符与当前页为纯文本 span。按钮统一
   `flexShrink: 0`，兜住父容器意外收缩导致的文字截断。
9. **文字颜色取主题角色**：表格行、列表项等正文不再硬编码深色值，统一取
   `text`（表头与行同理），暗色主题下自动切换为浅色文字。
10. **浮层外壳形状跟随内容**：浮动视口（伪窗口）的定位容器/包壳承载投影与圆角
    裁剪，其形状必须与内容一致——胶囊内容（toast / notification）声明
    `shape('capsule')`，圆角浮层（tooltip / popover / 下拉层 / 取色面板）声明
    `styleRole('overlay')`（圆角取主题 overlay 尺度）。未声明形状的浮层按直角
    矩形绘制投影，内容若是胶囊/圆角，四周就会露出一圈"方框"（矩形轮廓的投影
    与圆角内容不匹配）。

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
- **滚动范围**：不靠绝对定位子项撑大可滚动溢出区域。各引擎对绝对定位
  后代是否计入 scrollable overflow 的实现不一致——Box 三层体系中内容层
  滚动范围由 in-flow 子项撑开（跨引擎一致），Edge/Corner 覆盖层 inner 则以
  主轴内容总尺寸显式撑开（box-component.jsx 的 mainContentSize /
  getOverlayInnerStyle），保证三层滚动范围结构性一致、滚动同步不错位
- **滚动同步**：内容层是唯一滚动源。覆盖层（Edge/Corner）不滚动
  （overflow hidden），其滚动位置由内容层 scroll 事件经 rAF 合并后直写
  覆盖层 inner 的 transform 反向平移镜像（useBoxOverlayScroll）。不做
  scrollTop 镜像——各引擎 scroll 事件时序不一（Firefox APZ 事件落后于
  画面、WebKit 事件不与渲染帧对齐），且程序化滚动大面积覆盖层在 WebKit
  走主线程重绘；transform 写入走合成器，四端成本与时序一致。悬停覆盖层
  手柄时的滚轮操作由非 passive wheel 监听转发给内容层（deltaMode 归一，
  实际移动才 preventDefault，到尽头放行保持滚动链）
- **滚动阻尼**：内容层的滚轮滚动带阻尼（scroll-damping.js）：wheel 增量
  拦截后累积为滚动目标位置，经 rAF 指数衰减平滑逼近，覆盖层经 scroll
  镜像天然跟随，无需额外同步。外部滚动源（浮动滚动条拖拽、键盘、程序化
  写入）经 scroll 事件检测后动画目标立即对齐实际位置，不与外部写入拉扯
- **嵌套滚动手势路由**（scroll-damping.js 的 `routeWheel`）：**一次滚动 = 一次
  手势**，从用户开始滚动（首个 wheel 事件）到**滚轮输入静止 0.3s** 为一个手势。
  这里的「静止」**只指滚轮静止**（0.3s 内没有新的 wheel 事件）——与页面是否静止、
  阻尼动画是否收敛、滚动量是否变化都无关：用户停手就算这次滚动结束，即使动画
  还在走、甚至已经到底。手势开始时**以光标所在处为起点**（wheel 事件沿冒泡链先
  到达最内层容器）沿父链选定「滚动归属层」——第一个当前方向还能滚的容器
  （已到边界的层被跳过）。手势期间增量只交给当前归属层，**手势内绝不换层**：
  该层在本方向上**到底**后仍继续滚，就转成过度滚动（见下）——**滚轮没停就不往
  外层跳**，免得多滚一下整块界面就跳到外层（在浮层面板里滚到列表尽头时也不会
  突然把外层顶走）。滚轮静止（手势结束）后手势重置，用户**再次滚动**才重新从
  光标处选层，已经到底的内层被跳过、自然交给外层。方向反转视为新手势，立即
  重新选层。同一原生事件在冒泡链路中经 `lastEvent` 去重，只判定一次归属；链路里
  已没有还能滚的容器、且页面（浏览器原生滚动链）也到底或不滚时，才轮到过滚
- **到底后的过滚回弹**：本层到底、滚轮却还在滚时，把「到底后被吞掉的滚轮位移」
  累积起来，按下式映射成**纯视觉位移**：

  ```
  位移 = -sign(累积输入) × ln(1 + |累积输入|)
  ```

  映射在 0 处连续、导数为 1：**触发过滚的那一下不会突然跳出一大段**（位移从 0
  连续长出，与正常滚动的位移尺度一致；系数只作为可调的全局标量，放大它同时也会
  放大起手那一下的跳变，故保持 1）。对数的增量随累积递减（输入 ×10，位移才多约
  2.3px），因此**越拉越紧**、不需要
  硬上限，体感上最后就是"拉不动了只剩张力"；位移写容器 `transform`，不动
  `scrollTop`、不影响布局，方向与正常滚动同向（向下滚时内容继续上移，
  `translateY` 为负，就像"再往下拽一点"）。**滚轮静止（手势结束）后按帧指数
  衰减（0.16/帧）回弹归零**并还原容器原有 transform；回弹期间按对数反函数同步
  累积量，途中的新输入从当前位移继续拉，不跳位。过滚期间反向滚：先把过滚位移
  抵消回 0，越过 0 的余量再滚内容（不丢增量、不跳位）
- **轴能力门控（非滚动方向一律不滚）**：每个阻尼控制器带轴能力（Box 的
  `moveX`/`moveY`：`false` 锁定、未声明视为可滚；`ViewScrollArea` 只沿 orientation
  方向）。非滚动方向的滚轮输入**既不滚内容、也不产生过滚位移、也不抢归属**——
  选层（`canConsume`）与兜底过滚目标都只在「允许该轴」的层里挑，落不到任何层
  就放行给外层/浏览器（不静默吞掉）。于是双轴锁定（`moveX(false).moveY(false)`）
  的容器（如 SplitCell）永远不会被滚轮拽出位移：它的分界线在覆盖层、不跟随内容
  层的 transform，一旦被拽就会与内容错位（"SplitCell 位置错乱"的根因）
- **端部判定与收敛兜底**：选层判「是否还能滚」用**实际滚动位置**，且距端部不足 1px
  即视为到底——引擎会把滚动偏移量化到整/半像素，钳制后的极限读数可能比
  `scrollHeight - clientHeight` 小 1px 以内，否则「已经到底」的层会被误判成还能滚、
  一直白吞增量（既不滚也不出过滚）。同理，末段阻尼插值写可能被引擎截断回原值
  （位置不再靠近目标），此时直接落到目标（目标本身是钳制后的合法值），仍到不了就
  把目标对齐实际位置并停止动画——否则 rAF 永远不收敛（表现为「到底了却不出过滚」）
- **过滚期间的浮动滚动条**：滚动条挂在容器的 **wrapper 内、容器外**（不能放在容器里：
  过滚写的 `transform` 会把容器变成其绝对定位后代的包含块，滚动条会在过滚那一下被
  重新定位到内容起点，肉眼即"滚动条消失/跳走"）。过滚位移经 `subscribeOverScroll`
  广播给滚动条：**滑块按位移缩短，过滚方向指向的那一端固定不动**（越过末端时
  末端贴住轨道末端、起点后移缩短量；越过起点时起点不动，末端前移）
  （内容每移 1px，滑块缩 `track/main` px，最多缩掉自身一半且不短于最小长度），
  回弹归零后长度与位置自动复原。滚动条不在容器内时，指针落在滚动条上的滚轮经
  `routeWheelEvent` 转发回容器，滚动语义与内容层一致

## 解耦边界

- 基础 Cell 之间、基础 Cell 与高级 Cell 之间唯一共享的是 core 基础设施与主题/i18n 资源标识
- 高级 Cell 依赖的是**实现组件接口**（Impl 的 props 契约），不是对方 Cell 的 Schema 或 Box 结构
- 实现注册表不感知 Theme；Theme 只持有实现名声明；解析在 Cell 视图层渲染时完成——主题切换经 ThemeProvider 触发改判，对页面作者透明

## 演进方向

- 二维坐标选择器：SliderTrackImpl 的正交组合（x/y 双轴，joycon 已示范）或专用 2D 拖拽面
- 运行时主题热切换下的实现替换动画与状态保持
- 自定义实现的 props 契约标准化（当前为 `{cell}` 全量开放，后续可收紧为 Schema 子集 + 受控回调）
