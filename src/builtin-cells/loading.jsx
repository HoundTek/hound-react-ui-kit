/**
 * @file loading.jsx —— LoadingCell（加载中）预设
 *
 * 加载指示器：text（i18n key 或纯文本，默认“加载中…”）与边框 spinner 并排展示；
 * size 控制 spinner 直径（small 16 / default 22 / large 30），color 为 spinner 主色。
 * 视图内注入 <style> 定义 @keyframes hound-spin 旋转动画。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

const SIZE_MAP = { small: 16, default: 22, large: 30 };

/**
 * 加载视图：订阅 text/size/color，渲染旋转 spinner 与文本。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function LoadingView({ cell }) {
  const text = useText(useCellData(cell, 'text'));
  const size = useCellData(cell, 'size');
  const color = useCellData(cell, 'color');
  const px = SIZE_MAP[size] || SIZE_MAP.default;
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: 10,
    }}>
      <style>{`@keyframes hound-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: px, height: px, flexShrink: 0, borderRadius: '50%',
        border: '3px solid transparent', borderTopColor: color,
        animation: 'hound-spin 0.8s linear infinite',
      }} />
      {text ? <span style={{ fontSize: 13, color: '#666666' }}>{text}</span> : null}
    </div>
  );
}

/**
 * LoadingCell：加载中。text 存 i18n key 或纯文本；size 为 small/default/large；
 * color 为 spinner 主色。默认固定高度 40，spinner 与文本水平居中。
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
      .renderContent(LoadingView);
  }
}

export { LoadingCell };
