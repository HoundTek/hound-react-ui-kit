# Hound React UI Kit 设计文档

本目录集中存放项目的设计文档。源码中引用设计文档时统一使用 `docs/xxx.md` 路径。

## 文档索引

- [ui-kit-design-document.md](./ui-kit-design-document.md) — UI-Kit 总体设计：Cell 体系（Schema / Slot / 多挂载 / 路径与绑定）、DataTree（节点 / 路径 / 引用节点）、浮动视口（FloatingViewport）声明式 API 与渲染机制、内置 Cell 预设
- [floating-window-tree-design.md](./floating-window-tree-design.md) — 层叠窗口设计：父子窗口树模型、可操作窗口与遮罩语义（从扁平两段式模型演进而来）
- [theme-i18n-design.md](./theme-i18n-design.md) — 主题与国际化：资源引用模型、静态资源层 / 动态属性层、特效合成、尺寸变化特效（stretch / blur）、注入与响应机制
- [theme-shape-design.md](./theme-shape-design.md) — 形状与普适样式：包裹层模型与层间关系（inset / radius / 同心规则）、圆角类型（G1 / G2 曲率平滑及 CSS 降级路径）、胶囊 / 圆形基础形状、材质 / 颜色 / 不透明度普适配置、主题自主实现
- [box-reflow-math.md](./box-reflow-math.md) — Box 主轴 reflow 的数学模型：带箱型约束的凸二次规划与 λ 二分求解（对应 `src/core/box/box.jsx` 的 `_calculateLayout`）

## 阅读顺序建议

1. `ui-kit-design-document.md` 建立整体概念（Box / Cell / DataTree / Slot）
2. `floating-window-tree-design.md` 深入浮动窗口层级模型
3. `theme-i18n-design.md` 理解与 Cell/Box 平行的横切资源系统
4. `theme-shape-design.md` 主题系统在形状与普适样式上的细化
5. `box-reflow-math.md` 需要理解布局求解细节时阅读
