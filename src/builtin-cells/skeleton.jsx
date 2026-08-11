/**
 * @file skeleton.jsx —— SkeletonCell（骨架屏）预设
 *
 * 加载占位骨架：type 决定占位块形态（line 横条/block 方块/circle 正圆），
 * height 为占位块尺寸基准（px）。视图用 Web Animations API 做透明度脉动
 * （opacity 1 ↔ 0.4 交替），cleanup 中 cancel 动画，避免卸载后动画泄漏。
 */
import React, { useEffect, useRef } from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';

/**
 * 骨架视图：订阅 type/height，渲染灰色占位块并播放脉动动画。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function SkeletonView({ cell }) {
  const type = useCellData(cell, 'type');
  const height = useCellData(cell, 'height');
  const ref = useRef(null);
  useEffect(() => {
    const animation = ref.current.animate(
      [{ opacity: 1 }, { opacity: 0.4 }],
      { duration: 900, direction: 'alternate', iterations: Infinity }
    );
    return () => animation.cancel();
  }, []);
  const isCircle = type === 'circle';
  const isBlock = type === 'block';
  const blockStyle = isCircle
    ? { width: height, height, borderRadius: '50%' }
    : isBlock
      ? { width: height * 4, height: height * 4, borderRadius: 4 }
      : { width: '80%', height, borderRadius: 4 };
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div ref={ref} style={{ backgroundColor: '#e8e8e8', flexShrink: 0, ...blockStyle }} />
    </div>
  );
}

/**
 * SkeletonCell：骨架屏。type 为占位块形态（line 横条/block 方块/circle 正圆，
 * 默认 line），height 为尺寸基准（默认 16px；line 高 height、宽最多占帧 80%，
 * block 宽高均为 height*4，circle 宽高均为 height）。带 Web Animations 脉动动画。
 */
class SkeletonCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(32).backgroundColor('#ffffff')
      .schema({
        type: { type: 'string', default: 'line' },
        height: { type: 'number', default: 16 },
      })
      .renderContent(SkeletonView);
  }
}

export { SkeletonCell };
