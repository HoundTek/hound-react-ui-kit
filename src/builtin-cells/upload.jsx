/**
 * @file upload.jsx —— UploadCell（上传）预设
 *
 * 上传入口 + 文件列表：text 为按钮文案（存 i18n key 或纯文本），fileList 为
 * [{id, name, size}] 文件列表，accept 预留的文件类型限制。点击按钮追加一个
 * 模拟文件并调用注入的 _onUpload() 回调（页面作者经 onUpload 注入）；
 * 列表项 ✕ 移除。帧内纵向滚动（moveY true）。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData } from '../core/cell/cell-react';
import { useText } from '../core/i18n/i18n-react';

/**
 * 上传视图：订阅 text/fileList，点击按钮追加文件并回调 _onUpload，✕ 移除文件。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function UploadView({ cell }) {
  const text = useText(useCellData(cell, 'text'));
  const fileList = useCellData(cell, 'fileList') || [];
  const addFile = () => {
    cell.setFileList([...fileList, { id: String(Date.now()), name: 'file.txt', size: 1024 }]);
    if (cell._onUpload) cell._onUpload();
  };
  const removeFile = (id) => {
    cell.setFileList(fileList.filter(f => f.id !== id));
  };
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0', borderBottom: '1px solid #e8e8e8' }}>
        <button
          type="button"
          onClick={addFile}
          style={{
            backgroundColor: '#4a90d9', color: '#fff', border: 'none', borderRadius: 4,
            padding: '6px 16px', fontSize: 13, cursor: 'pointer', userSelect: 'none',
          }}
        >
          {text}
        </button>
      </div>
      {fileList.map(file => (
        <div
          key={file.id}
          style={{
            display: 'flex', alignItems: 'center', height: 32, padding: '0 12px',
            fontSize: 12, borderBottom: '1px solid #e8e8e8',
          }}
        >
          <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#333' }}>{file.name}</span>
          <span style={{ flexShrink: 0, marginLeft: 8, color: '#999' }}>{(file.size / 1024).toFixed(1)} KB</span>
          <span
            onClick={() => removeFile(file.id)}
            style={{ flexShrink: 0, marginLeft: 8, cursor: 'pointer', color: '#999', userSelect: 'none' }}
          >
            ✕
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * UploadCell：上传。text 为按钮文案（可存 i18n key 或纯文本，默认"选择文件"），
 * fileList 为文件列表（[{id, name, size}]），accept 预留文件类型限制；
 * 页面作者可用 onUpload(handler) 注入上传回调。默认宽 240。
 */
class UploadCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.defaultWidth(240).moveY(true).layout('vertical').backgroundColor('#ffffff')
      .schema({
        text: { type: 'string', default: '选择文件' },
        fileList: { type: 'array', default: [] },
        accept: { type: 'string', default: '' },
      })
      .renderContent(UploadView);
  }

  /**
   * 注入上传回调：点击上传按钮追加文件后调用 handler()。
   * @param {Function} handler 上传回调
   * @returns {UploadCell} self（链式）
   */
  onUpload(handler) {
    this._onUpload = handler;
    return this;
  }
}

export { UploadCell };
