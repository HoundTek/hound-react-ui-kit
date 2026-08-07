/**
 * @file 内置 Cell 预设（builtin-cells）。提供通用、可复用的 Cell 类型，
 *       展示类型作者的最佳实践模式，页面作者可直接实例化使用。
 *
 * 分类：
 * - 基础构件：TextCell（文本）、ButtonCell（按钮）、InputCell（输入框）、
 *   ToggleCell（开关）、ListCell（列表选择）
 * - 浮层构件（Cell × 浮动视口）：NotificationCell（通知条，定时自动关闭）、
 *   ModalCell（模态对话框）、WindowCell（独立窗口，可移动/缩放/关闭）
 *
 * 使用约定：
 * - 字段中的文本（text/label 等）可存 i18n key 或纯文本，视图经 useText 渲染
 *   （i18n key 存在则翻译，不存在则原样显示）
 * - ButtonCell/ListCell 等交互构件通过 Schema 字段承载状态（pressed/selected），
 *   数据驱动渲染；ButtonCell 额外提供 onPress(handler) 注入点击动作
 * - 浮层构件继承 Box 浮动视口能力：构造函数调用 floatingViewport()/modal() 等
 *   链式方法（Cell 基类委托），位置/尺寸/层级由页面作者在实例上配置
 * - 浮层构件的 open()/close() 控制显隐（来自 Cell 基类，作用于主挂载 Box）
 */
import React, { useEffect } from 'react';
import CellBaseBuilder from '../cell/cell-base';
import { useCellData } from '../cell/cell-react';
import { useText } from '../i18n/i18n-react';

// =========================================================================
//  基础构件
// =========================================================================

/**
 * 文本视图：订阅 text（i18n key 或纯文本）与排版字段（size/color/bold/align）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TextView({ cell }) {
  const text = useText(useCellData(cell, 'text'));
  const size = useCellData(cell, 'size');
  const color = useCellData(cell, 'color');
  const bold = useCellData(cell, 'bold');
  const align = useCellData(cell, 'align');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: { left: 'flex-start', center: 'center', right: 'flex-end' }[align] || 'flex-start',
      padding: '0 12px', width: '100%', height: '100%',
      fontSize: size, color, fontWeight: bold ? 'bold' : 'normal',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    }}>
      {text}
    </div>
  );
}

/**
 * TextCell：通用文本展示。text 存 i18n key 或纯文本；
 * size/color/bold/align 控制排版。
 */
class TextCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.schema({
      text: { type: 'string', default: '' },
      size: { type: 'number', default: 14 },
      color: { type: 'string', default: '#333333' },
      bold: { type: 'boolean', default: false },
      align: { type: 'string', default: 'left' },
    }).renderContent(TextView);
  }
}

/**
 * 按钮视图：订阅 label/disabled，点击时写入 pressed 并调用注入的 onPress 回调。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ButtonView({ cell }) {
  const label = useText(useCellData(cell, 'label'));
  const disabled = useCellData(cell, 'disabled');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100%', height: '100%',
    }}>
      <button
        disabled={disabled}
        onClick={() => {
          cell.setPressed(true);
          if (cell._onPress) cell._onPress();
        }}
        style={{
          height: 30, padding: '0 16px', cursor: disabled ? 'not-allowed' : 'pointer',
          border: '1px solid #4a90d9', borderRadius: 4,
          background: disabled ? '#f0f0f0' : '#4a90d9', color: disabled ? '#999' : '#fff', fontSize: 13,
        }}
      >
        {label}
      </button>
    </div>
  );
}

/**
 * ButtonCell：通用按钮。label 存 i18n key 或纯文本，disabled 禁用；
 * 点击写入 pressed 并触发 onPress(fn) 注入的点击动作。
 */
class ButtonCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40)
      .schema({
        label: { type: 'string', default: '' },
        disabled: { type: 'boolean', default: false },
        pressed: { type: 'boolean', default: false },
      })
      .renderContent(ButtonView);
  }

  /**
   * 注入点击动作回调。按钮被点击时调用（点击同时写入 pressed 字段）。
   * @param {Function} handler 点击回调
   * @returns {ButtonCell} self（链式）
   */
  onPress(handler) {
    this._onPress = handler;
    return this;
  }
}

/**
 * 输入框视图：订阅 label/placeholder/value，onChange 即时写入 value（数据驱动交互）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function InputView({ cell }) {
  const label = useText(useCellData(cell, 'label'));
  const placeholder = useText(useCellData(cell, 'placeholder'));
  const value = useCellData(cell, 'value');
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '0 12px', width: '100%', height: '100%', gap: 6,
    }}>
      {label ? <div style={{ fontSize: 12, color: '#888' }}>{label}</div> : null}
      <input
        value={value}
        placeholder={placeholder}
        onChange={e => cell.setValue(e.target.value)}
        style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 13 }}
      />
    </div>
  );
}

/**
 * InputCell：通用输入框。label/placeholder 支持 i18n key 或纯文本，
 * value 实时写入数据。
 */
class InputCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.defaultHeight(64).backgroundColor('#fafafa')
      .schema({
        label: { type: 'string', default: '' },
        placeholder: { type: 'string', default: '' },
        value: { type: 'string', default: '' },
      })
      .renderContent(InputView);
  }
}

