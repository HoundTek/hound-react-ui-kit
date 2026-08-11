/**
 * @file tag.jsx —— TagCell（标签）预设
 *
 * 展示小标签：text 存 i18n key 或纯文本，color 为主题色（自动派生浅底与边框），
 * size 控制尺寸档位，closable 时右侧渲染 ✕（点击置 visible=false 隐藏）。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 标签视图：订阅 text/color/size/closable/visible；closable 时点击 ✕ 隐藏。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element|null} 视图元素
 */
function TagView({ cell }) {
  const visible = useCellData(cell, 'visible');
  const text = useText(useCellData(cell, 'text'));
  const closable = useCellData(cell, 'closable');
  const color = useCellData(cell, 'color');
  const size = useCellData(cell, 'size');
  if (!visible) return null;
  const sizeMap = {
    small: { fontSize: 10, height: 18, padding: '0 6px' },
    default: { fontSize: 12, height: 22, padding: '0 8px' },
    large: { fontSize: 14, height: 30, padding: '0 12px' },
  };
  const s = sizeMap[size] || sizeMap.default;
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, height: s.height, padding: s.padding,
        borderRadius: 4, fontSize: s.fontSize, lineHeight: 1,
        backgroundColor: `${color}1f`, color, border: `1px solid ${color}55`,
        userSelect: 'none', whiteSpace: 'nowrap',
      }}>
        {text}
        {closable ? (
          <span
            onClick={() => cell.setVisible(false)}
            style={{ cursor: 'pointer', opacity: 0.7, padding: '0 2px' }}
          >
            ✕
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * TagCell：标签。text 存 i18n key 或纯文本；size 为 small/default/large；
 * closable 开启时显示 ✕，点击隐藏（visible=false）。
 */
class TagCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(28)
      .schema({
        visible: { type: 'boolean', default: true },
        text: { type: 'string', default: '' },
        color: { type: 'string', default: '#4a90d9' },
        size: { type: 'string', default: 'default' },
        closable: { type: 'boolean', default: false },
      })
      .renderContent(TagView);
  }
}

export { TagCell };
