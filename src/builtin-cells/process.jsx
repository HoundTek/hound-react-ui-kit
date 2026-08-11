/**
 * @file process.jsx —— ProcessCell（步骤条）预设
 *
 * 横向步骤条：steps 为 [{id, title}] 列表，current 为当前步骤下标。
 * 已完成/当前步骤圆点为主色、未完成为灰色；步与步之间连线，
 * 已走过段为主色；当前步骤标题加粗。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

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
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
          backgroundColor: index <= current ? '#4a90d9' : '#ccc',
        }} />
        <div style={{
          fontSize: 12, whiteSpace: 'nowrap',
          fontWeight: isActive ? 'bold' : 'normal',
          color: isDone || isActive ? '#4a90d9' : '#999',
        }}>{title}</div>
      </div>
      {index < total - 1 && (
        <div style={{
          flex: 1, height: 2, margin: '0 6px',
          backgroundColor: isDone ? '#4a90d9' : '#e0e0e0',
        }} />
      )}
    </div>
  );
}

/**
 * 步骤条视图：订阅 steps/current，横向等分渲染各步骤与连线。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ProcessView({ cell }) {
  const steps = useCellData(cell, 'steps') || [];
  const current = useCellData(cell, 'current');
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
      {steps.map((s, i) => <StepItem key={s.id} item={s} index={i} total={steps.length} current={current} />)}
    </div>
  );
}

/**
 * ProcessCell：步骤条。steps 为 [{id, title}]，current 为当前步骤下标
 * （从 0 开始）；已完成/当前步骤圆点为主色，连线已走过段为主色。
 */
class ProcessCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(48).backgroundColor('#ffffff')
      .schema({
        steps: { type: 'array', default: [] },
        current: { type: 'number', default: 0 },
      })
      .renderContent(ProcessView);
  }
}

export { ProcessCell };