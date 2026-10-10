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
 *   链式方法（Cell 基类委托），位置/尺寸由页面作者在实例上配置
 *   （窗口层级由系统自动管理：后聚焦/出现居上 + 模态序排列）
 * - 浮层构件的 open()/close() 控制显隐（来自 Cell 基类，作用于主挂载 Box）；
 *   窗口状态最大化/最小化经 schema 字段 maximized/minimized 数据驱动
 *   （setMaximized/setMinimized），由窗口控件结构（chrome）联动应用
 * - 窗口控件结构（chrome）内建于 WindowCell/ModalCell 的标题栏插槽：
 *   标题文本（schema title）+ 最小化/最大化/关闭控件；fill 标题栏插槽可
 *   整体替换默认 chrome，此时关闭按钮可经 CloseButtonCell 自行嵌入；
 *   窗口样式控制经 windowControls/titleBarColor/titleBarHeight/titleColor
 *   链式配置（主题级默认经 theme.elements.window 声明）
 */
import React, { useEffect, useState } from 'react';
import CellBaseBuilder from '../cell/cell-base';
import { useCellData } from '../cell/cell-react';
import { useText } from '../i18n/i18n-react';
import { FloatingCloseButton } from '../box/box-component';
import { useTheme, useThemeColor, useShapeRadius, useCornerType, useElementStyle } from '../theme/theme-react';
import { cornerStyle, CAPSULE_RADIUS } from '../theme/shape';
import { GlyphMinus, GlyphMaximize, GlyphRestore, GlyphClose } from '../../basic-cells/glyphs';

// =========================================================================
//  基础构件
// =========================================================================

/**
 * 语义字号档（MD3 type scale 摘选）：size 传字符串档名时映射为
 * 字号/行高/字重；传数值时行为不变（向后兼容）。
 * @type {Object<string, {fontSize: number, lineHeight: number, fontWeight: number}>}
 */
const TEXT_SCALE = {
  'title-large': { fontSize: 22, lineHeight: 28, fontWeight: 500 },
  'title': { fontSize: 16, lineHeight: 24, fontWeight: 500 },
  'body': { fontSize: 14, lineHeight: 20, fontWeight: 400 },
  'label': { fontSize: 12, lineHeight: 16, fontWeight: 500 },
};

/**
 * 文本实现组件（纯受控，基础 Cell「文本」的组装件，见 docs/basic-cell-design.md）。
 * text 经 useText 渲染（i18n key 或纯文本）；color 支持颜色角色名——先经主题
 * resolveColor 解析，未命中按字面色值（向后兼容）；size 除数值字号外接受
 * 语义档（'title-large' / 'title' / 'body' / 'label'，MD3 type scale 摘选）。
 * @param {Object} props
 * @param {string} props.text 文本（i18n key 或纯文本）
 * @param {number|string} [props.size=14] 字号（px 数值）或语义档名
 * @param {string} [props.color] 颜色角色名（如 'text-muted'）或字面色值
 * @param {boolean} [props.bold=false] 是否加粗（语义档自带字重时被档覆盖）
 * @param {'left'|'center'|'right'} [props.align='left'] 对齐
 * @returns {JSX.Element} 文本元素
 */
function TextImpl({ text, size = 14, color, bold = false, align = 'left' }) {
  const content = useText(text);
  const theme = useTheme();
  const resolvedColor = (color && theme?.resolveColor(color)) || color;
  const scale = typeof size === 'string' ? TEXT_SCALE[size] : null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: { left: 'flex-start', center: 'center', right: 'flex-end' }[align] || 'flex-start',
      padding: '0 12px', width: '100%', height: '100%', boxSizing: 'border-box',
      fontSize: scale ? scale.fontSize : size, color: resolvedColor,
      fontWeight: scale ? scale.fontWeight : (bold ? 'bold' : 'normal'),
      ...(scale ? { lineHeight: `${scale.lineHeight}px` } : {}),
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    }}>
      {content}
    </div>
  );
}

