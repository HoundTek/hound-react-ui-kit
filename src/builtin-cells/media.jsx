/**
 * @file media.jsx —— MediaCell（媒体）预设
 *
 * 展示图片/视频/音频：type 决定渲染元素（image 用 img，video/audio 用
 * 原生 controls），src 为资源地址，caption（i18n key 或纯文本）非空时
 * 显示在底部。纯展示型预设，无交互、无外部依赖。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 媒体视图：订阅 type/src/caption，按类型渲染媒体元素与说明文字。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function MediaView({ cell }) {
  const type = useCellData(cell, 'type');
  const src = useCellData(cell, 'src');
  const caption = useText(useCellData(cell, 'caption'));
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', boxSizing: 'border-box', overflow: 'hidden',
    }}>
      {type === 'image' && src ? (
        <img
          src={src}
          alt={caption}
          style={{ width: '100%', flex: 1, objectFit: 'cover', minHeight: 0, display: 'block' }}
        />
      ) : null}
      {type === 'video' ? (
        <video src={src} controls style={{ width: '100%', flex: 1, minHeight: 0, display: 'block' }} />
      ) : null}
      {type === 'audio' ? (
        <audio src={src} controls style={{ width: '100%', display: 'block' }} />
      ) : null}
      {caption ? (
        <div style={{ fontSize: 12, color: '#999999', padding: '4px 12px', textAlign: 'center' }}>{caption}</div>
      ) : null}
    </div>
  );
}

/**
 * MediaCell：媒体。type 为 image/video/audio，src 为资源地址；
 * caption 存 i18n key 或纯文本（非空时显示在底部）。最小高度 120。
 */
class MediaCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.minHeight(120).backgroundColor('#ffffff')
      .schema({
        type: { type: 'string', default: 'image' },
        src: { type: 'string', default: '' },
        caption: { type: 'string', default: '' },
      })
      .renderContent(MediaView);
  }
}

export { MediaCell };