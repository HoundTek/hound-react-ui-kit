import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { DataDag } from '../core/data-dag/data-dag';

class PageCellBuilder extends CellBaseBuilder {
  constructor(id, parentNode) {
    super(id, parentNode);
    this._box.layout('vertical').moveY(false).moveX(false);
  }
}

class HeaderCellBuilder extends CellBaseBuilder {
  constructor(id, parentNode) {
    super(id, parentNode);
    this._box.fixedHeight(60).backgroundColor('#4a90d9').moveY(false).moveX(false).layout('horizontal');
  }
}

class ContentCellBuilder extends CellBaseBuilder {
  constructor(id, parentNode) {
    super(id, parentNode);
    this._box.minHeight(200).backgroundColor('#f0f0f0').moveY(false).moveX(false).layout('horizontal');
  }
}

class SidebarCellBuilder extends CellBaseBuilder {
  constructor(id, parentNode) {
    super(id, parentNode);
    this._box.fixedWidth(200).backgroundColor('#e0e0e0').moveY(false).moveX(false).layout('vertical');
  }
}

class MainContentCellBuilder extends CellBaseBuilder {
  constructor(id, parentNode) {
    super(id, parentNode);
    this._box.minWidth(300).backgroundColor('#ffffff').moveY(false).moveX(false).layout('vertical');
  }
}

class CardCellBuilder extends CellBaseBuilder {
  constructor(id, parentNode) {
    super(id, parentNode);
    this._box.minWidth(150).defaultWidth(200).maxWidth(300).backgroundColor('#ffdab9');
  }
}

class MenuItemCellBuilder extends CellBaseBuilder {
  constructor(id, parentNode) {
    super(id, parentNode);
    this._box.fixedHeight(50).backgroundColor('#d0d0d0');
  }
}

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