/**
 * 文本视图：订阅 text（i18n key 或纯文本）与排版字段（size/color/bold/align）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function TextView({ cell }) {
  const text = useCellData(cell, 'text');
  const size = useCellData(cell, 'size');
  const color = useCellData(cell, 'color');
  const bold = useCellData(cell, 'bold');
  const align = useCellData(cell, 'align');
  return <TextImpl text={text} size={size} color={color} bold={bold} align={align} />;
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
  const theme = useTheme();
  // 颜色角色解析（普适配置），圆角随主题圆角类型（g2 曲率平滑 / g1 圆弧）
  const primary = theme?.resolveColor('primary') ?? '#4a90d9';
  const corner = theme?.getCornerType() || 'g1';
  const controlR = useShapeRadius('control', 4);
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
          boxSizing: 'border-box', border: `1px solid ${primary}`,
          ...cornerStyle(corner, controlR),
          background: disabled ? (theme?.resolveColor('surface-muted') ?? '#f0f0f0') : primary,
          color: disabled ? (theme?.resolveColor('text-muted') ?? '#999') : (theme?.resolveColor('on-primary') ?? '#fff'),
          fontSize: 13,
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
  const theme = useTheme();
  const border = theme?.resolveColor('border') ?? '#ccc';
  const textMuted = theme?.resolveColor('text-muted') ?? '#888';
  const controlR = useShapeRadius('control', 4);
  const corner = useCornerType();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '0 12px', width: '100%', height: '100%', gap: 6,
    }}>
      {label ? <div style={{ fontSize: 12, color: textMuted }}>{label}</div> : null}
      <input
        value={value}
        placeholder={placeholder}
        onChange={e => cell.setValue(e.target.value)}
        style={{
          padding: '4px 8px', border: `1px solid ${border}`, fontSize: 13,
          boxSizing: 'border-box', width: '100%',
          ...cornerStyle(corner, controlR),
        }}
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
    this.defaultHeight(64).color('surface-muted')
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
  const theme = useTheme();
  const corner = theme?.getCornerType() || 'g1';
  const trackOn = theme?.resolveColor('primary') ?? '#4a90d9';
  const trackOff = theme?.resolveColor('border') ?? '#ccc';
  const knob = theme?.resolveColor('surface') ?? '#fff';
  return (
    <div
      onClick={() => cell.setEnabled(!enabled)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', width: '100%', height: '100%',
        cursor: 'pointer', userSelect: 'none', fontSize: 13,
        color: theme?.resolveColor('text') ?? '#333',
      }}
    >
      <span>{label}</span>
      {/* 轨道为胶囊形（短轴全圆角），圆角品质随主题圆角类型 */}
      <div style={{
        width: 36, height: 20, position: 'relative', flexShrink: 0,
        ...cornerStyle(corner, CAPSULE_RADIUS),
        backgroundColor: enabled ? trackOn : trackOff, transition: 'background-color .15s',
      }}>
        <div style={{
          position: 'absolute', top: 2, width: 16, height: 16,
          ...cornerStyle(corner, CAPSULE_RADIUS),
          backgroundColor: knob, transition: 'left .15s',
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
    this.fixedHeight(48).color('surface-muted')
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
  const theme = useTheme();
  const active = theme?.resolveColor('primary-dark') ?? '#357abd';
  const itemBg = theme?.resolveColor('surface-muted') ?? '#f7f7f7';
  const border = theme?.resolveColor('border') ?? '#e8e8e8';
  return (
    <div style={{ width: '100%', height: '100%' }}>
      {items.map(item => (
        <div
          key={item.id}
          onClick={() => cell.setSelected(item.id)}
          style={{
            display: 'flex', alignItems: 'center', padding: '0 10px',
            height: 34, fontSize: 13, cursor: 'pointer', userSelect: 'none',
            boxSizing: 'border-box',
            color: item.id === selected ? (theme?.resolveColor('on-primary') ?? '#fff') : (theme?.resolveColor('text') ?? '#333'),
            backgroundColor: item.id === selected ? active : itemBg,
            borderBottom: `1px solid ${border}`,
          }}
        >
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {item.title}
          </span>
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

/**
 * 窗口关闭按钮视图：点击关闭宿主浮动视口（沿 Box 树向上定位浮动视口根并 close()）。
 * 经 fill 嵌入窗口的任意插槽（通常为 WindowCell 的 title / ModalCell 的 header 右侧），
 * 是"通过 Cell API 嵌入窗口"的关闭按钮（取代 Box 层 FloatingLayer 的硬编码关闭按钮）。
 * @param {{builder: BoxBuilder}} props 组件属性（builder 由 ContentLayer 自动注入，
 *   指向本 Cell 所在 Box 挂载，其 _root 即宿主浮动视口根）
 * @returns {JSX.Element} 视图元素
 */
function WindowCloseView({ builder }) {
  const root = builder?._root;
  if (!root?._isFloatingViewport) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100%', height: '100%',
    }}>
      <FloatingCloseButton builder={root} />
    </div>
  );
}

/**
 * CloseButtonCell：窗口关闭按钮（Cell 版）。固定宽 20px（高度随插槽布局撑满），
 * 内容为 ✕ 按钮，点击关闭宿主浮动视口。经 fill 嵌入窗口标题栏/页眉插槽，
 * 实现"通过 Cell API 嵌入窗口"的关闭按钮（见 WindowCell/ModalCell 使用示例）。
 */
class CloseButtonCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedWidth(20).renderContent(WindowCloseView);
  }
}

// =========================================================================
//  窗口控件结构（chrome）：标题栏内建「标题文本 + 最小化/最大化/关闭」控件
// =========================================================================

/**
 * 窗口控件按钮（最小化/最大化/关闭）：SVG 字形 + 悬停反馈。
 * mousedown 拦截冒泡——标题栏是窗口拖拽点（dragHandle），按钮按下不得触发窗口移动。
 * @param {Object} props 组件属性
 * @param {JSX.Element} props.glyph 控件字形
 * @param {Function} props.onClick 点击回调
 * @param {boolean} [props.danger=false] 悬停是否为危险色（关闭按钮）
 * @param {string} props.color 常态颜色（随标题栏配色）
 * @returns {JSX.Element} 控件按钮元素
 */
function WindowControlButton({ glyph, onClick, danger = false, color }) {
  const [hovered, setHovered] = useState(false);
  const theme = useTheme();
  const dangerColor = theme?.resolveColor('danger') ?? 'rgba(200, 60, 60, 0.9)';
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={e => e.stopPropagation()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 22, height: 22, flexShrink: 0, padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', cursor: 'pointer', userSelect: 'none',
        ...cornerStyle(theme?.getCornerType() || 'g1', 4),
        color,
        backgroundColor: hovered ? (danger ? dangerColor : 'rgba(127, 127, 127, 0.25)') : 'transparent',
      }}
    >
      {glyph}
    </button>
  );
}

