/**
 * @file login.jsx —— LoginCell（登录表单）预设
 *
 * 紧凑登录表单：用户名 + 密码输入与提交按钮，submitText 存 i18n key 或纯文本；
 * 点击提交写入 submitted(true) 并调用注入的 _onSubmit({username, password})
 * 回调（页面作者经 onSubmit 注入）。纯数据驱动，无内部状态。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor, useCornerType, useShapeRadius } from '../core/theme/theme-react';
import { cornerStyle } from '../core/theme/shape';

/**
 * 登录表单视图：订阅 username/password/submitText/submitted，
 * 提交时经 setSubmitted 写回并回调 _onSubmit。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function LoginView({ cell }) {
  const username = useCellData(cell, 'username');
  const password = useCellData(cell, 'password');
  const submitText = useText(useCellData(cell, 'submitText'));
  const corner = useCornerType();
  const controlR = useShapeRadius('control', 4);
  const inputBorder = useThemeColor('border', '#ccc');
  const inputBackground = useThemeColor('surface', '#ffffff');
  const inputText = useThemeColor('text', '#333333');
  const primaryColor = useThemeColor('primary', '#4a90d9');
  const onPrimaryColor = useThemeColor('on-primary', '#ffffff');
  const inputStyle = {
    width: '100%', height: 30, padding: '0 8px', boxSizing: 'border-box',
    border: `1px solid ${inputBorder}`, ...cornerStyle(corner, controlR), fontSize: 13,
    outline: 'none', backgroundColor: inputBackground, color: inputText,
  };
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', gap: 8, padding: '0 16px', boxSizing: 'border-box',
    }}>
      <input
        value={username}
        placeholder="用户名"
        onChange={(e) => cell.setUsername(e.target.value)}
        style={inputStyle}
      />
      <input
        type="password"
        value={password}
        placeholder="密码"
        onChange={(e) => cell.setPassword(e.target.value)}
        style={inputStyle}
      />
      <button
        type="button"
        onClick={() => {
          cell.setSubmitted(true);
          if (cell._onSubmit) cell._onSubmit({ username, password });
        }}
        style={{
          width: '100%', height: 32, border: 'none', ...cornerStyle(corner, controlR), cursor: 'pointer',
          backgroundColor: primaryColor, color: onPrimaryColor, fontSize: 13, fontWeight: 'bold',
        }}
      >
        {submitText}
      </button>
    </div>
  );
}

/**
 * LoginCell：登录表单。username/password 为输入值，submitText 为提交按钮文案
 * （i18n key 或纯文本）；点击提交写入 submitted(true)，页面作者可用
 * onSubmit(handler) 注入回调（handler({username, password})）。
 */
class LoginCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(170).color('surface').layout('vertical')
      .schema({
        username: { type: 'string', default: '' },
        password: { type: 'string', default: '' },
        submitText: { type: 'string', default: '登录' },
        submitted: { type: 'boolean', default: false },
      })
      .renderContent(LoginView);
  }

  /**
   * 注入提交回调：点击提交按钮时调用 handler({username, password})。
   * @param {(payload: {username: string, password: string}) => void} handler 提交回调
   * @returns {LoginCell} self（链式）
   */
  onSubmit(handler) {
    this._onSubmit = handler;
    return this;
  }
}

export { LoginCell };