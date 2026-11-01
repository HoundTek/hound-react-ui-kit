/**
 * @file breadcrumb.jsx —— BreadcrumbCell（面包屑）高级 Cell
 *
 * 按钮族：面包屑 = 小按钮 + 分隔符文本（见 docs/basic-cell-design.md）。
 * 组装 fallback：items（[{id, title}]）渲染为 ButtonImpl text 变体（size
 * 'small'）横行，项间以分隔符 span 渲染（不再用固定 20×20 的文本盒子——
 * 盒子会把分隔符自身与相邻项的可用宽度挤掉）。末项或 activeId 命中项取
 * 「当前页」形态（加粗文本、不可点击）；点击其余项写入 activeId。
 * items 为空不渲染。主题可经 theme.components.breadcrumb 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：items / separator / activeId。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor } from '../core/theme/theme-react';
import { ButtonImpl } from '../basic-cells';

/**
 * 面包屑分隔符（拆为子组件：separator 经 useText 渲染）。
 * @param {{separator: string}} props 组件属性
 * @returns {JSX.Element} 分隔符元素
 */
function BreadcrumbSeparator({ separator }) {
  const muted = useThemeColor('text-muted', '#79747E');
  return (
    <span
      aria-hidden="true"
      style={{ flexShrink: 0, fontSize: 12, lineHeight: 1, color: muted, userSelect: 'none' }}
    >
      {useText(separator || '/')}
    </span>
  );
}

/**
 * 当前页项（末项/激活项）：加粗纯文本，不可点击（面包屑语义中当前页无跳转）。
 * @param {{title: string}} props 组件属性
 * @returns {JSX.Element} 当前页文本
 */
function BreadcrumbCurrent({ title }) {
  const text = useThemeColor('text', '#1D1B20');
  return (
    <span style={{
      minWidth: 0, fontSize: 12, fontWeight: 600, color: text,
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      userSelect: 'none',
    }}>
      {useText(title)}
    </span>
  );
}

/**
 * 面包屑组装视图（fallback）：ButtonImpl 项 + 分隔符横向排布。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element|null} 视图元素
 */
function BreadcrumbAssembledView({ cell }) {
  const items = useCellData(cell, 'items') || [];
  const separator = useCellData(cell, 'separator');
  const activeId = useCellData(cell, 'activeId');
  if (items.length === 0) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px',
      width: '100%', height: '100%', overflow: 'hidden', boxSizing: 'border-box',
    }}>
      {items.map((item, i) => {
        const isCurrent = item.id === activeId || i === items.length - 1;
        return (
          <React.Fragment key={item.id}>
            {isCurrent ? (
              <BreadcrumbCurrent title={item.title} />
            ) : (
              <ButtonImpl
                label={item.title}
                type="default"
                variant="text"
                size="small"
                onPress={() => cell.setActiveId(item.id)}
              />
            )}
            {i < items.length - 1 ? <BreadcrumbSeparator separator={separator} /> : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/** kind 'breadcrumb' 的实现分发视图 */
const BreadcrumbDispatcher = createImplDispatcher('breadcrumb', BreadcrumbAssembledView);

/**
 * BreadcrumbCell：面包屑（高级 Cell，按钮族）。items 为 [{id, title}]
 *（title 存 i18n key 或纯文本）；separator 为项间分隔符（默认 '/'）；
 * activeId 为当前激活项 id，点击项写入 activeId，末项始终为当前页。
 * 呈现实现由 kind 'breadcrumb' 分发（缺省为按钮组装版）。
 */
class BreadcrumbCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(32)
      .schema({
        items: { type: 'array', default: [] },
        separator: { type: 'string', default: '/' },
        activeId: { type: 'string', default: '' },
      })
      .renderContent(BreadcrumbDispatcher);
  }
}

export { BreadcrumbCell, BreadcrumbSeparator, BreadcrumbAssembledView };
