// @vitest-environment jsdom
/**
 * @file SliderTrackImpl 短按语义回归（多档位进度条）：
 *       邻近区间 = **当前档点 → 左右相邻档点中点**之间：区间内点按只移动相邻
 *       一档（朝指针所在的一侧）；区间外点按直接切到离点击位置最近的状态；
 *       正好点在当前档点圆心（无方向）不变；拖动仍按指针位置连续换档。
 *       jsdom 不做布局，用 getBoundingClientRect 冒充 300px 宽的轨道。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { SliderTrackImpl } from '../src/basic-cells/slider';

/** 轨道几何：宽 300px、左缘 0；档点 0/1/2 的圆心（内缩 2px）为 2 / 150 / 298 */
const TRACK_W = 300;
const DOT_X = { 0: 2, 1: 150, 2: 298 };
/** 邻近区间边界：当前档点与左右相邻档点的中点 */
const MID = { '0-1': (DOT_X[0] + DOT_X[1]) / 2, '1-2': (DOT_X[1] + DOT_X[2]) / 2 };

/**
 * 造一个指针事件（jsdom 无 PointerEvent，手工带 clientX）
 * @param {string} type 事件名
 * @param {Object} props 附加属性（clientX 等）
 * @returns {Event} 可派发事件
 */
function pointerEvent(type, props) {
  const e = new Event(type, { bubbles: true, cancelable: true });
  return Object.assign(e, props);
}

/**
 * 渲染一条多档位轨道（ticks 0..2），返回轨道根节点与 onChange 监听
 * @param {number} value 当前档位
 * @param {Object} [extra] 附加到 SliderTrackImpl 的 props（如自定义 ticks/min/max）
 * @returns {{el: HTMLElement, onChange: Function}} 轨道根元素与回调监听
 */
function renderTrack(value, extra = {}) {
  const onChange = vi.fn();
  const { container } = render(
    <SliderTrackImpl
      min={0}
      max={2}
      step={1}
      value={value}
      ticks={[0, 1, 2]}
      tapMode="step"
      onChange={onChange}
      {...extra}
    />,
  );
  return { el: container.firstChild, onChange };
}

/**
 * 在轨道上做一次短按（按下与抬起位置相同）
 * @param {HTMLElement} el 轨道根元素
 * @param {number} clientX 点击横坐标
 * @returns {void}
 */
function tap(el, clientX) {
  fireEvent(el, pointerEvent('pointerdown', { clientX, pointerId: 1 }));
  fireEvent(el, pointerEvent('pointerup', { clientX, pointerId: 1 }));
}

describe('SliderTrackImpl 短按（tapMode=step）', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: TRACK_W, height: 4, right: TRACK_W, bottom: 4, x: 0, y: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('邻近区间内、指针在当前档点右侧：前进一档', () => {
    const { el, onChange } = renderTrack(0);
    tap(el, DOT_X[0] + 8); // 区间 [左端, 76] 内
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('邻近区间内、指针在当前档点左侧：后退一档', () => {
    const { el, onChange } = renderTrack(2);
    tap(el, DOT_X[2] - 8); // 区间 [224, 右端] 内
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('区间边界（相邻档点中点）仍算区间内：只移动一档', () => {
    const { el, onChange } = renderTrack(0);
    tap(el, MID['0-1']); // 正好落在 0 与 1 的中点
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('点按当前的档点正中心：无方向，不换档', () => {
    const { el, onChange } = renderTrack(1);
    tap(el, DOT_X[1]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('区间外且离另一档更近：直接切到离点击位置最近的状态（可跨档）', () => {
    const { el, onChange } = renderTrack(0);
    tap(el, 250); // 超出中点 76 → 最近档点 2（298）
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('区间外点在左侧：同样切到离点击位置最近的状态', () => {
    const { el, onChange } = renderTrack(1);
    tap(el, 60); // 超出中点 76 → 最近档点 0（2）
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('首/末档外侧没有邻居：区间展开到轨道端点，方向到头不换档', () => {
    const { el, onChange } = renderTrack(0);
    tap(el, 0); // 仍在 0 的邻近区间内，但左侧已无更低的档位
    expect(onChange).not.toHaveBeenCalled();
  });

  it('拖动（位移 > 4px）仍按指针位置连续换档', () => {
    const { el, onChange } = renderTrack(0);
    fireEvent(el, pointerEvent('pointerdown', { clientX: DOT_X[0], pointerId: 1 }));
    fireEvent(el, pointerEvent('pointermove', { clientX: 200, pointerId: 1 }));
    fireEvent(el, pointerEvent('pointerup', { clientX: 200, pointerId: 1 }));
    expect(onChange).toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith(1);
  });
});

describe('SliderTrackImpl 短按（tapMode=jump，连续量不评审档点）', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: TRACK_W, height: 4, right: TRACK_W, bottom: 4, x: 0, y: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('短按直接跳到点击处（轨道中段也生效，不评审档点）', () => {
    const onChange = vi.fn();
    const { container } = render(
      <SliderTrackImpl min={0} max={2} step={1} value={0} onChange={onChange} />,
    );
    const el = container.firstChild;
    tap(el, 200); // 200/300 → 1.33 → 吸附到 1（远离所有档点也照常跳）
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
