/**
 * @file breadcrumb.jsx —— BreadcrumbCell（面包屑）高级 Cell
 *
 * 按钮族：面包屑 = 小按钮 + 分隔符文本（见 docs/basic-cell-design.md）。
 * 组装 fallback：items（[{id, title}]）渲染为 ButtonImpl（size 'small'）
 * 横行，项间以 TextImpl 渲染 separator；末项或 activeId 命中项为
 * primary 变体，点击写入 activeId。items 为空不渲染。
 * 主题可经 theme.components.breadcrumb 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：items / separator / activeId。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { ButtonImpl, TextImpl } from '../basic-cells';

/**
 * 面包屑组装视图（fallback）：ButtonImpl 项 + TextImpl 分隔符横向排布。
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
      display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px',
      width: '100%', height: '100%', overflow: 'hidden', boxSizing: 'border-box',
    }}>
      {items.map((item, i) => {
        const isActive = item.id === activeId || i === items.length - 1;
        return (
          <React.Fragment key={item.id}>
            <ButtonImpl
              label={item.title}
              type={isActive ? 'primary' : 'default'}
              size="small"
              onPress={() => cell.setActiveId(item.id)}
            />
            {i < items.length - 1 ? (
              <div style={{ flexShrink: 0, width: 20, height: 20 }}>
                <TextImpl text={separator} size={12} color="text-muted" align="center" />
              </div>
            ) : null}
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
 * activeId 为当前激活项 id，点击项写入 activeId，末项始终高亮。
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

export { BreadcrumbCell, BreadcrumbAssembledView };
