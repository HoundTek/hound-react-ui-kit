/**
 * @file drawer.jsx —— DrawerCell（抽屉）高级 Cell
 *
 * 浮层族：侧滑抽屉容器（浮动视口）：固定宽 280、不可移动/缩放、白色底、纵向排列。
 * title 为抽屉标题（加粗，底边线分隔），text 为正文（pre-wrap，可滚动），
 * 均存 i18n key 或纯文本。主题可经 theme.components.drawer 整体重写呈现实现。
 * 位置由页面作者用 posX/posY 指定（如贴屏幕右缘），内容不足时按 minHeight 撑开。
 *
 * Schema（数据契约，与旧版一致）：title / text。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor } from '../core/theme/theme-react';

/**
 * 抽屉组装视图（fallback）：订阅 title/text，渲染标题栏与可滚动正文区。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function DrawerAssembledView({ cell }) {
  const title = useText(useCellData(cell, 'title'));
  const text = useText(useCellData(cell, 'text'));
  const surface = useThemeColor('surface', '#ffffff');
  const titleColor = useThemeColor('text', '#333');
  const borderColor = useThemeColor('border', '#e8e8e8');
  const bodyColor = useThemeColor('text', '#444');
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
      backgroundColor: surface, overflow: 'hidden',
    }}>
      <div style={{
        fontWeight: 'bold', fontSize: 14, color: titleColor, padding: '0 12px',
        height: 44, lineHeight: '44px', borderBottom: `1px solid ${borderColor}`,
        boxSizing: 'border-box', flexShrink: 0,
      }}>
        {title}
      </div>
      <div style={{
        flex: 1, overflow: 'auto', padding: '0 12px 12px', fontSize: 13,
        color: bodyColor, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {text}
      </div>
    </div>
  );
}

/** kind 'drawer' 的实现分发视图 */
const DrawerDispatcher = createImplDispatcher('drawer', DrawerAssembledView);

/**
 * DrawerCell：抽屉（高级 Cell，浮层族，浮动视口）。title 为标题，text 为正文
 *（pre-wrap），均为 i18n key 或纯文本。浮动视口固定宽 280，
 * 位置由页面作者用 posX/posY 指定（如贴屏幕右缘）。
 * 呈现实现由 kind 'drawer' 分发（缺省为组装版）。
 */
class DrawerCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.floatingViewport().movable(false).resizable(false)
      .fixedWidth(280).minHeight(320).color('surface').layout('vertical')
      .schema({
        title: { type: 'string', default: '' },
        text: { type: 'string', default: '' },
      })
      .renderContent(DrawerDispatcher);
  }
}

export { DrawerCell, DrawerAssembledView };
