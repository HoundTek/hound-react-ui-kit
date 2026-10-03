/**
 * @file accordion.jsx —— AccordionCell（手风琴）高级 Cell
 *
 * 按钮族：手风琴 = 通栏按钮标题行 + 展开内容（见 docs/basic-cell-design.md）。
 * 组装 fallback：items（[{id, title, content}]）每项标题行为 ButtonImpl
 *（block + align 'left'，展开项 primary 变体，icon 为折叠箭头标记），
 * 点击展开/收起（再次点击同一项收起置 ''），展开时渲染 content 文本。
 * 主题可经 theme.components.accordion 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：items / activeId。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor } from '../core/theme/theme-react';
import { ButtonImpl } from '../basic-cells';
import { GlyphChevron } from '../basic-cells/glyphs';

/**
 * 手风琴单项：ButtonImpl 标题行（点击切换展开状态）+ 展开内容。
 * @param {{cell: CellBaseBuilder, item: object, active: boolean}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function AccordionItemView({ cell, item, active }) {
  const content = useText(item.content);
  const textSecondary = useThemeColor('text-secondary', '#555');
  const borderColor = useThemeColor('border', '#e8e8e8');
  return (
    <div style={{ width: '100%' }}>
      <ButtonImpl
        label={item.title}
        icon={<GlyphChevron dir={active ? 'down' : 'right'} size={14} />}
        type={active ? 'primary' : 'default'}
        block
        align="left"
        onPress={() => cell.setActiveId(active ? '' : item.id)}
      />
      {active ? (
        <div style={{
          padding: '10px 12px', fontSize: 12, color: textSecondary,
          boxSizing: 'border-box', width: '100%',
          whiteSpace: 'pre-wrap', borderBottom: `1px solid ${borderColor}`,
        }}>
          {content}
        </div>
      ) : null}
    </div>
  );
}

/**
 * 手风琴组装视图（fallback）：订阅 items/activeId，渲染可展开/收起的列表。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function AccordionAssembledView({ cell }) {
  const items = useCellData(cell, 'items') || [];
  const activeId = useCellData(cell, 'activeId');
  const surfaceColor = useThemeColor('surface', '#ffffff');
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: surfaceColor }}>
      {items.map(item => (
        <AccordionItemView key={item.id} cell={cell} item={item} active={item.id === activeId} />
      ))}
    </div>
  );
}

/** kind 'accordion' 的实现分发视图 */
const AccordionDispatcher = createImplDispatcher('accordion', AccordionAssembledView);

/**
 * AccordionCell：手风琴（高级 Cell，按钮族）。items 为 [{id, title, content}]
 *（title/content 可存 i18n key 或纯文本）；activeId 为当前展开项 id，
 * 再次点击同一项收起。呈现实现由 kind 'accordion' 分发（缺省为按钮组装版）。
 */
class AccordionCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.moveY(true).layout('vertical').color('surface')
      .schema({
        items: { type: 'array', default: [] },
        activeId: { type: 'string', default: '' },
      })
      .renderContent(AccordionDispatcher);
  }
}

export { AccordionCell, AccordionAssembledView };
