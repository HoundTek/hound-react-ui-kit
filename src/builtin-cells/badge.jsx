/**
 * @file badge.jsx —— BadgeCell（徽标）高级 Cell
 *
 * 展示族：徽标（见 docs/basic-cell-design.md）。
 * 双实现机制（kind: 'badge'）：组装 fallback（BadgeAssembledView）按
 * dot/text/count 三种模式渲染；主题可经 theme.components.badge 整体重写。
 *
 * Schema（数据契约，与旧版一致）：visible / dot / text / count / max / color。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor, useCornerType } from '../core/theme/theme-react';
import { cornerStyle, CAPSULE_RADIUS } from '../core/theme/shape';

/**
 * 徽标组装视图（fallback）：按 dot/text/count 三种模式渲染；visible 为 false 时不渲染。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element|null} 视图元素
 */
function BadgeAssembledView({ cell }) {
  const visible = useCellData(cell, 'visible');
  const dot = useCellData(cell, 'dot');
  const text = useText(useCellData(cell, 'text'));
  const count = useCellData(cell, 'count');
  const max = useCellData(cell, 'max');
  const color = useCellData(cell, 'color');
  const corner = useCornerType();
  const onPrimary = useThemeColor('on-primary', '#fff');
  if (!visible) return null;
  let content = text;
  if (!content && !dot) content = count > max ? `${max}+` : String(count);
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {dot ? (
        <div style={{ width: 8, height: 8, ...cornerStyle(corner, CAPSULE_RADIUS), backgroundColor: color }} />
      ) : (
        <div style={{
          minWidth: 18, height: 18, padding: '0 5px', ...cornerStyle(corner, CAPSULE_RADIUS),
          backgroundColor: color, color: onPrimary, fontSize: 11,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 'bold', lineHeight: 1, whiteSpace: 'nowrap',
        }}>
          {content}
        </div>
      )}
    </div>
  );
}

/** kind 'badge' 的实现分发视图 */
const BadgeDispatcher = createImplDispatcher('badge', BadgeAssembledView);

/**
 * BadgeCell：徽标（高级 Cell，展示族）。dot 模式显示圆点；text 存 i18n key 或
 * 纯文本（非空优先）；否则 count 显示数字（超过 max 显示 max+）。visible 为
 * 显隐开关。呈现实现由 kind 'badge' 分发。
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
      .renderContent(BadgeDispatcher);
  }
}

export { BadgeCell, BadgeAssembledView };
