/**
 * @file Cell 演示页。展示 Cell 的使用模式与 Phase 2/3 特性。
 *
 *        使用模式（简化版）：
 *        1) 类型作者继承 CellBaseBuilder，构造函数中配置 Box、Schema、Slot、内容组件
 *        2) 页面作者用 fill 内联实例化 Cell（fill 返回 this，可链式嵌套）
 *        3) 根 Cell 调用 mount(dag._root) 自动级联挂载全树，再 react() 渲染
 *        4) 跨 Cell 引用用 cell.find(path) 按路径访问（如 @userProfile 锚点）
 *
 *        Phase 2 演示点（路径与绑定）：
 *        - 命名锚点：ProfileCell setAnchor('userProfile')
 *        - 自动绑定：BoundTitleCell bind: '@userProfile#name'
 *        - 引用节点：RefDemoCell createRefChild 指向 @userProfile
 *        - 实例引用：InstanceRefCell 用 cell.find('@userProfile') 按路径访问
 *
 *        Phase 3 演示点（多 Slot + 多挂载）：
 *        - 多 Slot：PanelCell defineSlot('header', {single:true}) + defineSlot('body')
 *        - 多挂载：profile 变量 fill 到 header（mount 0）+ sidebar（mount 1）
 *        - showChildOverlays：body 插槽隐藏子项拖拽手柄
 */
import React from 'react';
import { CellBaseBuilder, DataDag, useCellData, useNodeData } from '../core/ui-kit';

// =========================================================================
//  内容组件
// =========================================================================

function LogoView({ cell }) {
  const text = useCellData(cell, 'text');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100%', height: '100%',
      color: '#fff', fontWeight: 'bold', fontSize: 18, letterSpacing: 2,
    }}>
      {text}
    </div>
  );
}

function NavView({ cell }) {
  const items = useCellData(cell, 'items') || [];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '0 16px', width: '100%', height: '100%',
      color: '#fff', fontSize: 14,
    }}>
      {items.map((it, i) => (
        <span key={i} style={{ cursor: 'pointer', opacity: 0.85 }}>{it}</span>
      ))}
    </div>
  );
}

function MenuView({ cell }) {
  const title = useCellData(cell, 'title');
  const active = useCellData(cell, 'active');
  return (
    <div
      onClick={() => cell.setActive(!active)}
      style={{
        display: 'flex', alignItems: 'center', padding: '0 16px',
        width: '100%', height: '100%',
        color: active ? '#fff' : '#333',
        backgroundColor: active ? '#357abd' : 'transparent',
        cursor: 'pointer', userSelect: 'none',
      }}
    >
      {title}
    </div>
  );
}

function TitleView({ cell }) {
  const text = useCellData(cell, 'text');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '0 16px',
      width: '100%', height: '100%', color: '#7a5a3a', fontSize: 16, fontWeight: 'bold',
    }}>
      {text}
    </div>
  );
}

function CardView({ cell }) {
  const title = useCellData(cell, 'title');
  const count = useCellData(cell, 'count');
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'flex-start', padding: 12, width: '100%', height: '100%',
      color: '#5a3a1a',
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13 }}>点击次数：{count}</div>
      <button
        onClick={() => cell.setCount(count + 1)}
        style={{ marginTop: 8, padding: '4px 10px', cursor: 'pointer' }}
      >
        +1
      </button>
    </div>
  );
}

function FooterView({ cell }) {
  const text = useCellData(cell, 'text');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100%', height: '100%', color: '#aaa', fontSize: 12,
    }}>
      {text}
    </div>
  );
}

function ProfileView({ cell }) {
  const name = useCellData(cell, 'name');
  const role = useCellData(cell, 'role');
  const names = ['访客', 'Alice', 'Bob', 'Charlie'];
  const roles = ['guest', 'admin', 'editor', 'viewer'];
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'center', width: '100%', height: '100%',
      color: '#fff', fontSize: 12, gap: 2,
    }}>
      <div style={{ fontWeight: 'bold' }}>{name}</div>
      <div style={{ fontSize: 10, opacity: 0.7 }}>{role}</div>
      <button
        onClick={() => {
          const idx = (names.indexOf(name) + 1) % names.length;
          cell.setName(names[idx]);
          cell.setRole(roles[idx]);
        }}
        style={{ marginTop: 2, padding: '2px 6px', fontSize: 10, cursor: 'pointer', border: 'none', borderRadius: 3 }}
      >
        切换
      </button>
    </div>
  );
}

