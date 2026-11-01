/**
 * @file pagination.jsx —— PaginationCell（分页）高级 Cell
 *
 * 按钮族：分页 = 按钮行（见 docs/basic-cell-design.md）。
 * 组装 fallback：ButtonImpl 排成一行（左箭头上一页 / 页码 / 右箭头下一页），
 * 当前页 type 'primary' 其余 'default'，边界（首/末页）按钮禁用；
 * 点击写入 current 并调用注入的 _onChange(page) 回调（页面作者经
 * onChange 注入）。页号按窗口裁剪（首末页常显 + 当前页邻域，中间以省略号
 * 占位），避免页数多时整行被撑爆、按钮内容被压缩裁切。
 * 主题可经 theme.components.pagination 整体重写。
 *
 * Schema（数据契约，与旧版一致）：total / pageSize / current。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useThemeColor } from '../core/theme/theme-react';
import { ButtonImpl } from '../basic-cells';
import { GlyphChevron } from '../basic-cells/glyphs';
import { TABULAR_NUMS } from '../core/theme/state-layer';

/** 页数超出一屏时的固定槽位数（首末页 + 当前页邻域 + 至多两个省略占位） */
const PAGE_SLOTS = 7;
/** 单个槽位宽度（px）：与 size="icon" 按钮的最小宽一致，省略占位取同一宽度 */
const SLOT_W = 24;

/**
 * 计算需要展示的页号：页数不超过一屏（7 槽）时全部展示；页数更多时**固定
 * 输出 7 个槽位**——首末页常显、当前页邻域取 3~5 个、其余以 0（省略占位）
 * 填充。槽位数恒定 = 页面按钮区总宽恒定，翻页时不会因省略号个数变化而
 * 让整行宽度抖动。
 * @param {number} current 当前页（1..pages）
 * @param {number} pages 总页数
 * @returns {number[]} 页号槽位列表（0 表示省略占位），长度为 min(pages, 7)
 */
function pageWindow(current, pages) {
  if (pages <= PAGE_SLOTS) return Array.from({ length: pages }, (_, i) => i + 1);
  const last = pages;
  // 靠近首页：1..5 + 省略 + 末页（右侧只剩一段连续页号，无需左侧省略）
  if (current <= 4) return [1, 2, 3, 4, 5, 0, last];
  // 靠近末页：首 + 省略 + 末 5 页
  if (current >= last - 3) return [1, 0, last - 4, last - 3, last - 2, last - 1, last];
  // 中段：首 + 省略 + 当前页左右各一 + 省略 + 末
  return [1, 0, current - 1, current, current + 1, 0, last];
}

/**
 * 分页组装视图（fallback）：ButtonImpl 页码行，点击写入 current 并回调 _onChange。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function PaginationAssembledView({ cell }) {
  const total = useCellData(cell, 'total');
  const pageSize = useCellData(cell, 'pageSize');
  const current = useCellData(cell, 'current');
  const muted = useThemeColor('text-muted', '#79747E');
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const go = (page) => {
    if (page < 1 || page > pages) return;
    cell.setCurrent(page);
    cell.emit('change', page);
  };
  const slots = pageWindow(Math.max(1, Math.min(current, pages)), pages);
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: 6, overflowX: 'auto', boxSizing: 'border-box',
    }}>
      <ButtonImpl
        label=""
        icon={<GlyphChevron dir="left" size={12} />}
        type="default"
        size="icon"
        ariaLabel="上一页"
        disabled={current <= 1}
        onPress={() => go(current - 1)}
      />
      {slots.map((p, i) => (p === 0
        ? (
          <span
            key={`gap-${i}`}
            aria-hidden="true"
            style={{
              flexShrink: 0, width: SLOT_W, height: 24, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: muted, ...TABULAR_NUMS,
            }}
          >
            …
          </span>
        )
        : (
          <ButtonImpl
            key={p}
            label={String(p)}
            type={p === current ? 'primary' : 'default'}
            size="icon"
            ariaLabel={`第 ${p} 页`}
            onPress={() => go(p)}
          />
        )))}
      <ButtonImpl
        label=""
        icon={<GlyphChevron dir="right" size={12} />}
        type="default"
        size="icon"
        ariaLabel="下一页"
        disabled={current >= pages}
        onPress={() => go(current + 1)}
      />
    </div>
  );
}

/** kind 'pagination' 的实现分发视图 */
const PaginationDispatcher = createImplDispatcher('pagination', PaginationAssembledView);

/**
 * PaginationCell：分页（高级 Cell，按钮族）。total 为数据总数，pageSize 为
 * 每页条数（默认 10），current 为当前页；页面作者可用 onChange(handler)
 * 注入回调（handler(page)），边界页按钮自动禁用。
 * 呈现实现由 kind 'pagination' 分发（缺省为按钮组装版）。
 */
class PaginationCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(36)
      .schema({
        total: { type: 'number', default: 0 },
        pageSize: { type: 'number', default: 10 },
        current: { type: 'number', default: 1 },
      })
      .renderContent(PaginationDispatcher);
  }

  /**
   * 注入页码变更回调：点击页码或翻页按钮时调用 handler(page)。
   * @param {(page: number) => void} handler 页码变更回调
   * @returns {PaginationCell} self（链式）
   */
  onChange(handler) {
    this.on('change', handler);
    return this;
  }
}

export { PaginationCell, PaginationAssembledView };
