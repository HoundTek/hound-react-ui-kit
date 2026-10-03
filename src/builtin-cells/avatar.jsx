/**
 * @file avatar.jsx —— AvatarCell（头像）高级 Cell
 *
 * 展示族：头像（见 docs/basic-cell-design.md）。
 * 双实现机制（kind: 'avatar'）：组装 fallback（AvatarAssembledView）在 src
 * 非空时渲染图片，否则渲染 name 首字符（主题色 div，紧凑场景不套 TextImpl）；
 * 主题可经 theme.components.avatar 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：name / src / size / shape / color。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useThemeColor, useCornerType, useShapeRadius } from '../core/theme/theme-react';
import { cornerStyle, CAPSULE_RADIUS } from '../core/theme/shape';

/**
 * 头像组装视图（fallback）：订阅 name/src/size/shape/color，渲染图片或首字符头像。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function AvatarAssembledView({ cell }) {
  const name = useCellData(cell, 'name') || '';
  const src = useCellData(cell, 'src');
  const size = useCellData(cell, 'size');
  const shape = useCellData(cell, 'shape');
  const color = useCellData(cell, 'color');
  const corner = useCornerType();
  const overlayR = useShapeRadius('overlay', 6);
  const onPrimary = useThemeColor('on-primary', '#fff');
  const radiusStyle = shape === 'square' ? cornerStyle(corner, overlayR) : cornerStyle(corner, CAPSULE_RADIUS);
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {src ? (
        <img
          src={src}
          alt={name}
          style={{ width: size, height: size, ...radiusStyle, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: size, height: size, ...radiusStyle, backgroundColor: color,
          color: onPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: Math.round(size * 0.42), fontWeight: 'bold', userSelect: 'none', flexShrink: 0,
        }}>
          {name.charAt(0)}
        </div>
      )}
    </div>
  );
}

/** kind 'avatar' 的实现分发视图 */
const AvatarDispatcher = createImplDispatcher('avatar', AvatarAssembledView);

/**
 * AvatarCell：头像（高级 Cell，展示族）。name 为用户名（取首字符），src 为图片
 * 地址（非空时优先渲染），size/shape/color 控制外观。默认固定 48px 帧，内部
 * 头像可经 size 调整。呈现实现由 kind 'avatar' 分发。
 */
class AvatarCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(48).defaultWidth(48).color('surface-muted')
      .schema({
        name: { type: 'string', default: '' },
        src: { type: 'string', default: '' },
        size: { type: 'number', default: 40 },
        shape: { type: 'string', default: 'circle' },
        color: { type: 'string', default: '#4a90d9' },
      })
      .renderContent(AvatarDispatcher);
  }
}

export { AvatarCell, AvatarAssembledView };
