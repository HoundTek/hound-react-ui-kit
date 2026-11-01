/**
 * @file index-bar.jsx —— IndexBarCell（索引栏）高级 Cell
 *
 * 按钮族：索引栏 = 纵向可点击字符列（见 docs/basic-cell-design.md）。
 * 组装 fallback：indexes 渲染为纵向等分的可点击字符（不做按钮外壳——
 * 24px 窄栏里放不下按钮的圆角与内边距，按钮会被外壳裁掉）：当前项主色
 * 加粗、其余次级文字色，密度与移动端通讯录索引条一致；点击 setActiveIndex，
 * 配合列表滚动联动（由页面作者监听 activeIndex 变化定位）。
 * 主题可经 theme.components['index-bar'] 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：indexes / activeIndex。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useThemeColor } from '../core/theme/theme-react';

/**
 * 索引字符按钮：纯文字可点击命中区（整行宽 × 等分高度）。
 * @param {Object} props 组件属性
 * @param {string} props.letter 索引字符
 * @param {boolean} props.active 是否为当前项
 * @param {string} props.activeColor 当前项文字色
 * @param {string} props.idleColor 其余项文字色
 * @param {() => void} props.onPick 点击回调
 * @returns {JSX.Element} 索引字符按钮
 */
function IndexLetter({ letter, active, activeColor, idleColor, onPick }) {
  return (
    <button
      type="button"
      aria-pressed={active ? 'true' : 'false'}
      onClick={onPick}
      className="hk-focus"
      style={{
        flex: '1 1 auto', minHeight: 14, width: '100%', padding: 0,
        border: 'none', background: 'transparent', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
        color: active ? activeColor : idleColor,
        fontWeight: active ? 700 : 400,
        userSelect: 'none',
      }}
    >
      {letter}
    </button>
  );
}

/**
 * 索引栏组装视图（fallback）：纵向等分的可点击字符列，点击写回 activeIndex。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function IndexBarAssembledView({ cell }) {
  const indexes = useCellData(cell, 'indexes') || [];
  const activeIndex = useCellData(cell, 'activeIndex');
  const primary = useThemeColor('primary', '#6750A4');
  const muted = useThemeColor('text-muted', '#79747E');
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: '100%', height: '100%', padding: '4px 0', boxSizing: 'border-box',
    }}>
      {indexes.map(letter => (
        <IndexLetter
          key={letter}
          letter={letter}
          active={letter === activeIndex}
          activeColor={primary}
          idleColor={muted}
          onPick={() => cell.setActiveIndex(letter)}
        />
      ))}
    </div>
  );
}

/** kind 'index-bar' 的实现分发视图 */
const IndexBarDispatcher = createImplDispatcher('index-bar', IndexBarAssembledView);

/**
 * IndexBarCell：索引栏（高级 Cell，按钮族）。indexes 为索引字符列表，
 * activeIndex 为当前选中项（主色加粗），供页面作者联动滚动定位。
 * 呈现实现由 kind 'index-bar' 分发（缺省为字符列组装版）。
 */
class IndexBarCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedWidth(24).layout('vertical').moveY(true)
      .schema({
        indexes: { type: 'array', default: ['A', 'B', 'C', 'D', 'E'] },
        activeIndex: { type: 'string', default: '' },
      })
      .renderContent(IndexBarDispatcher);
  }
}

export { IndexBarCell, IndexBarAssembledView };
