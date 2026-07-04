const REFLOW_INTERVAL = 250;

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

class ReflowScheduler {
  constructor() {
    this._roots = new Set();
    this._scheduled = false;
    this._timerId = null;
    this._lastReflowTime = 0;
  }

  registerRoot(root) {
    this._roots.add(root);
  }

  unregisterRoot(root) {
    this._roots.delete(root);
    if (this._roots.size === 0 && this._timerId) {
      clearTimeout(this._timerId);
      this._scheduled = false;
      this._timerId = null;
    }
  }

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

class Reflowable {
  constructor() {
    this._needsReflow = false;
    this._onReflowComplete = null;
  }

  _requestReflow() {
    this._needsReflow = true;
    if (this._isViewport || !this._parent) {
      reflowScheduler.schedule();
    } else {
      this._parent._requestReflow();
    }
  }

  _performReflow() {
    this._needsReflow = false;
    this._notifyReflowComplete();
  }

  _notifyReflowComplete() {
    if (this._isViewport && this._onReflowComplete) {
      this._onReflowComplete();
    }
  }
}

function animateReflow(element, prevStyle, nextStyle) {
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
  }
}

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
