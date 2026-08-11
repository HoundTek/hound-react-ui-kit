/**
 * @file profile.jsx —— ProfileCell（用户信息卡）预设
 *
 * 横向用户信息卡：左侧圆形头像（name 首字符，直径 44，color 为底色），
 * 右侧姓名（加粗）/角色（灰）/描述（小字）。name/role/description
 * 存 i18n key 或纯文本。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 用户信息视图：订阅 name/role/description/color，渲染头像与文本。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ProfileView({ cell }) {
  const name = useText(useCellData(cell, 'name'));
  const role = useText(useCellData(cell, 'role'));
  const description = useText(useCellData(cell, 'description'));
  const color = useCellData(cell, 'color');
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px' }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        backgroundColor: color, color: '#fff', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 'bold',
        userSelect: 'none',
      }}>{name.charAt(0)}</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden' }}>
        <div style={{ fontSize: 14, fontWeight: 'bold', color: '#333' }}>{name}</div>
        {role ? <div style={{ fontSize: 12, color: '#888' }}>{role}</div> : null}
        {description ? <div style={{ fontSize: 11, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{description}</div> : null}
      </div>
    </div>
  );
}

/**
 * ProfileCell：用户信息卡。name/role/description 存 i18n key 或纯文本，
 * color 为头像底色（默认主色）。固定高 88、白底横向布局。
 */
class ProfileCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(88).backgroundColor('#ffffff')
      .schema({
        name: { type: 'string', default: '' },
        role: { type: 'string', default: '' },
        description: { type: 'string', default: '' },
        color: { type: 'string', default: '#4a90d9' },
      })
      .renderContent(ProfileView);
  }
}

export { ProfileCell };