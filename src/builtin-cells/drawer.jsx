/**
 * @file drawer.jsx —— DrawerCell（抽屉）预设
 *
 * 侧滑抽屉容器（浮动视口）：固定宽 280、不可移动/缩放、白色底、纵向排列。
 * title 为抽屉标题（加粗，底边线分隔），text 为正文（pre-wrap，可滚动），
 * 均存 i18n key 或纯文本。
 * 位置由页面作者用 posX/posY 指定（如贴屏幕右缘），内容不足时按 minHeight 撑开。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 抽屉视图：订阅 title/text，渲染标题栏与可滚动正文区。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function DrawerView({ cell }) {
  const title = useText(useCellData(cell, 'title'));
  const text = useText(useCellData(cell, 'text'));
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
      backgroundColor: '#ffffff', overflow: 'hidden',
    }}>
      <div style={{
        fontWeight: 'bold', fontSize: 14, color: '#333', padding: '0 12px',
        height: 44, lineHeight: '44px', borderBottom: '1px solid #e8e8e8', flexShrink: 0,
      }}>
        {title}
      </div>
      <div style={{
        flex: 1, overflow: 'auto', padding: '0 12px 12px', fontSize: 13,
        color: '#444', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {text}
      </div>
    </div>
  );
}

/**
 * DrawerCell：抽屉。title 为标题，text 为正文（pre-wrap），均为 i18n key 或纯文本。
 * 浮动视口固定宽 280，位置由页面作者用 posX/posY 指定（如贴屏幕右缘）。
 */
class DrawerCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.floatingViewport().movable(false).resizable(false)
      .fixedWidth(280).minHeight(320).backgroundColor('#ffffff').layout('vertical')
      .schema({
        title: { type: 'string', default: '' },
        text: { type: 'string', default: '' },
      })
      .renderContent(DrawerView);
  }
}

export { DrawerCell };
