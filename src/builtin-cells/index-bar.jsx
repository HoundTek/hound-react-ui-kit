/**
 * @file index-bar.jsx —— IndexBarCell（索引栏）高级 Cell
 *
 * 按钮族：索引栏 = 纵向按钮列（见 docs/basic-cell-design.md）。
 * 组装 fallback：indexes 渲染为 ButtonImpl 纵向字母列，当前项 type
 * 'primary' 高亮，点击 setActiveIndex；配合列表滚动联动（由页面作者
 * 监听 activeIndex 变化定位）。主题可经 theme.components['index-bar']
 * 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：indexes / activeIndex。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useThemeColor } from '../core/theme/theme-react';
import { ButtonImpl } from '../basic-cells';

/**
 * 索引栏组装视图（fallback）：ButtonImpl 字母列，点击写回 activeIndex。
 * 栏宽仅 24，按钮不撑满（block 会因内边距裁掉字母），居中显示中段。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function IndexBarAssembledView({ cell }) {
  const indexes = useCellData(cell, 'indexes') || [];
  const activeIndex = useCellData(cell, 'activeIndex');
  const surface = useThemeColor('surface', '#ffffff');
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      width: '100%', height: '100%', overflow: 'hidden',
      backgroundColor: surface, padding: '4px 0', boxSizing: 'border-box',
    }}>
      {indexes.map(letter => (
        <div key={letter} style={{ flexShrink: 0 }}>
          <ButtonImpl
            label={letter}
            type={activeIndex === letter ? 'primary' : 'default'}
            size="small"
            onPress={() => cell.setActiveIndex(letter)}
          />
        </div>
      ))}
    </div>
  );
}

/** kind 'index-bar' 的实现分发视图 */
const IndexBarDispatcher = createImplDispatcher('index-bar', IndexBarAssembledView);

/**
 * IndexBarCell：索引栏（高级 Cell，按钮族）。indexes 为索引字母列表，
 * activeIndex 为当前选中项（点击高亮主色），供页面作者联动滚动定位。
 * 呈现实现由 kind 'index-bar' 分发（缺省为按钮组装版）。
 */
class IndexBarCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedWidth(24).moveY(true).layout('vertical').color('surface')
      .schema({
        indexes: { type: 'array', default: ['A', 'B', 'C', 'D', 'E'] },
        activeIndex: { type: 'string', default: '' },
      })
      .renderContent(IndexBarDispatcher);
  }
}

export { IndexBarCell, IndexBarAssembledView };
