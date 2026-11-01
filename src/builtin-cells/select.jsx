/**
 * @file select.jsx —— SelectCell（下拉选择）高级 Cell
 *
 * 菜单族：下拉选择 = 输入条（按钮）+ 菜单（见 docs/basic-cell-design.md）。
 * SelectImpl 为族内共享实现组件（纯受控：ButtonImpl 输入条 + 下拉菜单伪窗口），
 * 供 picker 复用；取代旧版原生 <select>（浏览器黑盒控件，不属于 UI Kit 体系）。
 * 主题可经 theme.components.select 整体重写呈现实现。
 *
 * 下拉菜单按「伪窗口」实现（见 docs/floating-window-tree-design.md）：选项列表
 * 作为独立浮动视口（SelectMenuWindowCell）挂载，不绝对定位在 Cell 内容层内——
 * 内容层带 overflow 裁切，原位下拉会被父容器剪掉。伪窗口按触发器的屏幕矩形
 * 定位（宽度对齐触发器，下方空间不足时翻到上方），页面滚动/窗口缩放时跟随；
 * 关闭时机：选中、点击窗口外、Escape、触发器卸载。
 *
 * Schema（数据契约，与旧版一致）：options / value / placeholder。
 */
import React, { useEffect, useRef, useState } from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor } from '../core/theme/theme-react';
import { stateLayerProps } from '../core/theme/state-layer';
import { ButtonImpl } from '../basic-cells/button';
import { GlyphChevron, GlyphCheck } from '../basic-cells/glyphs';
import { syncFloatingFrame } from '../core/box/box-component';
import { placePopover } from './popover-anchor';

/** 下拉项行高（紧凑菜单项，px） */
const MENU_ROW_H = 32;
/** 下拉伪窗口内边距（px） */
const MENU_PAD = 4;
/** 下拉伪窗口最大高度（px），超出后由 Box 内容层滚动 */
const MENU_MAX_H = 240;
/** 下拉伪窗口最小宽度（px） */
const MENU_MIN_W = 160;

/** 下拉伪窗口 Cell id 计数器（同一父数据节点下需唯一段名） */
let _menuSeq = 0;

/**
 * 下拉选项行（拆为子组件：标题经 useText 渲染）。
 * @param {Object} props 组件属性
 * @param {string} props.title 选项标题（i18n key 或纯文本）
 * @param {boolean} props.selected 是否选中
 * @param {string} props.textColor 常规文字色
 * @param {string} props.selectedBg 选中项底色
 * @param {() => void} props.onPick 选中回调
 * @returns {JSX.Element} 选项行
 */
function SelectMenuRow({ title, selected, textColor, selectedBg, onPick }) {
  const label = useText(title || '');
  const state = stateLayerProps(textColor);
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected ? 'true' : 'false'}
      onClick={onPick}
      className={`${state.className} hk-focus hk-press`}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', height: MENU_ROW_H, flexShrink: 0,
        padding: '0 12px', boxSizing: 'border-box',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        fontSize: 13, fontWeight: selected ? 600 : 400,
        backgroundColor: selected ? selectedBg : 'transparent',
        color: textColor,
        whiteSpace: 'nowrap', overflow: 'hidden',
        ...state.style,
      }}
    >
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      {selected ? <GlyphCheck size={14} /> : null}
    </button>
  );
}

/**
 * 下拉选项视图（伪窗口内容）：listbox + option 行，方向键在项间移动焦点，
 * Enter/Space 经原生按钮 click 选中（Escape 由触发器侧统一处理）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 下拉视图元素
 */
