# Cell

Cell 是 UI-Kit 体系中组成页面的基本元素类。Box 提供底层布局能力，Cell 在其之上封装出可复用的组件——按钮、文本、输入框、图片、播放器等均为 Cell 的具体类型，每种类型对应一个 Cell 类。在实际页面编写中，全部使用 Cell，不直接使用 Box。

每个 Cell 提供两个核心部分：
- **Cell 前端**：基于 Box 构建的视觉表现层
- **Cell 数据树**：DataTree 中的数据子树

## DataTree

DataTree 是 UI-Kit 的数据存储结构，由**节点**组成。

### 节点

节点是 DataTree 的基本单元。一个节点可以同时持有数据和子节点——既是数据的存储位置，也是其他节点的容器。这统一了"文件"与"文件夹"的概念：任何节点都能存储数据，同时拥有子节点。

### 路径

路径用于在 DataTree 中定位节点，支持两种形式：
- **绝对路径**：以 `@/` 开头，从 DataTree 根节点起定位，如 `@/page/header/title`
- **相对路径**：以 `./` 或 `../` 开头，相对于当前节点定位

### 引用节点

引用节点是一种特殊节点，指向 DataTree 中的另一个节点，类似于文件系统中的软链接。引用节点的目标通过路径指定，具备以下特性：
- 支持跨分支引用
- 允许多级引用——引用节点可以指向另一个引用节点
- 循环引用不会破坏 DataTree 的结构完整性

## Cell 前端

Cell 前端是一个 Box，但在 Box 的布局能力之上增加了以下能力：
- 事件绑定
- 数据绑定
- 状态管理
- 插槽（Slot）

### 布局

Cell 通过内部持有的 Box 实例获得布局能力。Cell 类型在定义时确定其内部 Box 结构。Box 的全部布局 API 可通过 Cell 使用。

### 渲染

Cell 前端复用 Box 的三层渲染体系：内容层、边界层、节点层。Cell 类型可以自定义内容层的渲染逻辑。

### 事件绑定

Cell 前端可以绑定事件。事件源于用户交互（点击、输入等），通过事件系统在 Cell 间传递。

### 数据绑定

