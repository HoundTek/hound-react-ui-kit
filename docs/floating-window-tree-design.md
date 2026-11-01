# 层叠窗口设计：父子窗口树模型

## 1. 背景与动机

早期浮动视口（FloatingViewport）的层级管理采用**扁平两段式**模型：

- 所有浮动视口维护在一个有序数组 `_floatingList` 中（尾部 = 最近出现/聚焦）
- 渲染时"非模态在前、模态在后"，zIndex 按渲染序号递增
- 仅最上方模态视口绘制一个全屏遮罩，遮罩层级 = 该视口层级 - 1

该模型存在三个结构性缺口：

1. **无父子关系**。`modal()` 仅打标记，无法表达"从哪个窗口弹出"，多个模态之间只能按出现顺序压栈。
2. **遮罩误伤父窗口**。遮罩 `zIndex - 1` 会连同模态的父窗口一起遮住，父窗口想操作却点不到。
3. **语义割裂**。"模态/非模态"是两套行为，实际需求是**树状的层级关系**：子窗口相对父窗口而言天然具有层级性。

## 2. 核心模型：父子窗口树

**没有"模态窗口/非模态窗口"之分，统一以父窗口、子窗口相称。** 全部浮动窗口构成一棵树，根是页面主视口（非浮动 viewport，全局唯一）：

```
MainViewport（唯一根，非浮动）
 ├── @float/win                  ← 根级浮动窗口
 │    └── @float/modal-A         ← 子窗口，父 = @float/win
 │         └── @float/modal-B    ← 子窗口，父 = @float/modal-A
 └── @float/complex              ← 根级浮动窗口
```

- 每个浮动窗口有且仅有一个父窗口（一个浮动窗口，或根 viewport）。
- 子窗口在层叠上恒高于其父窗口及其祖先链。
- 未声明父窗口的浮动窗口直接挂在根 viewport 之下（根级窗口）。

## 3. 可操作窗口（operable）与遮罩

**遮罩完全由"可操作窗口"决定**，聚焦（点击）、打开/关闭子窗口均不改变遮罩。

### 3.1 定义

- 模块级维护一个**可操作窗口集合** `_operableWindows`，默认仅含根 viewport。
- 通过 API 显式设定：`setOperable(builder)` 加入集合、`clearOperable(builder)` 移除。
- 集合中**最靠近叶子**（树深度最大）的**可见**浮动窗口为**有效可操作窗口**；若集合中无可用的浮动窗口，有效可操作窗口退化为根 viewport。

### 3.2 遮罩规则

- 有效可操作窗口 = 根 viewport → **无遮罩**（默认态，全部窗口自由可交互）。
- 有效可操作窗口 = 某个浮动窗口 W → 出现**单一全屏遮罩**，仅放行：
  - W 本身，以及
  - W 的全部后代（子窗口链）
- 其余一切（W 的父窗口、兄弟窗口、其他分支、页面主视口）全部被遮罩挡住。

遮罩语义精确对应需求："只允许一个窗口及其子窗口链可操作"。

## 4. 渲染序与 zIndex（正确性关键）

```
渲染序 = 浮动窗口树的深度优先先序遍历，
         但把"有效可操作窗口的子树"整体提升到序列末尾。
zIndex  = 2001 起按渲染序步进 2 分配（2001, 2003, ...）。
```

- 先序遍历保证任一子树在序列中占据**连续区间**。
- 可操作子树被提升到末尾后，独占**全局最高的连续 z 区间**。
- zIndex 步进 2（窗口占奇数位）使遮罩可落于偶数位，与任何窗口都不平局。

于是单一遮罩即可精确分层：

```
遮罩 z = 可操作子树的第一个成员（即可操作窗口自身）的 zIndex - 1   （偶数位）
```

该值恰好严格大于所有非可操作窗口的 z、严格小于可操作子树全部成员的 z——既压住所有非可操作窗口，又完全不挡可操作子窗口链。旧模型中"遮罩 = 模态层级 - 1"误伤父窗口的问题被从结构上消除。

## 5. 聚焦与关闭语义

