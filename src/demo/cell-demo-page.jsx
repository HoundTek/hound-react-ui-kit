/**
 * @file Cell 演示页。基于 CellBaseBuilder 与 DataDag 构建一棵 Cell 树，
 *        演示 page / header / content / sidebar / footer 等区域装配。
 * @deprecated 当前导入的 `../core/cell/cell-base` 与 `../core/data-dag/data-dag` 模块
 *             尚未实现，该文件暂不可运行，仅作 Cell API 形态示意。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { DataDag } from '../core/data-dag/data-dag';

/**
 * 页面级 Cell：纵向布局，双轴锁定
 * @extends CellBaseBuilder
 */
class PageCellBuilder extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   * @param {Object} parentNode 父 DAG 节点
   */
  constructor(id, parentNode) {
    super(id, parentNode);
    this._box.layout('vertical').moveY(false).moveX(false);
  }
}

/**
 * 头部 Cell：固定高度 60，横向布局，双轴锁定
 * @extends CellBaseBuilder
 */
class HeaderCellBuilder extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   * @param {Object} parentNode 父 DAG 节点
   */
  constructor(id, parentNode) {
    super(id, parentNode);
    this._box.fixedHeight(60).backgroundColor('#4a90d9').moveY(false).moveX(false).layout('horizontal');
  }
}

/**
 * 内容区 Cell：最小高度 200，横向布局，双轴锁定
 * @extends CellBaseBuilder
 */
class ContentCellBuilder extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   * @param {Object} parentNode 父 DAG 节点
   */
  constructor(id, parentNode) {
    super(id, parentNode);
    this._box.minHeight(200).backgroundColor('#f0f0f0').moveY(false).moveX(false).layout('horizontal');
  }
}

/**
 * 侧栏 Cell：固定宽度 200，纵向布局，双轴锁定
 * @extends CellBaseBuilder
 */
class SidebarCellBuilder extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   * @param {Object} parentNode 父 DAG 节点
   */
  constructor(id, parentNode) {
    super(id, parentNode);
    this._box.fixedWidth(200).backgroundColor('#e0e0e0').moveY(false).moveX(false).layout('vertical');
  }
}

/**
 * 主内容 Cell：最小宽度 300，纵向布局，双轴锁定
 * @extends CellBaseBuilder
 */
class MainContentCellBuilder extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   * @param {Object} parentNode 父 DAG 节点
   */
  constructor(id, parentNode) {
    super(id, parentNode);
    this._box.minWidth(300).backgroundColor('#ffffff').moveY(false).moveX(false).layout('vertical');
  }
}

/**
 * 卡片 Cell：min 150 / default 200 / max 300 宽
 * @extends CellBaseBuilder
 */
class CardCellBuilder extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   * @param {Object} parentNode 父 DAG 节点
   */
  constructor(id, parentNode) {
    super(id, parentNode);
    this._box.minWidth(150).defaultWidth(200).maxWidth(300).backgroundColor('#ffdab9');
  }
}

/**
 * 菜单项 Cell：固定高度 50
 * @extends CellBaseBuilder
 */
class MenuItemCellBuilder extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   * @param {Object} parentNode 父 DAG 节点
   */
  constructor(id, parentNode) {
    super(id, parentNode);
    this._box.fixedHeight(50).backgroundColor('#d0d0d0');
  }
}

/**
 * Cell 演示页组件。在 DataDag 上装配一棵 Cell 树并渲染为 React 元素。
 * @returns {JSX.Element} 演示页根 Cell 元素
 */
const CellDemoPage = () => {
  const dag = new DataDag();
  const rootNode = dag._root;

  const page = new PageCellBuilder('cell-demo', rootNode)
    .viewport();

  const header = new HeaderCellBuilder('header', page._getSlotsNode());

  const logo = new CellBaseBuilder('logo', header._getSlotsNode())
    .fixedWidth(120)
    .backgroundColor('#357abd');

  const nav = new CellBaseBuilder('nav', header._getSlotsNode())
    .minWidth(200)
    .defaultWidth(400)
    .backgroundColor('#5aa0e9');

  const user = new CellBaseBuilder('user', header._getSlotsNode())
    .fixedWidth(100)
    .backgroundColor('#357abd');

  header.slots([logo, nav, user]);

  const content = new ContentCellBuilder('content', page._getSlotsNode());

  const sidebar = new SidebarCellBuilder('sidebar', content._getSlotsNode());

  const menu1 = new MenuItemCellBuilder('menu1', sidebar._getSlotsNode());
  const menu2 = new MenuItemCellBuilder('menu2', sidebar._getSlotsNode());
  const menu3 = new MenuItemCellBuilder('menu3', sidebar._getSlotsNode());

  sidebar.slots([menu1, menu2, menu3]);

  const mainContent = new MainContentCellBuilder('main-content', content._getSlotsNode());

  const title = new CellBaseBuilder('title', mainContent._getSlotsNode())
    .fixedHeight(40)
    .backgroundColor('#ffe4c4');

  const card1 = new CardCellBuilder('card1', mainContent._getSlotsNode());
  const card2 = new CardCellBuilder('card2', mainContent._getSlotsNode());

  mainContent.slots([title, card1, card2]);

  content.slots([sidebar, mainContent]);

  const footer = new CellBaseBuilder('footer', page._getSlotsNode())
    .fixedHeight(80)
    .backgroundColor('#333333')
    .moveY(false)
    .moveX(false)
    .layout('horizontal');

  const copyright = new CellBaseBuilder('copyright', footer._getSlotsNode())
    .minWidth(200)
    .defaultWidth(300)
    .backgroundColor('#444444');

  const links = new CellBaseBuilder('links', footer._getSlotsNode())
    .minWidth(400)
    .backgroundColor('#555555');

  footer.slots([copyright, links]);

  page.slots([header, content, footer]);

  return page.react();
};

export default CellDemoPage;