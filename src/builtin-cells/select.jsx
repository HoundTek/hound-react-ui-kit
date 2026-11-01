/**
 * @file select.jsx —— SelectCell（下拉选择）高级 Cell
 *
 * 菜单族：下拉选择 = 输入条（按钮）+ 菜单（见 docs/basic-cell-design.md）。
 * SelectImpl 为族内共享实现组件（纯受控：ButtonImpl 输入条 + MenuImpl
 * 下拉列表），供 picker 复用；取代旧版原生 <select>（浏览器黑盒控件，
 * 不属于 UI Kit 体系）。
 * 主题可经 theme.components.select 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：options / value / placeholder。
 */
import React, { useEffect, useRef, useState } from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor, useCornerType, useShapeRadius } from '../core/theme/theme-react';
import { cornerStyle } from '../core/theme/shape';
import { ButtonImpl } from '../basic-cells/button';
import { GlyphChevron } from '../basic-cells/glyphs';
import { MenuImpl } from './menu';
import { ViewScrollArea } from '../core/box/floating-scrollbar';

/**
 * 下拉选项列表（拆为子组件：MenuImpl 项标题经 useText 渲染）。
 * @param {{options: object[], value: string, onPick: Function}} props 组件属性
 * @returns {JSX.Element} 下拉元素
 */
function SelectDropdown({ options, value, onPick }) {
  const corner = useCornerType();
  const overlayR = useShapeRadius('overlay', 8);
  const surface = useThemeColor('surface', '#fff');
  const border = useThemeColor('border', '#e8e8e8');
  return (
    <div style={{
      position: 'absolute', top: '100%', left: 8, right: 8, zIndex: 10,
      ...cornerStyle(corner, overlayR), backgroundColor: surface,
      border: `1px solid ${border}`, boxSizing: 'border-box', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    }}>
      {/* 下拉列表为内容自适应限高的内部滚动区，经 ViewScrollArea 获得
          浮动滚动条与滚轮阻尼（无 style：滚动容器在流内，maxHeight 限高） */}
      <ViewScrollArea scrollStyle={{ maxHeight: 200 }}>
        <MenuImpl items={options} activeId={value} direction="vertical" onSelect={onPick}
          role="listbox" itemRole="option" />
      </ViewScrollArea>
    </div>
  );
}

/**
 * 下拉选择实现组件（纯受控，组装自 ButtonImpl + MenuImpl）：输入条显示
 * 选中项标题（未选中显示占位），点击展开/收起下拉；选中后收起。
 * open 受控（传入时）或内部自管理（未传入时）。
 * 键盘可达（WAI-ARIA）：触发器为原生 <button>（隐式 role=button），经 ref
 * 同步 aria-haspopup="listbox" / aria-expanded；Enter/Space/ArrowDown 展开
 * 并把焦点移入选中项（无选中则首项），Escape 收起并回焦触发器；选项列表为
 * listbox/option（经 MenuImpl 角色覆盖），方向键在项间导航，Enter/Space
 * 选中（与鼠标点击同一 onChange 路径），选中后焦点回触发器。
 * ButtonImpl 未透传 aria-* 属性，故渲染后同步到 <button> DOM。
 * @param {Object} props
 * @param {Array<{id: string, title: string}>} props.options 候选列表
 * @param {string} props.value 选中项 id（'' 表示未选）
 * @param {string} [props.placeholder] 占位文本（i18n key 或纯文本）
 * @param {boolean} [props.open] 下拉展开状态（受控，可选）
 * @param {(open: boolean) => void} [props.onToggle] 展开状态变更回调（受控时）
 * @param {(id: string) => void} props.onChange 选中回调
 * @returns {JSX.Element} 下拉选择元素
 */
function SelectImpl({ options, value, placeholder, open, onToggle, onChange }) {
  const [innerOpen, setInnerOpen] = useState(false);
  const controlled = open !== undefined;
  const isOpen = controlled ? open : innerOpen;
  const setOpen = controlled ? (onToggle || (() => {})) : setInnerOpen;
  const ph = useText(placeholder || '');
  const current = (options || []).find(o => o.id === value);
  const textMuted = useThemeColor('text-muted', '#999');
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const focusListRef = useRef(false);

  // ARIA 透传：触发器展开态同步到其 <button> DOM
  useEffect(() => {
    const btn = triggerRef.current && triggerRef.current.querySelector('button');
    if (!btn) return;
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }, [isOpen]);

  // 键盘展开后把焦点移入选中项（无选中则首项）：子组件 MenuImpl 的角色/
  // aria-selected 同步 effect 先于本 effect 执行，[role=option] 此时已可查
  useEffect(() => {
    if (!isOpen || !focusListRef.current) return;
    focusListRef.current = false;
    const root = rootRef.current;
    if (!root) return;
    const opts = Array.from(root.querySelectorAll('[role="option"]'));
    const target = opts.find(o => o.getAttribute('aria-selected') === 'true') || opts[0];
    if (target) target.focus();
  }, [isOpen]);

  const focusTrigger = () => {
    const btn = triggerRef.current && triggerRef.current.querySelector('button');
    if (btn) btn.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setOpen(false);
        focusTrigger();
      }
      return;
    }
    if (isOpen) return; // 展开后方向键/Enter/Space 由 MenuImpl 列表层处理
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
    <div ref={rootRef} onKeyDown={onKeyDown} style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', padding: '0 8px', boxSizing: 'border-box' }}>
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
      {isOpen ? (
        <SelectDropdown
          options={options}
          value={value}
          onPick={(id) => { onChange(id); setOpen(false); focusTrigger(); }}
        />
      ) : null}
    </div>
  );
}

/**
 * 下拉选择组装视图（fallback）：SelectImpl（open 内部自管理）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function SelectAssembledView({ cell }) {
  const options = useCellData(cell, 'options') || [];
  const value = useCellData(cell, 'value');
  const placeholder = useCellData(cell, 'placeholder');
  return (
    <SelectImpl options={options} value={value} placeholder={placeholder} onChange={id => cell.setValue(id)} />
  );
}

/** kind 'select' 的实现分发视图 */
const SelectDispatcher = createImplDispatcher('select', SelectAssembledView);

/**
 * SelectCell：下拉选择（高级 Cell，菜单族）。options 为 [{id, title}] 候选
 * 列表，value 存选中项 id（未选时为 ''），placeholder 为占位文本。
 * 呈现实现由 kind 'select' 分发（缺省为按钮+菜单组装版）。
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

export { SelectCell, SelectImpl, SelectAssembledView };