function SelectMenuView({ cell }) {
  const options = useCellData(cell, 'options') || [];
  const value = useCellData(cell, 'value');
  const autoFocus = useCellData(cell, 'autoFocus');
  const label = useCellData(cell, 'label');
  const listLabel = useText(label || '');
  const textColor = useThemeColor('text', '#1D1B20');
  const selectedBg = useThemeColor('primary-soft', '#EADDFF');
  const selectedText = useThemeColor('primary', '#6750A4');
  const listRef = useRef(null);

  // 键盘展开时把焦点移入选中项（无选中则首项）
  useEffect(() => {
    if (!autoFocus) return;
    const root = listRef.current;
    if (!root) return;
    const rows = Array.from(root.querySelectorAll('[role="option"]'));
    const target = rows.find(r => r.getAttribute('aria-selected') === 'true') || rows[0];
    if (target) target.focus();
  }, [autoFocus]);

  const onKeyDown = (e) => {
    const root = listRef.current;
    if (!root) return;
    const rows = Array.from(root.querySelectorAll('[role="option"]'));
    if (!rows.length) return;
    const idx = rows.indexOf(document.activeElement);
    let next = -1;
    if (e.key === 'ArrowDown') next = idx < 0 ? 0 : (idx + 1) % rows.length;
    else if (e.key === 'ArrowUp') next = idx < 0 ? rows.length - 1 : (idx - 1 + rows.length) % rows.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = rows.length - 1;
    if (next < 0) return;
    e.preventDefault();
    rows[next].focus();
  };

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label={listLabel || undefined}
      data-hk-select-menu=""
      onKeyDown={onKeyDown}
      style={{ width: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {options.map(o => (
        <SelectMenuRow
          key={o.id}
          title={o.title}
          selected={o.id === value}
          textColor={o.id === value ? selectedText : textColor}
          selectedBg={selectedBg}
          onPick={() => cell.emit('pick', o.id)}
        />
      ))}
    </div>
  );
}

/**
 * 下拉菜单伪窗口 Cell：浮动视口 + overlay 圆角 + surface 底色，阴影/描边
 * 由浮动窗口框架统一给出；纵向排列、可滚动（选项超出一屏时内容层滚动）。
 * 选项选中经 emit('pick', id) 回传给触发器侧。
 */
class SelectMenuWindowCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.floatingViewport()
      .movable(false).resizable(false)
      .styleRole('overlay').color('surface')
      .layout('vertical').moveY(true)
      .padding(MENU_PAD)
      .schema({
        options: { type: 'array', default: [] },
        value: { type: 'string', default: '' },
        label: { type: 'string', default: '' },
        autoFocus: { type: 'boolean', default: false },
      })
      .renderContent(SelectMenuView);
  }
}

/**
 * 计算下拉伪窗口落点：规则见 popover-anchor（下方优先、空间不足上翻、
 * 水平对齐触发器并钳制在可视区域内）。
 * @param {DOMRect} rect 触发器屏幕矩形
 * @param {number} w 窗口宽度
 * @param {number} h 窗口高度
 * @returns {{x: number, y: number}} 屏幕坐标
 */
const placeMenu = placePopover;

/**
 * 打开下拉伪窗口：把选项列表作为浮动视口挂到 Cell 树根上，按触发器屏幕矩形定位。
 * 返回控制器（cell / reposition / close），调用方负责在关闭时 close()。
 * @param {Object} p 参数
 * @param {import('../core/data-dag/data-dag').DataNode} p.parentNode 挂载父数据节点
 * @param {HTMLElement} p.trigger 触发器元素（定位依据）
 * @param {string} p.label 触发条文本（listbox 的 aria-label）
 * @param {boolean} p.autoFocus 是否把焦点移入列表
 * @param {Array<{id: string, title: string}>} p.options 选项列表（决定窗口高度）
 * @param {string} p.value 选中项 id
 * @param {(id: string) => void} p.onPick 选中回调
 * @returns {{cell: SelectMenuWindowCell, reposition: Function, close: Function}|null} 控制器
 */
