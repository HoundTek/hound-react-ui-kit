/**
 * @file result.jsx —— ResultCell（结果页）高级 Cell
 *
 * 展示族：结果页（见 docs/basic-cell-design.md）。
 * 双实现机制（kind: 'result'）：组装 fallback（ResultAssembledView）按 status
 * 渲染大图标与文案；主题可经 theme.components.result 整体重写。
 *
 * Schema（数据契约，与旧版一致）：status / title / desc。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor } from '../core/theme/theme-react';
import { GlyphCheck, GlyphClose, GlyphInfo, GlyphWarning } from '../basic-cells/glyphs';

/**
 * 结果组装视图（fallback）：订阅 status/title/desc，按状态渲染大图标与文案。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ResultAssembledView({ cell }) {
  const status = useCellData(cell, 'status');
  const title = useText(useCellData(cell, 'title'));
  const desc = useText(useCellData(cell, 'desc'));
  const success = useThemeColor('success', '#1a8a4a');
  const danger = useThemeColor('danger', '#c03a2a');
  const warning = useThemeColor('warning', '#c07a1a');
  const primary = useThemeColor('primary', '#4a90d9');
  const titleColor = useThemeColor('text', '#333');
  const descColor = useThemeColor('text-muted', '#999');
  const statusMap = {
    success: { color: success, Glyph: GlyphCheck },
    error: { color: danger, Glyph: GlyphClose },
    warning: { color: warning, Glyph: GlyphWarning },
    info: { color: primary, Glyph: GlyphInfo },
  };
  const s = statusMap[status] || statusMap.info;
  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 16px',
    }}>
      <div style={{ fontSize: 48, lineHeight: 1, color: s.color, userSelect: 'none', display: 'flex' }}>
        <s.Glyph size={44} />
      </div>
      {title ? <div style={{ fontSize: 16, fontWeight: 'bold', color: titleColor }}>{title}</div> : null}
      {desc ? <div style={{ fontSize: 13, color: descColor, textAlign: 'center' }}>{desc}</div> : null}
    </div>
  );
}

/** kind 'result' 的实现分发视图 */
const ResultDispatcher = createImplDispatcher('result', ResultAssembledView);

/**
 * ResultCell：结果页（高级 Cell，展示族）。status 为 success/error/warning/info
 * （默认 info），title/desc 存 i18n key 或纯文本。默认高 160，居中展示图标与
 * 文案。呈现实现由 kind 'result' 分发。
 */
class ResultCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.defaultHeight(160).color('surface')
      .schema({
        status: { type: 'string', default: 'info' },
        title: { type: 'string', default: '' },
        desc: { type: 'string', default: '' },
      })
      .renderContent(ResultDispatcher);
  }
}

export { ResultCell, ResultAssembledView };
