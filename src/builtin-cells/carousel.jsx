/**
 * @file carousel.jsx —— CarouselCell（轮播）高级 Cell
 *
 * 按钮族：轮播 = 切换按钮 + 指示点 + 文本（见 docs/basic-cell-design.md）。
 * 组装 fallback：ButtonImpl 左右箭头循环切换 + TextImpl 当前项文本 +
 * 底部圆点指示器（点击跳转，当前项高亮主色，胶囊圆角随主题圆角类型）。
 * items 为空时显示占位文本。主题可经 theme.components.carousel 整体重写。
 *
 * Schema（数据契约，与旧版一致）：items / currentIndex。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useThemeColor, useCornerType } from '../core/theme/theme-react';
import { cornerStyle, CAPSULE_RADIUS } from '../core/theme/shape';
import { ButtonImpl, TextImpl } from '../basic-cells';
import { GlyphChevron } from '../basic-cells/glyphs';

/**
 * 轮播组装视图（fallback）：左右箭头切换 + 当前项文本 + 圆点指示器。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function CarouselAssembledView({ cell }) {
  const items = useCellData(cell, 'items') || [];
  const currentIndex = useCellData(cell, 'currentIndex');
  const count = items.length;
  const index = count ? ((currentIndex % count) + count) % count : 0;
  const current = count ? items[index] : null;
  const corner = useCornerType();
  const surfaceColor = useThemeColor('surface', '#ffffff');
  const primaryColor = useThemeColor('primary', '#4a90d9');
  const dotMutedColor = useThemeColor('border', '#d9d9d9');
  const prev = () => { if (count) cell.setCurrentIndex((index - 1 + count) % count); };
  const next = () => { if (count) cell.setCurrentIndex((index + 1) % count); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: surfaceColor }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 60, padding: '0 4px' }}>
        <ButtonImpl label="" icon={<GlyphChevron dir="left" size={12} />} type="default" size="small" onPress={prev} />
        <div style={{ flex: 1, minWidth: 0, height: '100%' }}>
          <TextImpl text={current ? current.text : '暂无内容'} size={13} align="center" color="text" />
        </div>
        <ButtonImpl label="" icon={<GlyphChevron dir="right" size={12} />} type="default" size="small" onPress={next} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, height: 20, flexShrink: 0 }}>
        {items.map((item, idx) => (
          <div
            key={item.id || idx}
            onClick={() => cell.setCurrentIndex(idx)}
            style={{
              width: 6, height: 6, cursor: 'pointer',
              ...cornerStyle(corner, CAPSULE_RADIUS),
              backgroundColor: idx === index ? primaryColor : dotMutedColor,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** kind 'carousel' 的实现分发视图 */
const CarouselDispatcher = createImplDispatcher('carousel', CarouselAssembledView);

/**
 * CarouselCell：轮播（高级 Cell，按钮族）。items 为 [{id, text}]（text 可存
 * i18n key 或纯文本），currentIndex 为当前项；左右箭头循环切换，底部圆点点击
 * 跳转（当前项高亮主色）。呈现实现由 kind 'carousel' 分发（缺省为按钮组装版）。
 */
class CarouselCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(80).color('surface')
      .schema({
        items: { type: 'array', default: [] },
        currentIndex: { type: 'number', default: 0 },
      })
      .renderContent(CarouselDispatcher);
  }
}

export { CarouselCell, CarouselAssembledView };
