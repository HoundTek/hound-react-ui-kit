/**
 * @file board.jsx —— BoardCell（布局板块）预设
 *
 * 布局板块：给其他 Cell 套一层壳，让它们位于一个板块里。板块本身具有样式
 *（card 形状角色 + outlined 描边材质 + surface 底色），内部经 padding/gap
 * 保持内容与板块边缘、子项与子项之间的间距；板块与同级元素的间距由父容器
 * 的 gap/padding 承担（Box 层语义：间距是父容器的属性）。
 * 板块自身不滚动（双轴锁定），高度由父级 reflow 分配或作者显式指定
 *（fixedHeight/defaultHeight）；子项高度按 reflow 语义分配。
 * 页面作者 fill 默认插槽填充板块内容。纯容器型：无 schema、无视图、
 * 无 import React。
 */
import CellBaseBuilder from '../core/cell/cell-base';

/**
 * BoardCell：布局板块。页面作者 fill('_default', cells) 填充板块内容，
 * padding/gap 可链式覆盖（默认 12）。
 */
class BoardCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('vertical').moveX(false).moveY(false)
      .padding(12).gap(12)
      .styleRole('card').material('outlined');
  }
}

export { BoardCell };
