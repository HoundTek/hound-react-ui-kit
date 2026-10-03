/**
 * @file popover.jsx —— PopoverCell（气泡提示）高级 Cell
 *
 * 浮层族：气泡提示 = 白底圆角卡片，title 加粗 + text 常规。
 * title/text 存 i18n key 或纯文本；位置由页面作者用 posX/posY 指定，
 * 不可移动、不可缩放。主题可经 theme.components.popover 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：title / text。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor, useCornerType, useShapeRadius } from '../core/theme/theme-react';
import { cornerStyle } from '../core/theme/shape';

/**
 * 气泡组装视图（fallback）：订阅 title/text，title 为空时不渲染标题行。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function PopoverAssembledView({ cell }) {
  const title = useText(useCellData(cell, 'title'));
  const text = useText(useCellData(cell, 'text'));
  const surface = useThemeColor('surface', '#ffffff');
  const titleColor = useThemeColor('text', '#333');
  const textColor = useThemeColor('text-secondary', '#666');
  const corner = useCornerType();
  const overlayR = useShapeRadius('overlay', 8);
  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box', padding: 12,
      display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden',
      backgroundColor: surface, ...cornerStyle(corner, overlayR), boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    }}>
      {title ? <div style={{ fontSize: 14, fontWeight: 'bold', color: titleColor }}>{title}</div> : null}
      {text ? <div style={{ fontSize: 13, color: textColor, lineHeight: 1.5 }}>{text}</div> : null}
    </div>
  );
}

/** kind 'popover' 的实现分发视图 */
const PopoverDispatcher = createImplDispatcher('popover', PopoverAssembledView);

/**
 * PopoverCell：气泡提示（高级 Cell，浮层族，浮动视口）。白底圆角、投影；
 * title 加粗、text 常规。默认 180px 宽、64px 高，不可移动/缩放；
 * 位置由页面作者用 posX/posY 指定。
 * 呈现实现由 kind 'popover' 分发（缺省为组装版）。
 */
class PopoverCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.floatingViewport()
      .movable(false).resizable(false)
      .defaultWidth(180).defaultHeight(64)
      .styleRole('overlay')
      .schema({
        title: { type: 'string', default: '' },
        text: { type: 'string', default: '' },
      })
      .renderContent(PopoverDispatcher);
  }
}

export { PopoverCell, PopoverAssembledView };
