/**
 * @file profile.jsx —— ProfileCell（用户信息卡）高级 Cell
 *
 * 展示族：用户信息卡（见 docs/basic-cell-design.md）。
 * 双实现机制（kind: 'profile'）：组装 fallback（ProfileAssembledView）横向排布
 * 左侧圆形头像（name 首字符，主题色 div，紧凑场景不套 TextImpl）与右侧
 * 姓名/角色/描述；主题可经 theme.components.profile 整体重写。
 *
 * Schema（数据契约，与旧版一致）：name / role / description / color。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor, useCornerType } from '../core/theme/theme-react';
import { cornerStyle, CAPSULE_RADIUS } from '../core/theme/shape';

/**
 * 用户信息组装视图（fallback）：订阅 name/role/description/color，渲染头像与文本。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ProfileAssembledView({ cell }) {
  const name = useText(useCellData(cell, 'name'));
  const role = useText(useCellData(cell, 'role'));
  const description = useText(useCellData(cell, 'description'));
  const color = useCellData(cell, 'color');
  const corner = useCornerType();
  const onPrimaryColor = useThemeColor('on-primary', '#fff');
  const nameColor = useThemeColor('text', '#333');
  const roleColor = useThemeColor('text-muted', '#888');
  const descriptionColor = useThemeColor('text-muted', '#aaa');
  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px',
    }}>
      <div style={{
        width: 44, height: 44, ...cornerStyle(corner, CAPSULE_RADIUS), flexShrink: 0,
        backgroundColor: color, color: onPrimaryColor, display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 'bold',
        userSelect: 'none',
      }}>{name.charAt(0)}</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden' }}>
        <div style={{ fontSize: 14, fontWeight: 'bold', color: nameColor }}>{name}</div>
        {role ? <div style={{ fontSize: 12, color: roleColor }}>{role}</div> : null}
        {description ? <div style={{ fontSize: 11, color: descriptionColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{description}</div> : null}
      </div>
    </div>
  );
}

/** kind 'profile' 的实现分发视图 */
const ProfileDispatcher = createImplDispatcher('profile', ProfileAssembledView);

/**
 * ProfileCell：用户信息卡（高级 Cell，展示族）。name/role/description 存 i18n
 * key 或纯文本，color 为头像底色（默认主色）。固定高 88、白底横向布局。
 * 呈现实现由 kind 'profile' 分发。
 */
class ProfileCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(88).color('surface')
      .schema({
        name: { type: 'string', default: '' },
        role: { type: 'string', default: '' },
        description: { type: 'string', default: '' },
        color: { type: 'string', default: '#4a90d9' },
      })
      .renderContent(ProfileDispatcher);
  }
}

export { ProfileCell, ProfileAssembledView };
