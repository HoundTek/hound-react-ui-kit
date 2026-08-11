/**
 * @file title.jsx —— TitleCell（标题）预设
 *
 * 展示标题文本：text 存 i18n key 或纯文本，size/color/align 控制排版。
 * 与 TextCell 的区别：默认加粗、字号更大，用于区块/面板标题。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 标题视图：订阅 text/size/color/align，居中排布并支持省略号截断。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TitleView({ cell }) {
  const text = useText(useCellData(cell, 'text'));
  const size = useCellData(cell, 'size');
  const color = useCellData(cell, 'color');
  const align = useCellData(cell, 'align');
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: { left: 'flex-start', center: 'center', right: 'flex-end' }[align] || 'flex-start',
      padding: '0 12px', width: '100%', height: '100%',
      fontSize: size, color, fontWeight: 'bold',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    }}>
      {text}
    </div>
  );
}

/**
 * TitleCell：标题。text 存 i18n key 或纯文本，size/color/align 控制排版。
 */
class TitleCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40).backgroundColor('#ffffff')
      .schema({
        text: { type: 'string', default: '' },
        size: { type: 'number', default: 16 },
        color: { type: 'string', default: '#333333' },
        align: { type: 'string', default: 'left' },
      })
      .renderContent(TitleView);
  }
}

export { TitleCell };
