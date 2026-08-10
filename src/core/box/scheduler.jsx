/**
 * @file Reflow 调度与可 reflow 对象基类。ReflowScheduler 以最小间隔节流根节点
 *         reflow，Reflowable 为可 reflow 对象提供请求/执行/通知基类。
 *         尺寸变化的过渡呈现由主题特效系统（resize-effects）统一负责，不在此处。
 */

/** reflow 最小调度间隔（ms） */
const REFLOW_INTERVAL = 250;

/**
 * Reflow 调度器。收集所有 reflow 根节点，按 REFLOW_INTERVAL 节流，
 * 到点后统一调用各根节点的 _performReflow。
 */
class ReflowScheduler {
  constructor() {
    this._roots = new Set();
    this._scheduled = false;
    this._timerId = null;
    this._lastReflowTime = 0;
  }

  /**
   * 注册一个 reflow 根节点
   * @param {Reflowable} root 根节点
   */
  registerRoot(root) {
    this._roots.add(root);
  }

  /**
   * 注销一个 reflow 根节点；无根节点时取消挂起的调度
   * @param {Reflowable} root 根节点
   */
  unregisterRoot(root) {
    this._roots.delete(root);
    if (this._roots.size === 0 && this._timerId) {
      clearTimeout(this._timerId);
      this._scheduled = false;
      this._timerId = null;
    }
  }

  /**
   * 请求一次 reflow：若已挂起则忽略；否则按距上次 reflow 的时距计算延迟后调度
   */
  schedule() {
    if (this._scheduled) return;
    this._scheduled = true;

    const elapsed = performance.now() - this._lastReflowTime;
    const delay = Math.max(0, REFLOW_INTERVAL - elapsed);

    this._timerId = setTimeout(() => {
      this._scheduled = false;
      this._timerId = null;
      this._lastReflowTime = performance.now();
      this._roots.forEach(root => {
        root._performReflow();
      });
    }, delay);
  }
}

const reflowScheduler = new ReflowScheduler();

/**
 * 可 reflow 基类。提供 _needsReflow 标记、_requestReflow 向上冒泡至 reflow 根
 * （根向调度器请求调度）、_performReflow 默认实现与完成回调通知。
 */
class Reflowable {
  constructor() {
    this._needsReflow = false;
    this._onReflowCompleteCallbacks = new Set();
  }

  /**
   * 请求 reflow：标记自身需要 reflow；若为根/视口（viewport / floating-viewport / 无父节点）
   * 则向调度器请求，否则递归上抛给父级
   */
  _requestReflow() {
    this._needsReflow = true;
    if (this._isViewport || this._isFloatingViewport || !this._parent) {
      reflowScheduler.schedule();
    } else {
      this._parent._requestReflow();
    }
  }

  /**
   * 执行 reflow 的默认实现：清除标记并通知完成。子类覆盖时应自行决定是否调用 super
   */
  _performReflow() {
    this._needsReflow = false;
    this._notifyReflowComplete();
  }

  /**
   * 订阅 reflow 完成通知（仅视口/浮动视口根节点的订阅会被触发）
   * @param {() => void} cb 完成回调
   */
  _subscribeReflowComplete(cb) {
    this._onReflowCompleteCallbacks.add(cb);
  }

  /**
   * 退订 reflow 完成通知
   * @param {() => void} cb 已订阅的回调
   */
  _unsubscribeReflowComplete(cb) {
    this._onReflowCompleteCallbacks.delete(cb);
  }

  /**
   * 触发 reflow 完成回调：通知所有订阅者。三层（Content/Edge/Corner）统一订阅，
   * 保证布局数据（offsets/positions）更新后三层同步重渲染，覆盖层不与内容层错位
   *（此前 Edge/Corner 仅依赖 ResizeObserver，content 尺寸不变而 offset 变化时不重渲染）。
   */
  _notifyReflowComplete() {
    if (!(this._isViewport || this._isFloatingViewport)) return;
    this._onReflowCompleteCallbacks.forEach(cb => cb());
  }
}

export {
  Reflowable,
  reflowScheduler,
  REFLOW_INTERVAL,
};
