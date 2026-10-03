/**
 * @file list.jsx —— ListCell（列表）基础 Cell
 *
 * 基础种：结构原语「数据驱动重复」（数组数据 → N 个重复项 + 滚动），
 * 静态容器无法表达，不依赖任何其他 Cell 的实现（见 docs/basic-cell-design.md）。
 *
 * 实现拆分为两层（基础 Cell 的统一形态）：
 * - ListImpl：纯受控实现组件（props 进、onSelect 出，无 Cell 依赖），
 *   供高级 Cell 组装复用（table / tree / kanban / chat 等列表族）
 * - ListCell：Cell 壳（Schema ↔ ListImpl 绑定）
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor, useCornerType, useElementStyle } from '../core/theme/theme-react';
import { cornerStyle, CAPSULE_RADIUS } from '../core/theme/shape';
import { stateLayerProps } from '../core/theme/state-layer';

/**
 * 列表行（拆为子组件：title 经 useText 渲染，避免在 map 内调 hook）。
 * 变体：md3 选中行为胶囊 pill（primary-soft 底 + primary-dark 字，行内左右
 * 8px 留白），行间无分隔线，行 hover 叠态层；flat 为实色块选中 + 分隔线的旧形态。
 * @param {{item: object, active: boolean, variant: string, onSelect: Function}} props 组件属性
 * @returns {JSX.Element} 行元素
 */
function ListRowImpl({ item, active, variant, onSelect }) {
  const title = useText(item.title);
  const corner = useCornerType();
  const onPrimary = useThemeColor('on-primary', '#FFFFFF');
  const text = useThemeColor('text', '#1D1B20');
  const primaryDark = useThemeColor('primary-dark', '#4F378B');
  const primarySoft = useThemeColor('primary-soft', '#EADDFF');
  const surfaceMuted = useThemeColor('surface-muted', '#F3EDF7');
  const border = useThemeColor('border', '#CAC4D0');
  const isMd3 = variant === 'md3';
  const state = stateLayerProps(active ? primaryDark : text);
  const style = isMd3
    ? {
      display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
      height: 40, margin: '0 8px', fontSize: 13, cursor: 'pointer', userSelect: 'none',
      ...cornerStyle(corner, CAPSULE_RADIUS),
      color: active ? primaryDark : text,
      backgroundColor: active ? primarySoft : 'transparent',
      ...state.style,
    }
    : {
      display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px',
      height: 36, fontSize: 13, cursor: 'pointer', userSelect: 'none',
      color: active ? onPrimary : text,
      backgroundColor: active ? primaryDark : surfaceMuted,
      borderBottom: `1px solid ${border}`,
    };
  return (
    <div onClick={() => onSelect(item.id)} className={isMd3 ? state.className : undefined} style={style}>
      {item.icon ? <span style={{ flexShrink: 0 }}>{item.icon}</span> : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        {item.subtitle ? (
          <div style={{
            fontSize: 11, opacity: 0.7,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {item.subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * 列表实现组件（纯受控）：items 渲染为行列表，点击回调选中项。
 * 变体解析优先级：props.variant > theme.elements.list.variant > 'md3'。
 * @param {Object} props
 * @param {Array<{id: string, title: string, subtitle?: string, icon?: string}>} props.items 数据行
 * @param {string} props.selectedId 当前选中行 id
 * @param {'md3'|'flat'} [props.variant] 样式变体
 * @param {(id: string) => void} props.onSelect 选中回调
 * @returns {JSX.Element} 列表元素
 */
function ListImpl({ items, selectedId, variant, onSelect }) {
  const elStyle = useElementStyle('list');
  const v = variant || elStyle?.variant || 'md3';
  return (
    <div style={{ width: '100%', height: '100%' }}>
      {(items || []).map(item => (
        <ListRowImpl key={item.id} item={item} active={item.id === selectedId} variant={v} onSelect={onSelect} />
      ))}
    </div>
  );
}

/**
 * 列表视图：订阅 items/selected，经 ListImpl 渲染，点击切换选中并高亮。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ListView({ cell }) {
  const items = useCellData(cell, 'items') || [];
  const selected = useCellData(cell, 'selected');
  return <ListImpl items={items} selectedId={selected} onSelect={id => cell.setSelected(id)} />;
}

/**
 * ListCell：列表（基础 Cell）。items 为业务数据（[{id, title, subtitle?, icon?}]），
 * selected 为当前选中 id（点击行切换，高亮显示）。帧内纵向滚动（moveY true）。
 */
class ListCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.moveY(true).layout('vertical')
      .schema({
        items: { type: 'array', default: [] },
        selected: { type: 'string', default: '' },
      })
      .renderContent(ListView);
  }
}

export { ListCell, ListImpl };
