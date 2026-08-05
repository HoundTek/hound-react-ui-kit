/**
 * @file 拖拽调整尺寸的纯逻辑（无 React 依赖）。
 *        - resolveContainerDrag：就近原则的分配算法
 *        - getDraggableEdgeId：start/end 边向外解析重合的 handle 边
 *        - commitContainerRatios：拖拽结束后记录实际比例，更新尺寸分配比
 */

/**
 * 把任意值安全转为有限数，非有限数返回 0
 * @param {*} v 输入值
 * @returns {number} 有限数值
 */
const safeNum = (v) => (typeof v === 'number' && !isNaN(v) && isFinite(v)) ? v : 0;

/**
 * 由 box 路径与边类型构造唯一边 id
 * @param {BoxBuilder} box 边所属 box
 * @param {'start'|'end'|'handle'} side 边类型
 * @returns {string} 形如 `@path/to/box:side` 的边 id
 */
const makeEdgeId = (box, side) => `${box._path}:${side}`;

/**
 * resolveContainerDrag — 就近原则：分界线两侧从近到远吸收调整量
 *
 * @param {BoxBuilder[]} children BoxBuilder 数组
 * @param {number} dividerIndex 分界线左侧最后一个 child 的下标（k 与 k+1 之间）
 * @param {number} delta 期望位移，> 0 表示分界线向 end 方向移动
 * @param {'Width'|'Height'} dim 维度
 * @param {number[]|null} [baseSizes] 拖拽起始时的尺寸快照（缺省取当前 _layout 尺寸）
 * @param {number|null} [containerSize] 容器主轴尺寸；明显大于内容总尺寸时，末端空隙作为 [0, +∞) 的
 *   虚拟 child 参与调整（未填满容器的 slack）；空隙不超过拟合误差容差（max(1, child 数)）时视为已填满，slack 不参与调整
 * @returns {number[]} 新尺寸数组：容器尺寸守恒、满足全部 min/max、_draggable === false 的 child 冻结
 */
function resolveContainerDrag(children, dividerIndex, delta, dim, baseSizes = null, containerSize = null) {
  const sizeKey = `_layout${dim}`;
  const minKey = `_min${dim}`;
  const maxKey = `_max${dim}`;
  const n = children.length;

  const s = baseSizes ? baseSizes.slice() : children.map(c => safeNum(c[sizeKey]));
  const lo = children.map((c, i) => c._draggable === false ? s[i] : c[minKey]);
  const hi = children.map((c, i) => c._draggable === false ? s[i] : c[maxKey]);

  // 末端空隙（slack）视为虚拟 child：容器明显未填满时以 [0, +∞) 参与调整，
  // 可被吃掉（child 拖大）也可被拖大（child 拖小），左右对偶；
  // 空隙不超过容差（max(1, child 数)，与 isMainFilledToEnd 口径一致）视为已填满、
  // 不参与——上一轮 reflow 的 λ 拟合有亚像素漂移，若被误判为空隙，+∞ 的上限
  // 会让 min/max 钳制整个失效（已到 max 的 child 继续拖会带动其他 child）
  const contentSize = s.reduce((sum, v) => sum + v, 0);
  const C = (typeof containerSize === 'number' && containerSize > contentSize) ? containerSize : contentSize;
  const slackSize = C - contentSize;
  s.push(slackSize);
  lo.push(0);
  hi.push(slackSize > Math.max(1, n) ? Infinity : 0);

  const count = n + 1;
  const prefix = [0];
  for (let i = 0; i < count; i++) prefix.push(prefix[i] + s[i]);
  const L = prefix[count];

  const sumRange = (arr, a, b) => {
    let t = 0;
    for (let i = a; i <= b; i++) t += arr[i];
    return t;
  };

  const k = dividerIndex;
  const loL = sumRange(lo, 0, k);
  const hiL = sumRange(hi, 0, k);
  const loR = sumRange(lo, k + 1, count - 1);
  const hiR = sumRange(hi, k + 1, count - 1);

  // 分界线位置钳制到可行域：左段总和须落在 [loL, hiL]，右段总和须落在 [loR, hiR]
  const startPos = prefix[k + 1];
  const minPos = Math.max(loL, L - hiR);
  const maxPos = Math.min(hiL, L - loR);
  const pos = Math.min(Math.max(startPos + delta, minPos), maxPos);

  const out = s.slice();

  // 左段（0..k）：从分界线向左贪心，远侧保持原尺寸直到被迫
  let remaining = pos;
  for (let i = k; i >= 0; i--) {
    const target = remaining - prefix[i];
    out[i] = Math.min(Math.max(target, lo[i]), hi[i]);
    remaining -= out[i];
  }
  // 右段（k+1..n-1 及末端 slack）：从分界线向右贪心
  remaining = L - pos;
  for (let i = k + 1; i < count; i++) {
    const target = remaining - (prefix[count] - prefix[i + 1]);
    out[i] = Math.min(Math.max(target, lo[i]), hi[i]);
    remaining -= out[i];
  }
  // 丢弃虚拟的 slack 项
  out.length = n;
  return out;
}