Cell 前端与 Cell 数据树之间建立绑定后，数据树中的值变更自动反映到前端，前端的交互也可以回写到数据树。绑定的建立方式见[路径与绑定](#路径与绑定)。

### 状态管理

Cell 的状态分为两类：
- **数据树状态**：存储在 Cell 数据树中，多挂载点间共享，可通过引用节点跨实例共享
- **UI 状态**：属于 Cell 实例自身，如 hover、focus、展开收起等临时状态，不进入数据树

## Cell 数据树

Cell 数据树是 Cell 在 DataTree 中拥有的子树。

### 数据 Schema

Cell 类型在定义时声明其数据 Schema，描述数据的字段、类型和默认值。实例化时按照 Schema 在 DataTree 中构造对应的子树。

### 数据操作

Cell 实例保留其数据树子树的根路径，用于后续的数据读写、订阅等操作。

## Slot

Slot 是 Cell 定义的嵌入位置，用于在 Cell 前端中嵌入其他 Cell。

### 类型

Slot 分为两种：
- **单插槽**：只接收一个 Cell
- **列表插槽**：接收一个有序的 Cell 列表，列表中的 Cell 在同一位置依次排列

一个 Cell 可以定义多个不同的 Slot。Slot 暂不进行类型约束。

### 定义方式

Slot 支持两种定义范式：
- **声明式**：在 Cell 类型定义时以配置方式声明
- **命令式**：在 Cell 实例化后通过方法调用添加

### 填充

Slot 在 Cell 实例化后填充。填充时将子 Cell 放入对应的 Slot，子 Cell 的数据树子树挂载到父 Cell 的数据树中。

## Cell 类型

Cell 是所有组件类型的总称。每种具体的组件类型对应一个 Cell 类，所有 Cell 类继承自 CellBase。

### 定义方式

Cell 类型支持两种定义方式：
- **继承式**：继承 CellBase，在构造函数中定义 Box 结构、数据 Schema、Slot 和渲染逻辑。适用于结构复杂的组件
- **配置式**：通过配置对象定义。适用于结构简单的组件

### 内部结构

Cell 类型在定义时确定其内部 Box 结构。不同 Cell 类型的内部结构不同——例如按钮可能是单个 Box，而表单可能是多层嵌套的 Box 树。

## Cell 实例

Cell 类型可以被实例化。每个实例拥有独立的数据树子树和状态。

### 实例化

实例化时按照数据 Schema 模板构造数据树子树，并挂载到整个 DataTree 中。实例保留其数据树子树的根路径，用于后续的数据操作。

### 多挂载

同一个 Cell 实例可以在页面的多个位置渲染，称为多挂载。所有挂载点共享同一份数据树和状态——任何一个挂载点的交互都会同步反映到其他挂载点。

### 数据共享

不同 Cell 实例可以通过引用节点共享同一数据。各实例拥有独立的 UI 状态，但数据读写指向同一棵数据子树，实现数据层面的同步。

## 路径与绑定

路径是 Cell 层封装的核心价值之一。Box 仅支持完整绝对路径；Cell 在此之上提供了以下机制，使数据访问更加智能。

### 相对路径

Cell 中的相对路径基于当前 Cell 在 DataTree 中的位置解析。以当前 Cell 的数据树子树根路径为基准，使用 `./`、`../` 定位节点。这使得 Cell 内部的路径引用不随 Cell 在树中位置的变化而失效。

### 命名引用

为 DataTree 中的节点设置命名锚点。命名锚点以 `@` 开头后接标识符，如 `@userProfile`。任何 Cell 均可通过命名锚点引用该节点，无需关心节点在树中的实际位置。通过命名锚点访问时，路径以锚点名起始，后接相对于该锚点的子路径，如 `@userProfile/name`。

命名锚点与绝对路径通过 `@` 后是否跟随 `/` 区分：`@/page/title` 为绝对路径，`@userProfile` 为命名锚点。

### 实例引用

通过 Cell 实例对象直接引用另一个 Cell 的数据。访问 `cellA.data` 即等同于访问 cellA 的数据树子树。

### 自动绑定

Cell 类型在定义时声明数据依赖。系统在实例化时自动建立绑定关系，无需手动指定路径。

# Box 浮动视口（FloatingViewport）

## 背景与动机

现有 Box 布局树以 viewport 为根，占满 100vw/100vh，所有内容以平铺方式排列。平铺布局适合文档/工作区型页面，但无法表达以下交互形态：

- 独立的悬浮窗口（可移动、可缩放，浮于页面之上）
- 通知 / 提示（短暂出现后自动消失）
- 弹出式菜单、下拉面板
- 模态对话框（遮罩 + 阻塞下层）

这些形态的共同点：内容**脱离平铺布局**，悬浮于页面上层，位置与尺寸**自由指定**。为此引入浮动视口（FloatingViewport）。

## 概念

- **viewport（主视口）**：页面主体布局的根，占满整个可视区域
- **floating-viewport（浮动视口）**：脱离主布局的独立视口，悬浮于页面上层；数量不限，彼此独立

浮动视口复用现有 Box 的全部机制：内部是一棵完整的 Box 布局树，支持嵌套、滚动、网格、拖拽调整尺寸与浮动滚动条；每个浮动视口是一棵独立的 reflow 树，其变化不影响主视口与其他浮动视口。

## 声明式 API

在 BoxBuilder 上新增链式方法：

| 方法 | 说明 |
|------|------|
| `floatingViewport()` | 标记为浮动视口（reflow 根；与 `viewport()` 互斥） |
| `posX(n)` | 距可视区域左边缘的位置（px） |
| `posY(n)` | 距可视区域上边缘的位置（px） |
| `zIndex(n)` | 浮动层级，默认高于主内容 |
| `modal()` | 标记为模态：FloatingLayer 统一绘制全屏遮罩 |
| 尺寸系列 | 沿用现有 `min/max/default/fixed`（Width/Height） |

示例：

```js
const win = new BoxBuilder('@float/win')
  .floatingViewport()
  .posX(120).posY(80)
  .fixedWidth(320).fixedHeight(240)
  .zIndex(100)
  .backgroundColor('#ffffff')
  .layout('vertical')
  .children([
    new BoxBuilder('@float/win/title')
      .fixedHeight(36).backgroundColor('#4a90d9'),
    new BoxBuilder('@float/win/body')
      .moveY(true).layout('vertical')
      .children([
        new BoxBuilder('@float/win/body/line1').fixedHeight(28),
        new BoxBuilder('@float/win/body/line2').fixedHeight(28),
      ]),
  ]);
```

同一页面可声明多个浮动视口，位置、尺寸、层级各自独立。

## 渲染

浮动视口由 **FloatingLayer** 统一承载渲染：

- FloatingLayer 是挂载于应用根部的容器组件，`position: fixed` 铺满可视区域，`pointer-events: none`
- FloatingLayer 容器持有高于平铺层拖拽手柄（zIndex 1000~1200）的 z-index（默认 2000），创建独立层叠上下文：平铺层的 Edge/Corner 手柄与浮动滚动条整体位于浮动层与遮罩之下
- 浮动视口注册到模块级浮动注册表；FloatingLayer 遍历注册表，将每个浮动视口渲染为独立层（`pointer-events: auto`，`position: fixed` + left/top/width/height/z-index）
- 模态遮罩由模态浮动视口（`modal()`）**自带**，遮罩层级 = 视口层级 - 1，可与各浮动视口同级参与层叠比较：挡住其下所有元素（含更低层级的浮动视口与主内容），且不遮挡本视口与更高层级的浮动视口
- **仅渲染最上方模态视口的遮罩**（层级最高者；层级相同时取注册表后者），避免多重遮罩叠加变暗；低层级模态视口由该遮罩统一遮挡
- 每个浮动视口内部仍是完整的三层渲染（ContentLayer / EdgeLayer / CornerLayer），拖拽调整尺寸、浮动滚动条等能力全部复用
- 浮动视口作为独立 reflow 根注册到 reflowScheduler

示意结构：

```
<FloatingLayer>                   // position: fixed, inset: 0, pointer-events: none, z-index: 2000
  <div mask="topModal"/>          // 仅最上方模态视口的遮罩，z-index = 视口层级 - 1
  <div float="modal1">            // 最上方模态视口：left/top/width/height/z-index, pointer-events: auto
    ContentLayer                  // 浮动视口内部布局树
    EdgeLayer / CornerLayer       // 拖拽分界线与角点
  </div>
  <div float="modal2"> ... </div> // 低层级模态视口（由上方遮罩统一遮挡，不再自带遮罩）
  <div float="win1"> ... </div>   // 非模态浮动视口
</FloatingLayer>
```

## 交互形态

基于浮动视口可实现：

| 形态 | 说明 | 本阶段范围 |
|------|------|-----------|
| 独立窗口 | 可移动、可缩放、可关闭 | Box 层提供浮动视口与内部尺寸拖拽；移动/关闭由 Cell 层封装 |
| 通知 | 屏幕角落短暂出现后自动消失 | Box 层提供浮动视口；定时与动画由 Cell 层封装 |
| 弹出菜单 | 点击触发、点外部关闭 | Box 层提供浮动视口；定位与关闭逻辑由 Cell 层封装 |
| 模态对话框 | 遮罩 + 阻塞下层 | 模态浮动视口自带遮罩（`modal()`） |

第一版聚焦 Box 层基础设施（声明、定位、渲染、独立 reflow）；完整交互能力在 Cell 层封装。

## 样式与主题系统（设计约束）

遮罩、Edge/Corner 拖拽手柄、浮动滚动条等**结构性样式不得硬编码散落在组件逻辑中**：当前阶段集中收敛为模块级样式常量（统一命名、统一维护），最终由独立的**主题系统**接管具体样式定义（颜色、尺寸、层级等），组件逻辑只依赖主题令牌（token）。本阶段仅落实"集中定义、不散落"的约束，主题系统作为后续演进。

## 与现有机制的关系

- **reflow 调度**：ReflowScheduler 以 Set 维护多个根节点，主视口与多个浮动视口可并存；浮动视口沿用 `_isViewport || !_parent → schedule` 的冒泡规则
- **尺寸计算**：`computeBuilderLayout` 中 viewport 强制 100vw/100vh；浮动视口走独立分支，取显式尺寸（fixed/default），未指定时由内部布局推断
- **层级关系**：浮动层容器 z-index 2000 高于平铺层全部元素（Edge/Corner 手柄 zIndex 1000~1200、浮动滚动条 1000），平铺层拖拽手柄完全位于浮动层与遮罩之下；浮动视口内部的滚动条与手柄相对关系保持不变

## 待定问题与演进路线

1. **窗口移动**：拖动标题栏移动整个浮动视口——由 Cell 层实现（标题栏 Cell 发起拖拽会话），Box 层第一版不提供
2. **主题系统**：遮罩、Edge/Corner、滚动条等结构性样式由主题系统接管（见"样式与主题系统"约束）
3. **生命周期**：浮动视口的动态创建 / 销毁、显示 / 隐藏，与 Cell 层浮层管理服务的对接
4. **定位模式**：第一版为固定屏幕坐标；后续可扩展"锚定到某元素 / 某 Box"的相对定位
