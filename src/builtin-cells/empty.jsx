/**
 * @file empty.jsx —— EmptyCell（空状态）高级 Cell
 *
 * 展示族：空状态（见 docs/basic-cell-design.md）。
 * 双实现机制（kind: 'empty'）：组装 fallback（EmptyAssembledView）纵向居中
 * 渲染 glyph 占位图形、主文案与辅助说明；主题可经 theme.components.empty
 * 整体重写。
 *
 * Schema（数据契约，与旧版一致）：glyph / text / desc。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor } from '../core/theme/theme-react';

/**
 * 空状态组装视图（fallback）：订阅 glyph/text/desc，纵向居中渲染。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function EmptyAssembledView({ cell }) {
  const glyph = useCellData(cell, 'glyph');
  const text = useText(useCellData(cell, 'text'));
  const desc = useText(useCellData(cell, 'desc'));
  const surface = useThemeColor('surface', '#ffffff');
  const glyphColor = useThemeColor('text-muted', '#bbb');
  const textColor = useThemeColor('text-secondary', '#666');
  const descColor = useThemeColor('text-muted', '#999');
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 6, width: '100%', height: '100%', backgroundColor: surface,
      padding: 8, boxSizing: 'border-box', textAlign: 'center',
    }}>
      <div style={{ fontSize: 32, lineHeight: 1, color: glyphColor, userSelect: 'none' }}>{glyph}</div>
      {text ? <div style={{ fontSize: 14, color: textColor }}>{text}</div> : null}
      {desc ? <div style={{ fontSize: 12, color: descColor }}>{desc}</div> : null}
    </div>
  );
}

/** kind 'empty' 的实现分发视图 */
const EmptyDispatcher = createImplDispatcher('empty', EmptyAssembledView);

/**
 * EmptyCell：空状态（高级 Cell，展示族）。glyph 为占位图形，text 为主文案，
 * desc 为辅助说明（text/desc 存 i18n key 或纯文本），纵向居中展示。
 * 呈现实现由 kind 'empty' 分发。
 */
class EmptyCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.defaultHeight(140).moveY(true).color('surface')
      .schema({
        glyph: { type: 'string', default: '□' },
        text: { type: 'string', default: '' },
        desc: { type: 'string', default: '' },
      })
      .renderContent(EmptyDispatcher);
  }
}

export { EmptyCell, EmptyAssembledView };
