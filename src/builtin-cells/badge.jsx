/**
 * @file badge.jsx —— BadgeCell（徽标）预设
 *
 * 展示小徽标：dot 模式仅显示红点；text 非空时显示文字徽标；
 * 否则显示数字徽标（count 超过 max 时显示 `${max}+`）。
 * visible 控制整体显隐。常与其他 Cell 并列填充于容器行中。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 徽标视图：按 dot/text/count 三种模式渲染；visible 为 false 时不渲染。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element|null} 视图元素
 */
function BadgeView({ cell }) {
  const visible = useCellData(cell, 'visible');
  const dot = useCellData(cell, 'dot');
  const text = useText(useCellData(cell, 'text'));
  const count = useCellData(cell, 'count');
  const max = useCellData(cell, 'max');
  const color = useCellData(cell, 'color');
  if (!visible) return null;
  let content = text;
  if (!content && !dot) content = count > max ? `${max}+` : String(count);
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {dot ? (
        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />
      ) : (
        <div style={{
          minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9,
          backgroundColor: color, color: '#fff', fontSize: 11,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 'bold', lineHeight: 1, whiteSpace: 'nowrap',
        }}>
          {content}
        </div>
      )}
    </div>
  );
}

/**
 * BadgeCell：徽标。dot 模式显示圆点；text 存 i18n key 或纯文本（非空优先）；
 * 否则 count 显示数字（超过 max 显示 max+）。visible 为显隐开关。
 */
class BadgeCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedWidth(28).fixedHeight(28)
      .schema({
        visible: { type: 'boolean', default: true },
        dot: { type: 'boolean', default: false },
        text: { type: 'string', default: '' },
        count: { type: 'number', default: 0 },
        max: { type: 'number', default: 99 },
        color: { type: 'string', default: '#e05555' },
      })
      .renderContent(BadgeView);
  }
}

export { BadgeCell };