function openMenuWindow({ parentNode, trigger, label, autoFocus, options, value, onPick }) {
  if (!parentNode || !trigger) return null;
  const rect = trigger.getBoundingClientRect();
  const w = Math.max(MENU_MIN_W, Math.round(rect.width));
  const h = Math.min((options || []).length * MENU_ROW_H + MENU_PAD * 2, MENU_MAX_H);
  const { x, y } = placeMenu(rect, w, h);
  const cell = new SelectMenuWindowCell(`hk-select-menu-${++_menuSeq}`);
  cell.fixedWidth(w).fixedHeight(Math.max(MENU_ROW_H + MENU_PAD * 2, h)).posX(x).posY(y);
  cell.setLabel(label || '').setAutoFocus(autoFocus).setOptions(options || []).setValue(value || '');
  cell.on('pick', onPick);
  cell.mount(parentNode);

  /** 按最新触发器矩形重定位（页面滚动/窗口缩放时跟随） */
  const reposition = () => {
    const box = cell._mounts[0]?.box;
    if (!box) return;
    const next = placeMenu(trigger.getBoundingClientRect(), w, h);
    box.posX(next.x).posY(next.y);
    syncFloatingFrame(box);
  };

  /** 关闭并释放伪窗口（一次性实例，不复用） */
  const close = () => cell.destroy();

  return { cell, reposition, close };
}

/**
 * 下拉选择实现组件（纯受控，组装自 ButtonImpl + 下拉伪窗口）：输入条显示
 * 选中项标题（未选中显示占位），点击展开/收起下拉；选中后收起。
 * open 受控（传入时）或内部自管理（未传入时）。
 * 键盘可达（WAI-ARIA）：触发器为原生 <button>（隐式 role=button），经 ref
 * 同步 aria-haspopup="listbox" / aria-expanded；Enter/Space/ArrowDown 展开
 * 并把焦点移入选中项（无选中则首项），Escape 收起并回焦触发器；选项列表为
 * listbox/option（伪窗口内），方向键在项间导航，Enter/Space 选中，选中后
 * 焦点回触发器。ButtonImpl 未透传 aria-* 属性，故渲染后同步到 <button> DOM。
 * @param {Object} props
 * @param {Array<{id: string, title: string}>} props.options 候选列表
 * @param {string} props.value 选中项 id（'' 表示未选）
 * @param {string} [props.placeholder] 占位文本（i18n key 或纯文本）
 * @param {boolean} [props.open] 下拉展开状态（受控，可选）
 * @param {(open: boolean) => void} [props.onToggle] 展开状态变更回调（受控时）
 * @param {(id: string) => void} props.onChange 选中回调
 * @param {CellBaseBuilder} [props.owner] 宿主 Cell（提供数据树根，用于挂载伪窗口）
 * @returns {JSX.Element} 下拉选择元素
 */
