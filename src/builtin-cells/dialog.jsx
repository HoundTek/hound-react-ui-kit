/**
 * @file dialog.jsx —— DialogCell（对话框容器）预设
 *
 * 浮动对话框：窗口变体 'dialog'（见 FloatingWindowCellBase#windowVariant）——
 * 可移动、不可缩放、浅灰标题栏 40 高（chrome：标题 + 最小化 + 关闭）、
 * 可操作遮罩。标题栏由 chrome 统一渲染（与 WindowCell / ModalCell 同一套控件），
 * 不再是各写各的页眉；内容一律是 body 插槽。
 *
 * 用法：
 *   new DialogCell('dlg').setTitle('操作确认')
 *     .fill('body', [内容 Cell, 按钮 Cell])
 *   // 需要自定义标题栏时用 fill('header', ...) 整体替换 chrome（单插槽覆盖）
 *
 * 标题栏即窗口拖拽点（dragHandle），无需页面作者再配置。
 */
import { FloatingWindowCellBase } from '../core/builtin-cells/builtin-cells';

/**
 * DialogCell：对话框（窗口变体 'dialog'）。title 为标题（i18n key 或纯文本），
 * body 为内容插槽（最小高 100、可纵向滚动）。位置/尺寸可用 posX/posY/fixedWidth
 * 等链式覆盖。
 *
 * Schema（数据契约）：title / maximized / minimized。
 */
class DialogCell extends FloatingWindowCellBase {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedWidth(320).fixedHeight(200)
      .schema({
        title: { type: 'string', default: '' },
        maximized: { type: 'boolean', default: false },
        minimized: { type: 'boolean', default: false },
      })
      .windowVariant('dialog');
  }
}

export { DialogCell };
