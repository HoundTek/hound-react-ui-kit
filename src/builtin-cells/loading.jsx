/**
 * @file loading.jsx —— LoadingCell（加载中）高级 Cell
 *
 * 展示族：加载指示器（见 docs/basic-cell-design.md）。
 * 双实现机制（kind: 'loading'）：组装 fallback（LoadingAssembledView）渲染
 * 边框 spinner（视图内注入 <style> 定义 @keyframes hound-spin 旋转动画）与
 * 文本；主题可经 theme.components.loading 整体重写。
 *
 * Schema（数据契约，与旧版一致）：text / size / color。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor, useCornerType } from '../core/theme/theme-react';
import { cornerStyle, CAPSULE_RADIUS } from '../core/theme/shape';

const SIZE_MAP = { small: 16, default: 22, large: 30 };

/**
 * 加载组装视图（fallback）：订阅 text/size/color，渲染旋转 spinner 与文本。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function LoadingAssembledView({ cell }) {
  const text = useText(useCellData(cell, 'text'));
  const size = useCellData(cell, 'size');
  const color = useCellData(cell, 'color');
  const px = SIZE_MAP[size] || SIZE_MAP.default;
  const corner = useCornerType();
  const textColor = useThemeColor('text-secondary', '#666666');
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: 10,
    }}>
      <style>{`@keyframes hound-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: px, height: px, flexShrink: 0, boxSizing: 'border-box',
        ...cornerStyle(corner, CAPSULE_RADIUS),
        border: '3px solid transparent', borderTopColor: color,
        animation: 'hound-spin 0.8s linear infinite',
      }} />
      {text ? <span style={{ fontSize: 13, color: textColor }}>{text}</span> : null}
    </div>
  );
}

/** kind 'loading' 的实现分发视图 */
const LoadingDispatcher = createImplDispatcher('loading', LoadingAssembledView);

/**
 * LoadingCell：加载中（高级 Cell，展示族）。text 存 i18n key 或纯文本；size 为
 * small/default/large（spinner 直径 16/22/30）；color 为 spinner 主色。默认
 * 固定高度 40，spinner 与文本水平居中。呈现实现由 kind 'loading' 分发。
 */
class LoadingCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40)
      .schema({
        text: { type: 'string', default: '加载中…' },
        size: { type: 'string', default: 'default' },
        color: { type: 'string', default: '#4a90d9' },
      })
      .renderContent(LoadingDispatcher);
  }
}

export { LoadingCell, LoadingAssembledView };