function SelectImpl({ options, value, placeholder, open, onToggle, onChange, owner }) {
  const [innerOpen, setInnerOpen] = useState(false);
  const controlled = open !== undefined;
  const isOpen = controlled ? open : innerOpen;
  const setOpen = controlled ? (onToggle || (() => {})) : setInnerOpen;
  const ph = useText(placeholder || '');
  const current = (options || []).find(o => o.id === value);
  const textMuted = useThemeColor('text-muted', '#999');
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const focusListRef = useRef(false);
  /** 最新渲染值（伪窗口创建/选项同步时读取，避免回调身份变化触发重建） */
  const latestRef = useRef({ options: [], value: '', onChange, label: '' });

  // 触发条文本（listbox 的读屏名称）：选中项标题或占位文本
  useEffect(() => {
    latestRef.current = {
      options: options || [],
      value: value || '',
      onChange,
      label: current ? current.title : ph,
    };
  }, [options, value, onChange, current, ph]);

  // ARIA 透传：触发器展开态同步到其 <button> DOM
  useEffect(() => {
    const btn = triggerRef.current && triggerRef.current.querySelector('button');
    if (!btn) return;
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }, [isOpen]);

  const focusTrigger = () => {
    const btn = triggerRef.current && triggerRef.current.querySelector('button');
    if (btn) btn.focus();
  };

  // 展开时创建伪窗口；收起（含选中、外部点击、Escape、卸载）时销毁
  useEffect(() => {
    if (!isOpen) return undefined;
    const trigger = triggerRef.current && triggerRef.current.querySelector('button');
    const menu = openMenuWindow({
      parentNode: owner?._dataNode?.root,
      trigger,
      label: latestRef.current.label,
      autoFocus: focusListRef.current,
      options: latestRef.current.options,
      value: latestRef.current.value,
      onPick: (id) => {
        latestRef.current.onChange?.(id);
        setOpen(false);
        focusTrigger();
      },
    });
    focusListRef.current = false;
    if (!menu) return undefined;
    menuRef.current = menu;
    const onScroll = () => menu.reposition();
    const onResize = () => menu.reposition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      menu.close();
      menuRef.current = null;
    };
  }, [isOpen, owner]);

  // 展开期间选项/选中值变化时同步到伪窗口
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    menu.cell.setOptions(options || []).setValue(value || '');
  }, [options, value]);

  // 展开期间：Escape 收起并回焦触发器；点击伪窗口与触发器之外收起
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      focusTrigger();
    };
    const onPointerDown = (e) => {
      const t = e.target;
      if (!t || typeof t.closest !== 'function') return;
      if (t.closest('[data-hk-select-trigger]') || t.closest('[data-hk-select-menu]')) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('mousedown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('mousedown', onPointerDown, true);
    };
  }, [isOpen, setOpen]);

  const onKeyDown = (e) => {
    if (isOpen) return; // 展开后方向键/Enter/Space 由伪窗口列表层处理
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusListRef.current = true;
      setOpen(true);
    } else if (e.key === 'Enter' || e.key === ' ') {
      // Enter/Space 已由原生按钮 click 切换展开，仅标记随后把焦点移入列表
      focusListRef.current = true;
    }
  };

  return (
    <div
      data-hk-select-trigger=""
      onKeyDown={onKeyDown}
      style={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center',
        padding: '0 8px', boxSizing: 'border-box',
      }}
    >
      <div ref={triggerRef} style={{ flex: 1, minWidth: 0, color: current ? undefined : textMuted }}>
        <ButtonImpl
          label={current ? current.title : ph}
          icon={<GlyphChevron dir={isOpen ? 'up' : 'down'} size={14} />}
          type="default"
          block
          align="left"
          onPress={() => setOpen(!isOpen)}
        />
      </div>
      {/* 展开态由伪窗口承载（浮动视口，脱离内容层，不受父容器裁切） */}
    </div>
  );
}

/**
 * 下拉选择组装视图（fallback）：SelectImpl（open 内部自管理，伪窗口挂到
 * 本 Cell 的数据树根上）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function SelectAssembledView({ cell }) {
  const options = useCellData(cell, 'options') || [];
  const value = useCellData(cell, 'value');
  const placeholder = useCellData(cell, 'placeholder');
  return (
    <SelectImpl
      options={options}
      value={value}
      placeholder={placeholder}
      owner={cell}
      onChange={id => cell.setValue(id)}
    />
  );
}

/** kind 'select' 的实现分发视图 */
const SelectDispatcher = createImplDispatcher('select', SelectAssembledView);

/**
 * SelectCell：下拉选择（高级 Cell，菜单族）。options 为 [{id, title}] 候选
 * 列表，value 存选中项 id（未选时为 ''），placeholder 为占位文本。
 * 呈现实现由 kind 'select' 分发（缺省为按钮+下拉伪窗口组装版）。
 */
class SelectCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40)
      .schema({
        options: { type: 'array', default: [] },
        value: { type: 'string', default: '' },
        placeholder: { type: 'string', default: '' },
      })
      .renderContent(SelectDispatcher);
  }
}

export { SelectCell, SelectImpl, SelectAssembledView, SelectMenuWindowCell };
