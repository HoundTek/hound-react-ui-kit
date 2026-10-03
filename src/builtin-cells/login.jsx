/**
 * @file login.jsx —— LoginCell（登录表单）高级 Cell
 *
 * 输入族：紧凑登录表单 = 文本输入 ×2（密码框 type='password'）+ 提交按钮
 *（见 docs/basic-cell-design.md）。组装 fallback（LoginAssembledView）：
 * InputImpl ×2 + ButtonImpl 提交，点击写入 submitted(true) 并回调
 * cell._onSubmit({username, password})。主题可经 theme.components.login
 * 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：username / password / submitText / submitted。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { InputImpl, ButtonImpl } from '../basic-cells';

/**
 * 登录表单组装视图（fallback）：订阅 username/password/submitText/submitted，
 * 提交时经 setSubmitted 写回并回调 _onSubmit。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function LoginAssembledView({ cell }) {
  const username = useCellData(cell, 'username');
  const password = useCellData(cell, 'password');
  const submitText = useCellData(cell, 'submitText');
  const submit = () => {
    cell.setSubmitted(true);
    if (cell._onSubmit) cell._onSubmit({ username, password });
  };
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', gap: 8, padding: '0 16px', boxSizing: 'border-box',
    }}>
      <div style={{ height: 30, flexShrink: 0 }}>
        <InputImpl
          value={username}
          placeholder="用户名"
          fontSize={13}
          onChange={v => cell.setUsername(v)}
        />
      </div>
      <div style={{ height: 30, flexShrink: 0 }}>
        <InputImpl
          type="password"
          value={password}
          placeholder="密码"
          fontSize={13}
          onChange={v => cell.setPassword(v)}
          onSubmit={submit}
        />
      </div>
      <ButtonImpl label={submitText} block onPress={submit} />
    </div>
  );
}

/** kind 'login' 的实现分发视图 */
const LoginDispatcher = createImplDispatcher('login', LoginAssembledView);

/**
 * LoginCell：登录表单（高级 Cell，输入族）。username/password 为输入值，
 * submitText 为提交按钮文案（i18n key 或纯文本）；点击提交写入
 * submitted(true)，页面作者可用 onSubmit(handler) 注入回调
 *（handler({username, password})）。
 * 呈现实现由 kind 'login' 分发（缺省为组装 fallback）。
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
      .renderContent(LoginDispatcher);
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

export { LoginCell, LoginAssembledView };