/**
 * 窗口控件结构视图（chrome）：订阅宿主窗口 Cell 的 title/maximized/minimized
 * 字段，渲染标题文本与控件按钮组；schema 状态变化经 effect 对齐到 Box 层窗口
 * 状态（toggleMaximize/toggleMinimize）——数据驱动窗口状态。
 * @param {{cell: WindowChromeCell}} props 组件属性
 * @returns {JSX.Element} 控件结构元素
 */
function WindowChromeView({ cell }) {
  const win = cell._window;
  const title = useText(useCellData(win, 'title'));
  const maximized = !!useCellData(win, 'maximized');
  const minimized = !!useCellData(win, 'minimized');
  const theme = useTheme();
  const elemStyle = useElementStyle('window') || {};
  const opts = win._chrome;
  const rawColor = opts.titleColor ?? elemStyle.titleColor ?? 'on-primary';
  const titleColor = theme?.resolveColor(rawColor) ?? rawColor;
  // 数据驱动 → Box 命令应用：schema 状态与 Box 窗口状态不一致时对齐
  //（chrome 挂载发生在窗口挂载级联内，win._mounts[0] 此时已就绪）
  useEffect(() => {
    const root = win._mounts[0]?.box;
    if (!root) return;
    if (!!root._maximized !== maximized) root.toggleMaximize();
    if (!!root._minimized !== minimized) root.toggleMinimize(opts.titleBarHeight);
  }, [win, maximized, minimized, opts]);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      width: '100%', height: '100%', padding: '0 8px 0 12px', boxSizing: 'border-box',
    }}>
      <div style={{
        flex: 1, minWidth: 0, color: titleColor, fontSize: 13, fontWeight: 'bold',
        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
      }}>
        {title}
      </div>
      {opts.controls.minimize && (
        <WindowControlButton color={titleColor} glyph={<GlyphMinus size={12} />}
          onClick={() => win.setMinimized(!minimized)} />
      )}
      {opts.controls.maximize && (
        <WindowControlButton color={titleColor}
          glyph={maximized ? <GlyphRestore size={11} /> : <GlyphMaximize size={11} />}
          onClick={() => win.setMaximized(!maximized)} />
      )}
      {opts.controls.close && (
        <WindowControlButton color={titleColor} danger glyph={<GlyphClose size={12} />}
          onClick={() => win.close()} />
      )}
    </div>
  );
}

/**
 * 窗口控件结构 Cell（chrome）：填充窗口的标题栏插槽，渲染 WindowChromeView。
 * 构造时闭包注入宿主窗口 Cell（订阅其 schema 字段、调用其 API）。
 * 仅供 FloatingWindowCellBase 内建使用，不导出；页面作者 fill 标题栏插槽可
 * 整体替换默认 chrome（单插槽覆盖语义），此时可经 CloseButtonCell 自行嵌入
 * 关闭按钮。
 */
class WindowChromeCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   * @param {CellBaseBuilder} windowCell 宿主窗口 Cell
   */
  constructor(id, windowCell) {
    super(id);
    this._window = windowCell;
    this.renderContent(WindowChromeView);
  }
}

/**
 * 浮动窗口基座（导出供页面作者派生自定义窗口 Cell；core 内置窗口预设
 * WindowCell/ModalCell 同样继承本类）：
 * 内建窗口控件结构（chrome）与窗口样式控制 API。
 * - chrome：标题栏插槽（单插槽）预填 WindowChromeCell，含标题文本（schema
 *   title 字段，i18n key 或纯文本）与最小化/最大化/关闭控件
 * - 窗口状态：schema maximized/minimized 字段（setMaximized/setMinimized
 *   自动生成），数据驱动；chrome 控件点击写入 schema，视图 effect 对齐 Box
 * - 样式控制（链式，挂载前调用生效）：windowControls 控件显隐、
 *   titleBarColor/titleBarHeight 标题栏配色与高度、titleColor 标题文字色；
 *   主题级默认经 theme.elements.window（如 titleColor）声明，实例显式设置优先
 */
class FloatingWindowCellBase extends CellBaseBuilder {
  /**
   * 初始化窗口控件结构：记录 chrome 配置并向标题栏插槽预填 chrome Cell。
   * @param {string} titleSlot 标题栏插槽名（'title' / 'header'）
   * @param {Object} options chrome 配置
   * @param {{minimize?: boolean, maximize?: boolean, close?: boolean}} options.controls 控件显隐
   * @param {number} options.titleBarHeight 标题栏高度（px，兼作最小化卷起保留高度）
   * @param {string} [options.titleColor] 标题文字默认颜色（颜色角色名或字面色值）
   * @returns {void}
   */
  _initChrome(titleSlot, { controls, titleBarHeight, titleColor = null }) {
    this._chrome = { titleSlot, controls: { ...controls }, titleBarHeight, titleColor };
    this.fill(titleSlot, new WindowChromeCell(`${this._id}Chrome`, this));
  }

  /**
   * 窗口控件显隐配置（最小化/最大化/关闭）。
   * @param {Object} controls 控件显隐
   * @param {boolean} [controls.minimize] 是否显示最小化控件
   * @param {boolean} [controls.maximize] 是否显示最大化控件
   * @param {boolean} [controls.close] 是否显示关闭控件
   * @returns {FloatingWindowCellBase} self（链式）
   */
  windowControls({ minimize, maximize, close } = {}) {
    if (minimize !== undefined) this._chrome.controls.minimize = minimize;
    if (maximize !== undefined) this._chrome.controls.maximize = maximize;
    if (close !== undefined) this._chrome.controls.close = close;
    return this;
  }

  /**
   * 设置是否显示最小化控件（卷起为标题栏）。
   * @param {boolean} [enabled=true] 是否显示
   * @returns {FloatingWindowCellBase} self（链式）
   */
  minimizable(enabled = true) { this._chrome.controls.minimize = enabled; return this; }

  /**
   * 设置是否显示最大化控件（铺满可视区域/还原）。
   * @param {boolean} [enabled=true] 是否显示
   * @returns {FloatingWindowCellBase} self（链式）
   */
  maximizable(enabled = true) { this._chrome.controls.maximize = enabled; return this; }

  /**
   * 设置是否显示关闭控件。覆盖基类同名 Box 委托（Box 层 _closable 硬编码按钮
   * 已废弃，关闭按钮由 chrome 承担）。
   * @param {boolean} [enabled=true] 是否显示
   * @returns {FloatingWindowCellBase} self（链式）
   */
  closable(enabled = true) { this._chrome.controls.close = enabled; return this; }

  /**
   * 标题栏底色（颜色角色名或字面色值）。作用于标题栏插槽盒，挂载前调用生效。
   * @param {string} c 颜色角色名或字面色值
   * @returns {FloatingWindowCellBase} self（链式）
   */
  titleBarColor(c) { this._slots.get(this._chrome.titleSlot).config.color = c; return this; }

  /**
   * 标题栏高度（px，兼作最小化卷起保留高度）。挂载前调用生效。
   * @param {number} h 高度（px）
   * @returns {FloatingWindowCellBase} self（链式）
   */
  titleBarHeight(h) {
    this._slots.get(this._chrome.titleSlot).config.fixedHeight = h;
    this._chrome.titleBarHeight = h;
    return this;
  }

