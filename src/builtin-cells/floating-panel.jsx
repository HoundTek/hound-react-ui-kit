/**
 * @file floating-panel.jsx —— FloatingPanelCell（浮动面板）预设
 *
 * 浮动面板：窗口变体 'panel'（见 FloatingWindowCellBase#windowVariant）——
 * 可移动、可缩放（最小 240×140）、主色标题栏 36 高（chrome：标题 + 最小化 +
 * 关闭）、不可操作（无遮罩，不阻塞主内容）。标题栏由 chrome 统一渲染并作为
 * 拖拽点，内容一律是 body 插槽。
 *
 * 用法：
 *   new FloatingPanelCell('panel').setTitle('属性面板')
 *     .fill('body', [内容 Cell...])
 */
import { FloatingWindowCellBase } from '../core/builtin-cells/builtin-cells';

/**
 * FloatingPanelCell：浮动面板（窗口变体 'panel'）。title 为标题（i18n key 或
 * 纯文本），body 为内容插槽（最小高 80、可纵向滚动）。默认下限 240×140，
 * 可拖动标题栏移动、拖四边/四角缩放。
 *
 * Schema（数据契约）：title / maximized / minimized。
 */
class FloatingPanelCell extends FloatingWindowCellBase {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.minWidth(240).minHeight(140).defaultWidth(280).defaultHeight(180)
      .schema({
        title: { type: 'string', default: '' },
        maximized: { type: 'boolean', default: false },
        minimized: { type: 'boolean', default: false },
      })
      .windowVariant('panel');
  }
}

export { FloatingPanelCell };
