/**
 * @file Reflow 调度与动画工具。ReflowScheduler 以最小间隔节流根节点 reflow，
 *         Reflowable 为可 reflow 对象提供请求/执行/通知基类；
 *         animateReflow/pickAnimatable 负责 reflow 产生的尺寸过渡动画。
 */

/** reflow 最小调度间隔（ms），同时作为过渡动画时长 */
const REFLOW_INTERVAL = 250;

/** 可参与过渡动画的 CSS 属性白名单 */
const ANIMATABLE_PROPERTIES = [
  'width', 'height',
  'maxWidth', 'maxHeight', 'minWidth', 'minHeight',
  'transform', 'opacity',
  'backgroundColor', 'color',
  'left', 'top', 'right', 'bottom',
  'marginLeft', 'marginTop', 'marginRight', 'marginBottom',
  'paddingLeft', 'paddingTop', 'paddingRight', 'paddingBottom',
  'borderColor', 'borderWidth', 'borderRadius',
  'boxShadow', 'filter',
  'fontSize', 'lineHeight',
  'flex', 'flexGrow', 'flexShrink', 'flexBasis',
];

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
    this._onReflowComplete = null;
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
   * 触发 reflow 完成回调（仅视口/浮动视口根节点持有回调）
   */
  _notifyReflowComplete() {
    if ((this._isViewport || this._isFloatingViewport) && this._onReflowComplete) {
      this._onReflowComplete();
    }
  }
}

/**
 * 对元素执行 reflow 过渡动画：比较前后样式中可动画属性的差值，
 * 用 Web Animations API 从旧值过渡到新值，期间通过计数回调通知动画起止
 * @param {HTMLElement} element 目标元素
 * @param {Object} prevStyle 上一帧可动画样式快照
 * @param {Object} nextStyle 当前可动画样式快照
 * @param {() => void} [onAnimStart] 动画开始回调
 * @param {() => void} [onAnimFinish] 动画结束回调
 */
function animateReflow(element, prevStyle, nextStyle, onAnimStart, onAnimFinish) {
  if (!element || !prevStyle) return;

  const oldKeyframe = {};
  const newKeyframe = {};

  for (const key of ANIMATABLE_PROPERTIES) {
    const prevVal = prevStyle[key];
    const nextVal = nextStyle[key];
    if (prevVal !== undefined && nextVal !== undefined && prevVal !== nextVal) {
      oldKeyframe[key] = prevVal;
      newKeyframe[key] = nextVal;
    }
  }

  if (Object.keys(newKeyframe).length > 0) {
    if (element._currentReflowAnim) {
      element._currentReflowAnim.cancel();
    }
    const anim = element.animate([oldKeyframe, newKeyframe], {
      duration: REFLOW_INTERVAL,
      easing: 'ease-out',
    });
    element._currentReflowAnim = anim;
    if (onAnimStart) onAnimStart();
    anim.onfinish = () => {
      element._currentReflowAnim = null;
      if (onAnimFinish) onAnimFinish();
    };
  }
}

/**
 * 从样式对象中抽取可动画属性（且值非空）构成快照
 * @param {Object} style 样式对象
 * @returns {Object} 仅含可动画属性的快照
 */
function pickAnimatable(style) {
  const picked = {};
  for (const key of ANIMATABLE_PROPERTIES) {
    if (style[key] !== undefined && style[key] !== null) {
      picked[key] = style[key];
    }
  }
  return picked;
}

export {
  Reflowable,
  reflowScheduler,
  REFLOW_INTERVAL,
  ANIMATABLE_PROPERTIES,
  animateReflow,
  pickAnimatable,
};