  /**
   * 标题文字与控件颜色（颜色角色名或字面色值）；未设置时取
   * theme.elements.window.titleColor，再回退 'on-primary'。
   * @param {string} c 颜色角色名或字面色值
   * @returns {FloatingWindowCellBase} self（链式）
   */
  titleColor(c) { this._chrome.titleColor = c; return this; }
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
  const onPrimary = useThemeColor('on-primary', '#fff');
  useEffect(() => {
    if (!duration || !cell._mounts[0]) return;
    const timer = setTimeout(() => cell.close(), duration);
    return () => clearTimeout(timer);
  }, [duration, cell]);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '0 16px',
      width: '100%', height: '100%', color: onPrimary, fontSize: 13,
    }}>
      {text}
    </div>
  );
}

/**
 * NotificationCell：通知条（浮动视口，胶囊形 + 主色）。默认固定尺寸、不可移动/缩放；
 * 位置由页面作者用 posX/posY 指定（如屏幕右上角），duration（ms）非空时自动关闭。
 * text 存 i18n key 或纯文本。层级由系统管理（后聚焦/出现居上 + 模态序排列）。
 */
class NotificationCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.floatingViewport()
      .movable(false).resizable(false)
      .fixedWidth(280).defaultHeight(48)
      .shape('capsule').color('primary')
      .schema({
        text: { type: 'string', default: '' },
        duration: { type: 'number', default: null },
      })
      .renderContent(NotificationView);
  }
}

/**
 * ModalCell：子窗口对话框预设（浮动视口）。默认固定位置/尺寸、不可移动/缩放；
 * header（单插槽，页眉栏）内建窗口控件结构（chrome：标题文本 + 关闭控件），
 * fill('header', ...) 可整体替换默认 chrome；body（列表插槽，可滚动）由页面
 * 作者填充内容。
 * 父子窗口树模型下（见 docs/floating-window-tree-design.md）：作者用 setParent(windowCell)
 * 声明父窗口（须先挂载父 Cell），需要遮罩时调用父窗口 Cell 的 operable()。
 * 位置/尺寸由页面作者在实例上配置（posX/posY/fixedWidth/... 链式覆盖）。
 *
 * Schema（数据契约）：title（标题文本，i18n key 或纯文本）。
 */
class ModalCell extends FloatingWindowCellBase {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.floatingViewport()
      .movable(false).resizable(false)
      .fixedWidth(320).fixedHeight(200)
      .styleRole('window').layout('vertical')
      .schema({ title: { type: 'string', default: '' } })
      .defineSlot('header', {
        fixedHeight: 44, color: 'surface-muted',
        layout: 'horizontal', moveX: false, moveY: false, single: true,
      })
      .defineSlot('body', { minHeight: 100, moveY: true, layout: 'vertical', color: 'surface' });
    this._initChrome('header', {
      controls: { minimize: false, maximize: false, close: true },
      titleBarHeight: 44,
      titleColor: 'text',
    });
  }
}

/**
 * WindowCell：独立窗口（浮动视口）。默认可移动（标题栏为拖拽点）、可调整大小；
 * title（单插槽，标题栏，拖拽点）内建窗口控件结构（chrome：标题文本 +
 * 最小化/最大化/关闭控件），fill('title', ...) 可整体替换默认 chrome；
 * body（列表插槽，可滚动）由页面作者填充内容。
 * 位置/尺寸由页面作者在实例上配置；标题经 setTitle（i18n key 或纯文本）；
 * 窗口状态 setMaximized/setMinimized（数据驱动，chrome 控件联动）。
 *
 * Schema（数据契约）：title / maximized / minimized。
 */
class WindowCell extends FloatingWindowCellBase {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.floatingViewport()
      .movable(true).resizable(true)
      .fixedWidth(320).fixedHeight(200)
      .styleRole('window').layout('vertical')
      .schema({
        title: { type: 'string', default: '' },
        maximized: { type: 'boolean', default: false },
        minimized: { type: 'boolean', default: false },
      })
      .defineSlot('title', {
        fixedHeight: 36, color: 'primary', dragHandle: true,
        layout: 'horizontal', moveX: false, moveY: false, single: true,
      })
      .defineSlot('body', { minHeight: 120, moveY: true, layout: 'vertical', color: 'surface' });
    this._initChrome('title', {
      controls: { minimize: true, maximize: true, close: true },
      titleBarHeight: 36,
      titleColor: 'on-primary',
    });
  }
}

export { TextCell, TextImpl, ButtonCell, InputCell, ToggleCell, ListCell, CloseButtonCell, NotificationCell, FloatingWindowCellBase, ModalCell, WindowCell };
