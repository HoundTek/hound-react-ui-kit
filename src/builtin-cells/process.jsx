/**
 * @file process.jsx —— ProcessCell（步骤条）高级 Cell
 *
 * 展示族：步骤条（见 docs/basic-cell-design.md）。
 * 双实现机制（kind: 'process'）：组装 fallback（ProcessAssembledView）横向等分
 * 渲染各步骤圆点与连线（已完成/当前为主色，未完成为灰色）；主题可经
 * theme.components.process 整体重写。
 *
 * Schema（数据契约，与旧版一致）：steps（[{id, title}]）/ current。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor, useCornerType } from '../core/theme/theme-react';
import { cornerStyle, CAPSULE_RADIUS } from '../core/theme/shape';

/**
 * 单个步骤：订阅 item.title 的 i18n 翻译；圆点与连线颜色由下标关系决定，
 * 当前步标题加粗。index/total/current 由父视图经 props 传入。
 * @param {{item: object, index: number, total: number, current: number}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function StepItem({ item, index, total, current }) {
  const title = useText(item.title);
  const isActive = index === current;
  const isDone = index < current;
  const corner = useCornerType();
  const primary = useThemeColor('primary', '#4a90d9');
  const border = useThemeColor('border', '#ccc');
  const borderLine = useThemeColor('border', '#e0e0e0');
  const textMuted = useThemeColor('text-muted', '#999');
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <div style={{
          width: 12, height: 12, ...cornerStyle(corner, CAPSULE_RADIUS), flexShrink: 0,
          backgroundColor: index <= current ? primary : border,
        }} />
        <div style={{
          fontSize: 12, whiteSpace: 'nowrap',
          fontWeight: isActive ? 'bold' : 'normal',
          color: isDone || isActive ? primary : textMuted,
        }}>{title}</div>
      </div>
      {index < total - 1 && (
        <div style={{
          flex: 1, height: 2, margin: '0 6px',
          backgroundColor: isDone ? primary : borderLine,
        }} />
      )}
    </div>
  );
}

/**
 * 步骤条组装视图（fallback）：订阅 steps/current，横向等分渲染各步骤与连线。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ProcessAssembledView({ cell }) {
  const steps = useCellData(cell, 'steps') || [];
  const current = useCellData(cell, 'current');
  return (
    <div style={{
      width: '100%', height: '100%', boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', padding: '0 12px',
    }}>
      {steps.map((s, i) => <StepItem key={s.id} item={s} index={i} total={steps.length} current={current} />)}
    </div>
  );
}

/** kind 'process' 的实现分发视图 */
const ProcessDispatcher = createImplDispatcher('process', ProcessAssembledView);

/**
 * ProcessCell：步骤条（高级 Cell，展示族）。steps 为 [{id, title}]，current 为
 * 当前步骤下标（从 0 开始）；已完成/当前步骤圆点为主色，连线已走过段为主色。
 * 呈现实现由 kind 'process' 分发。
 */
class ProcessCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(48).color('surface')
      .schema({
        steps: { type: 'array', default: [] },
        current: { type: 'number', default: 0 },
      })
      .renderContent(ProcessDispatcher);
  }
}

export { ProcessCell, ProcessAssembledView };
