/**
 * @file carousel.jsx —— CarouselCell（轮播）预设
 *
 * 轮播切换：items 为 [{id, text}]，currentIndex 为当前项；左右 ‹ › 循环切换，
 * 底部圆点指示器点击跳转（当前项高亮主色）。items 为空时显示占位文本。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

const ARROW_STYLE = {
  width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 16, color: '#4a90d9', cursor: 'pointer', userSelect: 'none', flexShrink: 0,
};

/**
 * 轮播视图：订阅 items/currentIndex，渲染当前项文本、切换按钮与圆点指示器。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function CarouselView({ cell }) {
  const items = useCellData(cell, 'items') || [];
  const currentIndex = useCellData(cell, 'currentIndex');
  const count = items.length;
  const index = count ? ((currentIndex % count) + count) % count : 0;
  const current = count ? items[index] : null;
  const text = useText(current ? current.text : '');
  const prev = () => { if (count) cell.setCurrentIndex((index - 1 + count) % count); };
  const next = () => { if (count) cell.setCurrentIndex((index + 1) % count); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: '#ffffff' }}>
      <div style={{ display: 'flex', alignItems: 'center', height: 60, padding: '0 4px' }}>
        <span onClick={prev} style={ARROW_STYLE}>‹</span>
        <div style={{
          flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, color: '#333', textAlign: 'center', padding: '0 4px',
        }}>
          {count ? text : '暂无内容'}
        </div>
        <span onClick={next} style={ARROW_STYLE}>›</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, height: 20, flexShrink: 0 }}>
        {items.map((item, idx) => (
          <div
            key={item.id || idx}
            onClick={() => cell.setCurrentIndex(idx)}
            style={{
              width: 6, height: 6, borderRadius: 3, cursor: 'pointer',
              backgroundColor: idx === index ? '#4a90d9' : '#d9d9d9',
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * CarouselCell：轮播。items 为 [{id, text}]（text 可存 i18n key 或纯文本），
 * currentIndex 为当前项；‹ › 循环切换，底部圆点点击跳转（当前项高亮主色）。
 */
class CarouselCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(80).backgroundColor('#ffffff')
      .schema({
        items: { type: 'array', default: [] },
        currentIndex: { type: 'number', default: 0 },
      })
      .renderContent(CarouselView);
  }
}

export { CarouselCell };