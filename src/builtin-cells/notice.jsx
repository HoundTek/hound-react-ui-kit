/**
 * @file notice.jsx —— NoticeCell（公告条）高级 Cell
 *
 * 浮层族：公告/警示/消息/提示条的统一实现（见 docs/basic-cell-design.md）。
 * NoticeImpl 为族内共享实现组件（纯受控：字形 + 文本 + type 语义色 +
 * 可选关闭钮），toast / message / notice / alert 四个 Cell 共用——
 * 消灭原先的重复实现。
 * 主题可经 theme.components.notice 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：text / type / closable / visible。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor, useCornerType } from '../core/theme/theme-react';
import { cornerStyle, CAPSULE_RADIUS, hexToRgba } from '../core/theme/shape';
import { supportsColorMix } from '../core/theme/state-layer';
import { GlyphCheck, GlyphClose, GlyphInfo, GlyphWarning } from '../basic-cells/glyphs';

/**
 * 语义色浅底（tonal 变体）：hex 直接预算 rgba，非 hex 走 color-mix，
 * 引擎不支持时退回透明（等价于纯描边形态）。
 * @param {string} color 语义色
 * @param {number} alpha 透明度（0~1）
 * @returns {string} CSS 颜色
 */
const tint = (color, alpha) => {
  const rgba = hexToRgba(color, alpha);
  if (rgba) return rgba;
  return supportsColorMix()
    ? `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`
    : 'transparent';
};

/**
 * 公告条实现组件（纯受控）：type 决定语义色与字形（info/success/warning/error），
 * closable 时右侧 ✕ 触发 onClose；capsule 为胶囊形（toast 用）。
 * variant 决定配色：filled 为语义色实底 + on-primary 文字（浮层/悬浮场景），
 * tonal 为语义色浅底 + 语义色文字 + 细描边（内联提示场景，与页面更融洽）。
 * @param {Object} props
 * @param {string} props.text 文本（i18n key 或纯文本）
 * @param {'info'|'success'|'warning'|'error'} [props.type='info'] 语义类型
 * @param {'filled'|'tonal'} [props.variant='filled'] 配色变体
 * @param {boolean} [props.closable=false] 是否显示关闭钮
 * @param {boolean} [props.capsule=false] 是否胶囊形
 * @param {boolean} [props.elevated=false] 是否带投影（浮动场景）
 * @param {() => void} [props.onClose] 关闭回调
 * @returns {JSX.Element} 公告条元素
 */
function NoticeImpl({
  text, type = 'info', variant = 'filled', closable = false, capsule = false, elevated = false, onClose,
}) {
  const content = useText(text);
  const corner = useCornerType();
  const infoColor = useThemeColor('primary', '#4a90d9');
  const successColor = useThemeColor('success', '#1a8a4a');
  const warningColor = useThemeColor('warning', '#c07a1a');
  const errorColor = useThemeColor('danger', '#c03a2a');
  const onPrimary = useThemeColor('on-primary', '#ffffff');
  const typeMap = {
    info: { color: infoColor, Glyph: GlyphInfo },
    success: { color: successColor, Glyph: GlyphCheck },
    warning: { color: warningColor, Glyph: GlyphWarning },
    error: { color: errorColor, Glyph: GlyphClose },
  };
  const t = typeMap[type] || typeMap.info;
  const tonal = variant === 'tonal';
  // a11y：动态通知语义——error 走 assertive alert，其余走 polite status，
  // 屏幕阅读器在文本变化（Toast/Notice 出现与更新）时播报
  const isError = type === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: 8, padding: '0 12px', boxSizing: 'border-box',
      backgroundColor: tonal ? tint(t.color, 0.12) : t.color,
      color: tonal ? t.color : onPrimary, fontSize: 12,
      ...cornerStyle(corner, capsule ? CAPSULE_RADIUS : 0),
      ...(tonal ? { boxShadow: `inset 0 0 0 1px ${tint(t.color, 0.36)}` } : {}),
      ...(elevated ? { boxShadow: '0 4px 12px rgba(0,0,0,0.2)' } : {}),
    }}>
      <t.Glyph size={12} />
      <span style={{ fontSize: 12, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{content}</span>
      {closable ? (
        <button
          type="button"
          onClick={onClose}
          className="hk-focus hk-press"
          aria-label="关闭"
          style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 2, border: 'none', background: 'transparent', color: 'inherit',
            cursor: 'pointer', borderRadius: 9999, flexShrink: 0,
          }}
        >
          <GlyphClose size={12} />
        </button>
      ) : null}
    </div>
  );
}

/**
 * 公告条组装视图（fallback）：NoticeImpl；visible 为 false 时不渲染，
 * 关闭钮写入 visible(false)。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element|null} 视图元素
 */
function NoticeAssembledView({ cell }) {
  const text = useCellData(cell, 'text');
  const type = useCellData(cell, 'type');
  const closable = useCellData(cell, 'closable');
  const visible = useCellData(cell, 'visible');
  if (!visible) return null;
  return <NoticeImpl text={text} type={type} variant="tonal" closable={closable} onClose={() => cell.setVisible(false)} />;
}

/** kind 'notice' 的实现分发视图 */
const NoticeDispatcher = createImplDispatcher('notice', NoticeAssembledView);

/**
 * NoticeCell：公告条（高级 Cell，浮层族，非浮动）。text 存 i18n key 或纯文本，
 * type 决定语义色；closable 为 true 时显示关闭按钮，visible 控制可见性。
 * 内联形态取 tonal 配色（语义色浅底 + 语义色文字 + 细描边），与 AlertCell
 * 同为固定高度 40，两者尺寸一致。
 * 呈现实现由 kind 'notice' 分发（缺省为 NoticeImpl 组装版）。
 */
class NoticeCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.fixedHeight(40).layout('horizontal')
      .schema({
        text: { type: 'string', default: '' },
        type: { type: 'string', default: 'info' },
        closable: { type: 'boolean', default: false },
        visible: { type: 'boolean', default: true },
      })
      .renderContent(NoticeDispatcher);
  }
}

export { NoticeCell, NoticeImpl, NoticeAssembledView };
