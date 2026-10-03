/**
 * @file tag.jsx —— TagCell（标签）高级 Cell
 *
 * 按钮族：标签 = 数据色按钮（见 docs/basic-cell-design.md）。
 * 组装 fallback：ButtonImpl（size 'small'，color 传数据色覆盖变体配色）；
 * closable 时追加 ✕ 按钮（点击置 visible=false 隐藏）；visible=false
 * 时整体不渲染。主题可经 theme.components.tag 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：visible / text / color / size / closable。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { ButtonImpl } from '../basic-cells';
import { GlyphClose } from '../basic-cells/glyphs';

/**
 * 标签组装视图（fallback）：数据色 ButtonImpl + 可选 ✕ 关闭按钮。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element|null} 视图元素
 */
function TagAssembledView({ cell }) {
  const visible = useCellData(cell, 'visible');
  const text = useCellData(cell, 'text');
  const closable = useCellData(cell, 'closable');
  const color = useCellData(cell, 'color');
  if (!visible) return null;
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: 4,
    }}>
      <ButtonImpl label={text} type="default" size="small" color={color} />
      {closable ? (
        <ButtonImpl label="" icon={<GlyphClose size={12} />} type="default" size="small" onPress={() => cell.setVisible(false)} />
      ) : null}
    </div>
  );
}

/** kind 'tag' 的实现分发视图 */
const TagDispatcher = createImplDispatcher('tag', TagAssembledView);

/**
 * TagCell：标签（高级 Cell，按钮族）。text 存 i18n key 或纯文本；color 为
 * 数据色；closable 开启时显示 ✕，点击隐藏（visible=false）。
 * 呈现实现由 kind 'tag' 分发（缺省为按钮组装版）。
 */
class TagCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(28)
      .schema({
        visible: { type: 'boolean', default: true },
        text: { type: 'string', default: '' },
        color: { type: 'string', default: '#4a90d9' },
        size: { type: 'string', default: 'default' },
        closable: { type: 'boolean', default: false },
      })
      .renderContent(TagDispatcher);
  }
}

export { TagCell, TagAssembledView };