function BoundTitleView({ cell }) {
  const text = useCellData(cell, 'text');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '0 16px',
      width: '100%', height: '100%',
      color: '#1a5a3a', fontSize: 14, fontWeight: 'bold', backgroundColor: '#e8f5e8',
    }}>
      绑定字段 → {text}
    </div>
  );
}

function RefDemoView({ cell }) {
  const refNode = cell.data.getChild('profileRef');
  const name = useNodeData(refNode, 'name');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '0 12px',
      width: '100%', height: '100%',
      color: '#4a2a6a', fontSize: 12, backgroundColor: '#f0e8f5',
    }}>
      引用节点 → {name}
    </div>
  );
}

/** InstanceRefView：通过 cell.find('@userProfile') 按路径访问 ProfileCell */
function InstanceRefView({ cell }) {
  const profileCell = cell.find('@userProfile');
  const role = useNodeData(profileCell ? profileCell.data : null, 'role');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '0 16px',
      width: '100%', height: '100%',
      color: '#2a4a6a', fontSize: 13, fontWeight: 'bold', backgroundColor: '#e8f0f5',
    }}>
      实例引用 → 角色：{role}
    </div>
  );
}

// =========================================================================
//  Cell 类型
// =========================================================================

class PageCell extends CellBaseBuilder {
  constructor(id) {
    super(id);
    this.layout('vertical').moveY(false).moveX(false).viewport();
  }
}

class HeaderCell extends CellBaseBuilder {
  constructor(id) {
    super(id);
    this.fixedHeight(60).backgroundColor('#4a90d9')
      .moveY(false).moveX(false).layout('horizontal');
  }
}

class SidebarCell extends CellBaseBuilder {
  constructor(id) {
    super(id);
    this.fixedWidth(200).backgroundColor('#e0e0e0')
      .moveY(false).moveX(false).layout('vertical');
  }
}

/** PanelCell：多 Slot 演示，header（单插槽）+ body（列表插槽，隐藏子项拖拽手柄） */
class PanelCell extends CellBaseBuilder {
  constructor(id) {
    super(id);
    this.layout('vertical').minWidth(300).backgroundColor('#ffffff')
      .moveY(false).moveX(false)
      .defineSlot('header', { fixedHeight: 40, backgroundColor: '#ffe4c4', single: true })
      .defineSlot('body', { minHeight: 100, moveY: true, layout: 'vertical', backgroundColor: '#fff', showChildOverlays: false });
  }
}

class ContentAreaCell extends CellBaseBuilder {
  constructor(id) {
    super(id);
    this.minHeight(200).backgroundColor('#f0f0f0')
      .moveY(false).moveX(false).layout('horizontal');
  }
}

class LogoCell extends CellBaseBuilder {
  constructor(id) {
    super(id);
    this.fixedWidth(120).backgroundColor('#357abd')
      .schema({ text: { type: 'string', default: 'HOUND' } })
      .renderContent(LogoView);
  }
}

class NavCell extends CellBaseBuilder {
  constructor(id) {
    super(id);
    this.minWidth(200).defaultWidth(400).backgroundColor('#5aa0e9')
      .schema({ items: { type: 'array', default: ['首页', '文档', '示例', '关于'] } })
      .renderContent(NavView);
  }
}

/** ProfileCell：命名锚点 @userProfile，多挂载共享数据 */
class ProfileCell extends CellBaseBuilder {
  constructor(id) {
    super(id);
    this.fixedWidth(100).minHeight(60).backgroundColor('#357abd')
      .schema({
        name: { type: 'string', default: '访客' },
        role: { type: 'string', default: 'guest' },
      })
      .setAnchor('userProfile')
      .renderContent(ProfileView);
  }
}

