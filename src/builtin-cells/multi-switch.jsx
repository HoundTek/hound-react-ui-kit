/**
 * @file multi-switch.jsx —— MultiSwitchCell（多档开关）高级 Cell
 *
 * 滑块族：多档开关 = 多档滑块（见 docs/basic-cell-design.md）。
 * 组装 fallback：label + 当前档位文本 + SliderTrackImpl（基础 Cell 滑块的
 * 实现组件，step1、0..n-1、档标记刻点），拖动换档。
 * 中间态（与开关同一套三段动效）：按下时滑块先用 `.hk-slide` 过渡动画**移到
 * 指针处**（连续位置，不吸附到刻点），进入拖动后去掉过渡逐帧跟手，松手清空
 * 预览、由档位数据驱动动画吸附到目标刻点。
 * 短按语义（tapMode='step'）：只是短暂点一下时，不直接跳到点击处对应的档位；
 * 点按落在**当前档点的邻近区间**（当前档点到左右相邻档点中点之间）时，朝指针
 * 所在的一侧移动**相邻一档**（避免误触跨档）；落在该区间之外时，直接切到离点击
 * 位置**最近的状态**（快速点向轨道另一侧即跳到最近档位）。
 * 只有按住拖动（位移 > 4px）才按指针位置连续换档。
 * 档标记刻点：两端档点的圆心与色条两端胶囊圆角的圆心重合（内缩 = 轨道高一半）。
 * 主题可经 theme.components['multi-switch'] 整体重写呈现实现。
 *
 * Schema（数据契约）：label / options（档位文本数组）/ index（当前档位）/
 * disabled。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor } from '../core/theme/theme-react';
import { SliderTrackImpl } from '../basic-cells/slider';

/**
 * 多档开关组装视图（fallback）：label + 当前档位 + 多档滑块轨道。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function MultiSwitchAssembledView({ cell }) {
  const label = useText(useCellData(cell, 'label'));
  const options = useCellData(cell, 'options') || [];
  const index = useCellData(cell, 'index');
  const disabled = useCellData(cell, 'disabled');
  const text = useThemeColor('text', '#333');
  const textMuted = useThemeColor('text-muted', '#888');
  const primary = useThemeColor('primary', '#4a90d9');
  const count = options.length;
  const ticks = options.map((_, i) => i);
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '0 12px', width: '100%', height: '100%', gap: 2, boxSizing: 'border-box',
      fontSize: 13, color: text, opacity: disabled ? 0.5 : 1,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: textMuted }}>
        <span>{label}</span>
        <span style={{ color: primary, fontWeight: 'bold' }}>{options[index] ?? ''}</span>
      </div>
      {count > 1 ? (
        <SliderTrackImpl
          min={0}
          max={count - 1}
          step={1}
          value={Math.min(index, count - 1)}
          ticks={ticks}
          disabled={disabled}
          tapMode="step"
          onChange={v => cell.setIndex(v)}
        />
      ) : null}
    </div>
  );
}

/** kind 'multi-switch' 的实现分发视图 */
const MultiSwitchDispatcher = createImplDispatcher('multi-switch', MultiSwitchAssembledView);

/**
 * MultiSwitchCell：多档开关（高级 Cell，滑块族）。options 为档位文本数组
 * （i18n key 或纯文本），index 为当前档位（点击刻点/拖动滑块写入）；
 * disabled 禁用。档位文本显示当前项（options 内的文本如需 i18n 翻译，
 * 由页面作者传入翻译后文本）。
 */
class MultiSwitchCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(56)
      .schema({
        label: { type: 'string', default: '' },
        options: { type: 'array', default: ['低', '中', '高'] },
        index: { type: 'number', default: 0 },
        disabled: { type: 'boolean', default: false },
      })
      .renderContent(MultiSwitchDispatcher);
  }
}

export { MultiSwitchCell, MultiSwitchAssembledView };
