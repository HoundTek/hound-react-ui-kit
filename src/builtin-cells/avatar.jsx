/**
 * @file avatar.jsx —— AvatarCell（头像）预设
 *
 * 展示用户头像：src 非空时渲染图片，否则显示 name 首字符；
 * size 控制头像直径，shape 为圆形/方形，color 为无图片时的文字底色。
 * 展示型预设的典型实现：仅依赖 schema 字段，无插槽、无外部依赖，
 * 页面作者实例化后 setData 即可使用。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';

/**
 * 头像视图：订阅 name/src/size/shape/color，渲染图片或首字符头像。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function AvatarView({ cell }) {
  const name = useCellData(cell, 'name') || '';
  const src = useCellData(cell, 'src');
  const size = useCellData(cell, 'size');
  const shape = useCellData(cell, 'shape');
  const color = useCellData(cell, 'color');
  const radius = shape === 'square' ? 6 : '50%';
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {src ? (
        <img
          src={src}
          alt={name}
          style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: radius, backgroundColor: color,
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: Math.round(size * 0.42), fontWeight: 'bold', userSelect: 'none', flexShrink: 0,
        }}>
          {name.charAt(0)}
        </div>
      )}
    </div>
  );
}

/**
 * AvatarCell：头像。name 为用户名（取首字符），src 为图片地址（非空时优先渲染），
 * size/shape/color 控制外观。默认固定 48px 帧，内部头像可经 size 调整。
 */
class AvatarCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(48).defaultWidth(48).backgroundColor('#f5f5f5')
      .schema({
        name: { type: 'string', default: '' },
        src: { type: 'string', default: '' },
        size: { type: 'number', default: 40 },
        shape: { type: 'string', default: 'circle' },
        color: { type: 'string', default: '#4a90d9' },
      })
      .renderContent(AvatarView);
  }
}

export { AvatarCell };
