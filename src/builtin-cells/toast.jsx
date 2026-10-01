/**
 * @file toast.jsx —— ToastCell（轻提示）预设
 *
 * 浮动构件（Cell × 浮动视口）：屏幕角落的轻提示条。type 决定底色与字形
 * （info/success/warning/error），text 存 i18n key 或纯文本；
 * duration（ms）非空时定时 close() 自动消失。
 * 位置由页面作者用 posX/posY 指定；层级由系统管理（后聚焦/出现居上）。
 */
import React, { useEffect } from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';
import { useThemeColor, useCornerType, useShapeRadius } from '../core/theme/theme-react';
import { cornerStyle } from '../core/theme/shape';

/**
 * 轻提示视图：订阅 text/type/duration；duration 非空时定时调用 cell.close()。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function ToastView({ cell }) {
  const text = useText(useCellData(cell, 'text'));
  const type = useCellData(cell, 'type');
  const duration = useCellData(cell, 'duration');
  const infoColor = useThemeColor('primary', '#4a90d9');
  const successColor = useThemeColor('success', '#1a8a4a');
  const warningColor = useThemeColor('warning', '#c07a1a');
  const errorColor = useThemeColor('danger', '#c03a2a');
  const onPrimary = useThemeColor('on-primary', '#fff');
  const corner = useCornerType();
  const overlayR = useShapeRadius('overlay', 6);
  useEffect(() => {
    if (!duration || !cell._mounts[0]) return;
    const timer = setTimeout(() => cell.close(), duration);
    return () => clearTimeout(timer);
  }, [duration, cell]);
  const typeMap = {
    info: { color: infoColor, glyph: 'ℹ' },
    success: { color: successColor, glyph: '✓' },
    warning: { color: warningColor, glyph: '!' },
    error: { color: errorColor, glyph: '✕' },
  };
  const t = typeMap[type] || typeMap.info;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px',
      width: '100%', height: '100%', color: onPrimary, fontSize: 13,
      backgroundColor: t.color, ...cornerStyle(corner, overlayR), boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    }}>
      <span style={{ fontWeight: 'bold' }}>{t.glyph}</span>
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</span>
    </div>
  );
}

/**
 * ToastCell：轻提示（浮动视口）。默认固定尺寸、不可移动/缩放；
 * type 决定底色（info/success/warning/error），text 存 i18n key 或纯文本，
 * duration（ms）非空时自动关闭。位置由页面作者用 posX/posY 指定。
 */
class ToastCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.floatingViewport()
      .movable(false).resizable(false)
      .fixedWidth(240).defaultHeight(40)
      .schema({
        text: { type: 'string', default: '' },
        type: { type: 'string', default: 'info' },
        duration: { type: 'number', default: null },
      })
      .renderContent(ToastView);
  }
}

export { ToastCell };