/** MenuItemCell：实例 title 通过链式 setData 设置 */
class MenuItemCell extends CellBaseBuilder {
  constructor(id) {
    super(id);
    this.fixedHeight(50).backgroundColor('#d8d8d8')
      .schema({
        title: { type: 'string', default: '菜单项' },
        active: { type: 'boolean', default: false },
      })
      .renderContent(MenuView);
  }
}

/** TitleCell：实例 text 通过链式 setData 设置 */
class TitleCell extends CellBaseBuilder {
  constructor(id) {
    super(id);
    this.fixedHeight(40).backgroundColor('#ffe4c4')
      .schema({ text: { type: 'string', default: '标题' } })
      .renderContent(TitleView);
  }
}

/** BoundTitleCell：自动绑定 @userProfile#name */
class BoundTitleCell extends CellBaseBuilder {
  constructor(id) {
    super(id);
    this.fixedHeight(40)
      .schema({ text: { type: 'string', bind: '@userProfile#name' } })
      .renderContent(BoundTitleView);
  }
}

/** RefDemoCell：引用节点指向 @userProfile */
class RefDemoCell extends CellBaseBuilder {
  constructor(id) {
    super(id);
    this.fixedHeight(40)
      .createRefChild('profileRef', '@userProfile')
      .renderContent(RefDemoView);
  }
}

/** InstanceRefCell：通过路径访问 @userProfile，无需构造参数 */
class InstanceRefCell extends CellBaseBuilder {
  constructor(id) {
    super(id);
    this.fixedHeight(40).renderContent(InstanceRefView);
  }
}

/** CardCell：实例 title 通过链式 setData 设置 */
class CardCell extends CellBaseBuilder {
  constructor(id) {
    super(id);
    this.minWidth(150).defaultWidth(200).maxWidth(300).backgroundColor('#ffdab9')
      .schema({
        title: { type: 'string', default: '卡片' },
        count: { type: 'number', default: 0 },
      })
      .renderContent(CardView);
  }
}

class FooterCell extends CellBaseBuilder {
  constructor(id) {
    super(id);
    this.fixedHeight(60).backgroundColor('#333333')
      .schema({ text: { type: 'string', default: '© 2026 Hound UI Kit' } })
      .renderContent(FooterView);
  }
}

// =========================================================================
//  页面装配：fill 内联实例化，mount 自动挂载全树
// =========================================================================

function buildCellDemo() {
  const dag = new DataDag();

  // profile 需要多挂载（header + sidebar），保留变量
  const profile = new ProfileCell('profile');

  // fill 内联实例化：fill 返回 this，可链式嵌套构造整棵树
  // 实例数据通过链式 setXxx 设置（schema 自动生成 setter，setData 作为底层通用方法保留）
  const page = new PageCell('cell-demo').fill('_default', [
    new HeaderCell('header').fill('_default', [
      new LogoCell('logo'),
      new NavCell('nav'),
      profile,  // mount 0
    ]),
    new ContentAreaCell('content').fill('_default', [
      new SidebarCell('sidebar').fill('_default', [
        new MenuItemCell('menu1').setTitle('仪表盘'),
        new MenuItemCell('menu2').setTitle('项目列表'),
        new MenuItemCell('menu3').setTitle('设置'),
        profile,  // mount 1（多挂载，共享同一 DataNode）
        new RefDemoCell('refDemo'),
      ]),
      new PanelCell('main')
        .fill('header', new TitleCell('title').setText('工作台'))
        .fill('body', [
          new BoundTitleCell('boundTitle'),
          new InstanceRefCell('instanceRef'),  // 路径访问，无需 profileCell 参数
          new CardCell('card1').setTitle('待办事项'),
          new CardCell('card2').setTitle('消息中心'),
          new CardCell('card3').setTitle('统计概览'),
        ]),
    ]),
    new FooterCell('footer'),
  ]);

  // 一次性挂载全树（根据 slot 关系自动级联）
  page.mount(dag._root);

  // 渲染
  return page.react();
}

// 模块加载时构建一次 Cell 树，避免 StrictMode 双调用导致重复构造
const _demoElement = buildCellDemo();

const CellDemoPage = () => _demoElement;

export default CellDemoPage;