| 事件 | 树操作 | 遮罩 |
|---|---|---|
| 打开子窗口 M（父 = P） | 挂到 P 的 children 末尾（出现居上） | 不变 |
| 聚焦（点击）窗口 X | X 移到其父的 children 末尾（同层居上，后聚焦居上） | 不变 |
| 关闭窗口 X | **级联递归关闭 X 的全部子窗口** | 不变 |
| 显式 `setOperable(W)` | 加入可操作集合 | 立即按 W 计算 |
| 显式 `clearOperable(W)` | 移出可操作集合 | 立即重新计算 |

- 关闭级联保证树恒为合法结构，不产生孤儿节点。
- 有效可操作窗口被关闭（不可见）后自动退化为集合中下一个最深的可见窗口；若没有，回退为根 viewport（遮罩消失）。
- 焦点窗口 = 渲染序最顶的窗口（后聚焦/出现居上 + 可操作子树提升的终点）。焦点态仅影响视觉：窗口框架（边框 + 阴影，主题 `materials.windowFrame`：`{borderColor, borderWidth, elevation, focusedBorderColor, focusedElevation}`）对焦点窗口取 `focused*` 值，与非焦点窗口区分；框架画在窗口定位容器上（border-box，不占三层内容布局尺寸），圆角与包壳形状规范对齐。

## 6. API 一览

### Box 层

```js
// 声明子窗口（父窗口为浮动窗口或 null=根 viewport）
win.child(parent);                     // 本窗口成为 parent 的子窗口
win.child(null);                       // 提升为根级窗口

// 可操作窗口（遮罩唯一来源）
setOperable(win);                      // 加入可操作集合
clearOperable(win);                    // 移出可操作集合
win.operable();                        // 等价 setOperable(win)，链式便捷形式
```

### Cell 层

```js
const modal = new ModalCell('modal');
modal.setParent(windowCell);           // 声明父 Cell（解析为其主挂载 Box，父 Cell 须先挂载）
windowCell.operable();                  // 加入可操作集合（等价 Box 层 setOperable(win)），遮罩按需启用
```

用户可见的 API 面只有 Cell：主窗口（页面根 Cell）与伪窗口（浮动视口 Cell）
一致经 Cell 层 API 构建，Box 层 API 由 Cell 基类委托、不直接暴露
（演示见 playground/demo/preset-demo-page.jsx 的「浮层与弹窗」分区）。

### 窗口控件结构（chrome）与样式控制

WindowCell/ModalCell 的标题栏插槽内建窗口控件结构（chrome）：标题文本 +
最小化/最大化/关闭控件（ModalCell 仅关闭）。窗口状态走 schema 数据驱动，
chrome 控件点击写入 schema，视图 effect 对齐 Box 层窗口状态：

```js
new WindowCell('win')
  .setTitle('窗口')            // chrome 标题（schema title，i18n key 或纯文本）
  .windowControls({ minimize: true, maximize: true, close: true })  // 控件显隐
  .titleBarColor('primary')    // 标题栏底色（颜色角色名或字面色值）
  .titleBarHeight(36)          // 标题栏高度（兼作最小化卷起保留高度）
  .titleColor('on-primary');   // 标题与控件颜色（默认 theme.elements.window.titleColor）
win.setMaximized(true);        // 最大化铺满可视区域 / 还原（数据驱动，chrome 联动）
win.setMinimized(true);        // 最小化（卷起为标题栏）/ 还原
win.fill('title', [...]);      // 单插槽覆盖：整体替换默认 chrome（自绘标题栏，
                               // 关闭按钮可经 CloseButtonCell 自行嵌入）
```

## 7. 与旧模型的对照

| 旧模型 | 新模型 |
|---|---|
| 扁平有序数组 `_floatingList` | 树 `_floatingTree`（父 → 有序 children 列表） |
| `modal()` 打标记 | `child(parent)` 建立父子链接 |
| 非模态先、模态后 | 树先序遍历（子恒在父之上） |
| 仅最上模态有遮罩 | 单一遮罩，由可操作窗口决定，放行其子树 |
| 遮罩 = 模态 z - 1（误伤父窗口） | 遮罩 = 可操作子树最低 z - 1（不挡子树） |
| 聚焦 = 移到扁平数组末尾 | 聚焦 = 移到父的 children 末尾 |
| 关闭仅隐藏自身 | 关闭级联递归隐藏全部子窗口 |