/**
 * getDraggableEdgeId — start/end 边向外找重合的 handle 边
 *
 * 边由 box._parent 层渲染。沿父链向外：
 * - 与边平行的层（方向相同）：该层的边可能与边重合——childLevel 非首/末位时命中
 *   前一个兄弟的 handle（start 侧）或自身 handle（end 侧），即为可拖拽边；
 *   首/末位时与该层 start/end 边重合，继续向外（end 侧未填满到 box 末端时
 *   改为命中末位 child 与末端空隙的虚拟 handle，slack 参与调整）
 * - 方向不同的层：无平行边，仅靠交叉轴拉伸保持位置对齐，直接穿过
 * - 沿途任一层沿边法线方向滚动开启即失配；到达 viewport 边界返回 null
 *
 * @param {BoxBuilder} box 边所属 box
 * @param {'start'|'end'} side 边类型
 * @returns {string|null} 重合的 handle 边 id（可拖拽）；不可拖拽返回 null
 */
function getDraggableEdgeId(box, side) {
  const builder = box._parent;
  if (!builder) return null;

  const isHorizontal = builder._layout === 'horizontal';
  // 边为竖直线（horizontal 层）时，水平滚动会让边与外层错位
  const lineScrollKey = isHorizontal ? '_moveX' : '_moveY';
  const dimKey = isHorizontal ? 'width' : 'height';
  const layoutKey = isHorizontal ? '_layoutWidth' : '_layoutHeight';

  /**
   * 该层内容在主轴（即边的法线方向）上是否填满到 box 末端
   * @param {BoxBuilder} container 容器
   * @returns {boolean} 是否填满到末端（容差 max(1, child 数)）
   */
  const isMainFilledToEnd = (container) => {
    const boxSize = safeNum(container._containerSize?.[dimKey]);
    const contentSize = container._children.reduce((sum, c) => sum + safeNum(c[layoutKey]), 0);
    return Math.abs(contentSize - boxSize) <= Math.max(1, container._children.length);
  };

  let childLevel = box;
  let containerLevel = builder;

  while (containerLevel) {
    const childIndex = containerLevel._children.indexOf(childLevel);
    const isFirst = childIndex === 0;
    const isLast = childIndex === containerLevel._children.length - 1;
    // 与边平行的层（方向与 box._parent 相同，无 _layout 视为 vertical）才有重合的边
    const parallelDir = (containerLevel._layout === 'horizontal') === isHorizontal;

    if (parallelDir) {
      const atBoundary = side === 'start' ? isFirst : isLast;
      if (atBoundary) {
        // 与该层 start/end 边重合，可继续向外；end 侧未填满到 box 末端时
        // 与外层任何边都不重合——解析为末位 child 与末端空隙的虚拟 handle
        // （slack 由 resolveContainerDrag 作为虚拟 child 参与调整）
        if (side === 'end' && !isMainFilledToEnd(containerLevel)) {
          return makeEdgeId(childLevel, 'handle');
        }
      } else {
        // 命中：边与这一层的 handle 重合
        return side === 'start'
          ? makeEdgeId(containerLevel._children[childIndex - 1], 'handle')
          : makeEdgeId(childLevel, 'handle');
      }
    }

    // 这一层沿边法线方向滚动开启：边与外层不再重合
    if (containerLevel[lineScrollKey] === true) return null;
    childLevel = containerLevel;
    containerLevel = containerLevel._parent;
  }

  return null;
}

/**
 * commitContainerRatios — 记录最终实际比例，更新尺寸分配比
 * 把容器内每个 child 的实际占比写入 _ratio{dim}，供 _calculateLayout 作为目标值
 * @param {BoxBuilder} container 容器
 * @param {'Width'|'Height'} dim 维度
 * @param {boolean} [requestReflow=true] 是否在提交后触发一次 reflow
 */
function commitContainerRatios(container, dim, requestReflow = true) {
  const dimKey = dim.toLowerCase();
  const L = safeNum(container._containerSize?.[dimKey]);
  if (L <= 0) return;

  const layoutKey = `_layout${dim}`;
  const ratioKey = `_ratio${dim}`;
  container._children.forEach(c => {
    c[ratioKey] = safeNum(c[layoutKey]) / L;
  });
  if (requestReflow) container._requestReflow();
}

export { resolveContainerDrag, getDraggableEdgeId, commitContainerRatios, makeEdgeId };
