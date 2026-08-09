/**
 * @file Cell 前端的 React 集成层。
 *        - CellRoot 合并 Box 的三层渲染为单一根元素（视口根经 ResizeEffectViewport
 *          壳包裹三层，尺寸变化时三层整体参与主题特效）
 *        - useCellData 订阅 Cell 数据字段（含自动绑定转发），字段变更时自动重渲染
 *        - useNodeData 订阅任意 DataNode 字段（用于实例引用 cellA.data、引用节点等）
 */
import React, { useState, useEffect } from 'react';
import { ResizeEffectViewport } from '../theme/resize-effects';

/**
 * Cell 根渲染组件。把指定挂载点的 Box 三层（ContentLayer / EdgeLayer / CornerLayer）
 * 叠加在一个相对定位容器内，使调用方仅需 cell.react() 即可获得完整三层渲染。
 *
 * 多挂载：同一 Cell 可有多个挂载点，CellRoot 按 mountIndex 选择对应 Box。
 * 视口 Box（box._isViewport === true）使用 100vw/100vh；非视口通常作为子节点
 * 被父 Cell 的 ContentLayer 渲染，不经过 CellRoot。
 * @param {Object} props
 * @param {object} props.cell CellBaseBuilder 实例
 * @param {number} [props.mountIndex=0] 挂载索引
 * @returns {JSX.Element} 三层叠加的根元素
 */
function CellRoot({ cell, mountIndex = 0 }) {
  const mount = cell._mounts[mountIndex];
  if (!mount) return null;
  const box = mount.box;
  const wrapperStyle = box._isViewport
    ? { position: 'relative', width: '100vw', height: '100vh' }
    : { position: 'relative' };
  return (
    <div style={wrapperStyle}>
      <ResizeEffectViewport builder={box}>
        {box.reactContent()}
        {box.reactEdge()}
        {box.reactCorner()}
      </ResizeEffectViewport>
    </div>
  );
}

/**
 * useCellData — 订阅 Cell 数据树上某字段的当前值，字段变更时自动重渲染。
 *
 * 订阅通过 cell.subscribe，自动覆盖：
 * - 本 Cell 数据节点的字段变更
 * - 绑定字段（bind）对应目标节点的字段变更（payload 已重写 node/key，透明）
 *
 * payload 形如 {node, key, value, prev}，过滤 node === cell.data 且 key 匹配。
 * @param {object} cell CellBaseBuilder 实例
 * @param {string} key 数据字段名（绑定字段也用本 Cell 字段名）
 * @returns {*} 当前字段值
 */
function useCellData(cell, key) {
  const [value, setValue] = useState(() => cell.getData(key));

  useEffect(() => {
    // 订阅前再次同步，避免订阅前的异步变更遗漏
    setValue(cell.getData(key));
    const unsubscribe = cell.subscribe(({ node, key: changedKey, value: newValue }) => {
      if (node === cell.data && changedKey === key) {
        setValue(newValue);
      }
    });
    return unsubscribe;
  }, [cell, key]);

  return value;
}

/**
 * useNodeData — 订阅任意 DataNode 上某字段的当前值，字段变更时自动重渲染。
 *
 * 与 useCellData 不同，useNodeData 直接订阅 DataNode（不经过 Cell 的绑定转发），
 * 用于实例引用（cellA.data）、引用节点（ref）等场景。ref 节点的 getData/subscribe
 * 透明委托给最终目标，订阅时 payload.node 重写为 ref 自身，因此身份比较一致。
 * @param {DataNode} node DataNode 实例（可为 ref 节点）
 * @param {string} key 字段名
 * @returns {*} 当前字段值；node 为 null/undefined 时返回 undefined
 */
function useNodeData(node, key) {
  const [value, setValue] = useState(() => (node ? node.getData(key) : undefined));

  useEffect(() => {
    if (!node) {
      setValue(undefined);
      return;
    }
    setValue(node.getData(key));
    const unsubscribe = node.subscribe(({ node: changedNode, key: changedKey, value: newValue }) => {
      if (changedNode === node && changedKey === key) {
        setValue(newValue);
      }
    });
    return unsubscribe;
  }, [node, key]);

  return value;
}

export { CellRoot, useCellData, useNodeData };