/**
 * 开关视图：订阅 label/enabled，点击切换开/关状态。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ToggleView({ cell }) {
  const label = useText(useCellData(cell, 'label'));
  const enabled = useCellData(cell, 'enabled');
  return (
    <div
      onClick={() => cell.setEnabled(!enabled)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', width: '100%', height: '100%',
        cursor: 'pointer', userSelect: 'none', fontSize: 13, color: '#333',
      }}
    >
      <span>{label}</span>
      <div style={{
        width: 36, height: 20, borderRadius: 10, position: 'relative', flexShrink: 0,
        backgroundColor: enabled ? '#4a90d9' : '#ccc', transition: 'background-color .15s',
      }}>
        <div style={{
          position: 'absolute', top: 2, width: 16, height: 16, borderRadius: 8,
          backgroundColor: '#fff', transition: 'left .15s',
          left: enabled ? 18 : 2,
        }} />
      </div>
    </div>
  );
}

/**
 * ToggleCell：通用开关。label 支持 i18n key 或纯文本，enabled 为开/关状态。
 */
class ToggleCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(48).backgroundColor('#fafafa')
      .schema({
        label: { type: 'string', default: '' },
        enabled: { type: 'boolean', default: true },
      })
      .renderContent(ToggleView);
  }
}

/**
 * 列表视图：订阅 items（[{id, title}] 业务数据）与 selected，点击切换选中并高亮。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ListView({ cell }) {
  const items = useCellData(cell, 'items') || [];
  const selected = useCellData(cell, 'selected');
  return (
    <div style={{ width: '100%', height: '100%' }}>
      {items.map(item => (
        <div
          key={item.id}
          onClick={() => cell.setSelected(item.id)}
          style={{
            display: 'flex', alignItems: 'center', padding: '0 10px',
            height: 34, fontSize: 13, cursor: 'pointer', userSelect: 'none',
            color: item.id === selected ? '#fff' : '#333',
            backgroundColor: item.id === selected ? '#357abd' : '#f7f7f7',
            borderBottom: '1px solid #e8e8e8',
          }}
        >
          {item.title}
        </div>
      ))}
    </div>
  );
}

/**
 * ListCell：通用选择列表。items 为业务数据（[{id, title}]），
 * selected 为当前选中 id（点击行切换，高亮显示）。
 */
class ListCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.moveY(true).layout('vertical')
      .schema({
        items: { type: 'array', default: [] },
        selected: { type: 'string', default: '' },
      })
      .renderContent(ListView);
  }
}

// =========================================================================
//  浮层构件（Cell × 浮动视口）
// =========================================================================

/**
 * 通知条视图：订阅 text/duration，渲染消息文本；duration 非空时
 * 定时调用 cell.close() 自动关闭（清理定时器，防止 StrictMode 双调用泄漏）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function NotificationView({ cell }) {
  const text = useText(useCellData(cell, 'text'));
  const duration = useCellData(cell, 'duration');
  useEffect(() => {
    if (!duration || !cell._mounts[0]) return;
    const timer = setTimeout(() => cell.close(), duration);
    return () => clearTimeout(timer);
  }, [duration, cell]);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '0 16px',
      width: '100%', height: '100%', color: '#fff', fontSize: 13,
    }}>
      {text}
    </div>
  );
}

/**
 * NotificationCell：通知条（浮动视口）。默认固定尺寸、不可移动/缩放、可关闭；
 * 位置由页面作者用 posX/posY 指定（如屏幕右上角），duration（ms）非空时自动关闭。
 * text 存 i18n key 或纯文本。
 */
class NotificationCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.floatingViewport()
      .movable(false).resizable(false).closable(true)
      .fixedWidth(280).defaultHeight(48)
      .zIndex(2300)
      .backgroundColor('#4a90d9')
      .schema({
        text: { type: 'string', default: '' },
        duration: { type: 'number', default: null },
      })
      .renderContent(NotificationView);
  }
}

/**
 * ModalCell：模态对话框（浮动视口 + 自带遮罩）。默认固定位置/尺寸、不可移动/缩放、
 * 可关闭；header（单插槽，标题栏）/body（列表插槽，可滚动）两个插槽由页面作者填充。
 * 位置/尺寸/层级由页面作者在实例上配置（posX/posY/fixedWidth/... 链式覆盖）。
 */
class ModalCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.floatingViewport()
      .modal().movable(false).resizable(false).closable(true)
      .fixedWidth(320).fixedHeight(200)
      .zIndex(2200)
      .backgroundColor('#ffffff').layout('vertical')
      .defineSlot('header', { fixedHeight: 44, backgroundColor: '#e8e8e8' })
      .defineSlot('body', { minHeight: 100, moveY: true, layout: 'vertical', backgroundColor: '#ffffff', showChildOverlays: false });
  }
}

/**
 * WindowCell：独立窗口（浮动视口）。默认可移动（标题栏为拖拽点）、可调整大小、
 * 可关闭；title（单插槽，拖拽点标题栏）/body（列表插槽，可滚动）两个插槽由页面作者填充。
 * 位置/尺寸/层级由页面作者在实例上配置。
 */
class WindowCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.floatingViewport()
      .movable(true).resizable(true).closable(true)
      .fixedWidth(320).fixedHeight(200)
      .zIndex(2100)
      .backgroundColor('#ffffff').layout('vertical')
      .defineSlot('title', { fixedHeight: 36, backgroundColor: '#4a90d9', dragHandle: true })
      .defineSlot('body', { minHeight: 120, moveY: true, layout: 'vertical', backgroundColor: '#ffffff', showChildOverlays: false });
  }
}

export { TextCell, ButtonCell, InputCell, ToggleCell, ListCell, NotificationCell, ModalCell, WindowCell };
