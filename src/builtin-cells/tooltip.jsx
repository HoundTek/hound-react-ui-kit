/**
 * @file tooltip.jsx —— TooltipCell（提示气泡）高级 Cell
 *
 * 浮层族：深色提示气泡（反色面配色）：text 存 i18n key 或纯文本，
 * 底部小三角指向目标。默认固定宽 140、高度内容撑开（不设 defaultHeight），
 * 不可移动/缩放；位置由页面作者用 posX/posY 指定。
 * 主题可经 theme.components.tooltip 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：text。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor, useCornerType, useShapeRadius } from '../core/theme/theme-react';
import { cornerStyle } from '../core/theme/shape';

/**
 * 气泡组装视图（fallback）：订阅 text，渲染深色气泡（反色面）与底部小三角。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TooltipAssembledView({ cell }) {
  const text = useText(useCellData(cell, 'text'));
  const bubbleBg = useThemeColor('inverse-surface', '#333');
  const bubbleFg = useThemeColor('inverse-on-surface', '#fff');
  const corner = useCornerType();
  const overlayR = useShapeRadius('overlay', 6);
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{
        backgroundColor: bubbleBg, color: bubbleFg, fontSize: 12, lineHeight: 1.5,
        padding: '8px 12px', ...cornerStyle(corner, overlayR), textAlign: 'center',
      }}>
        {text}
      </div>
      <div style={{
        position: 'absolute', bottom: -4, left: '50%', marginLeft: -4,
        width: 8, height: 8, backgroundColor: bubbleBg, transform: 'rotate(45deg)',
      }} />
    </div>
  );
}

/** kind 'tooltip' 的实现分发视图 */
const TooltipDispatcher = createImplDispatcher('tooltip', TooltipAssembledView);

/**
 * TooltipCell：提示气泡（高级 Cell，浮层族，浮动视口）。text 存 i18n key 或纯文本；
 * 默认固定宽 140、高度内容撑开，不可移动/缩放；位置由页面作者用 posX/posY 指定。
 * 呈现实现由 kind 'tooltip' 分发（缺省为组装版）。
 */
class TooltipCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.floatingViewport()
      .movable(false).resizable(false)
      .defaultWidth(140)
      .schema({
        text: { type: 'string', default: '' },
      })
      .renderContent(TooltipDispatcher);
  }
}

export { TooltipCell, TooltipAssembledView };
