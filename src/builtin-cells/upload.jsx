/**
 * @file upload.jsx —— UploadCell（上传）高级 Cell
 *
 * 按钮族：上传 = 触发按钮 + 文件行（见 docs/basic-cell-design.md）。
 * 组装 fallback：ButtonImpl「选择文件」（text 存 i18n key 或纯文本），
 * 点击追加一个模拟文件并调用注入的 _onUpload() 回调（页面作者经
 * onUpload 注入）；文件行为 TextImpl 文件名 + 大小 + ✕ 删除按钮。
 * 主题可经 theme.components.upload 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：text / fileList / accept。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useThemeColor } from '../core/theme/theme-react';
import { ButtonImpl, TextImpl } from '../basic-cells';
import { GlyphClose } from '../basic-cells/glyphs';

/**
 * 上传组装视图（fallback）：ButtonImpl 上传入口 + 文件列表（✕ 移除）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function UploadAssembledView({ cell }) {
  const text = useCellData(cell, 'text');
  const fileList = useCellData(cell, 'fileList') || [];
  const borderColor = useThemeColor('border', '#e8e8e8');
  const sizeColor = useThemeColor('text-muted', '#999');
  const addFile = () => {
    cell.setFileList([...fileList, { id: String(Date.now()), name: 'file.txt', size: 1024 }]);
    if (cell._onUpload) cell._onUpload();
  };
  const removeFile = (id) => {
    cell.setFileList(fileList.filter(f => f.id !== id));
  };
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0', borderBottom: `1px solid ${borderColor}`, boxSizing: 'border-box' }}>
        <ButtonImpl label={text} type="primary" onPress={addFile} />
      </div>
      {fileList.map(file => (
        <div
          key={file.id}
          style={{
            display: 'flex', alignItems: 'center', height: 32,
            boxSizing: 'border-box',
            borderBottom: `1px solid ${borderColor}`,
          }}
        >
          <div style={{ flex: 1, minWidth: 0, height: '100%' }}>
            <TextImpl text={file.name} size={12} color="text" />
          </div>
          <span style={{ flexShrink: 0, marginLeft: 8, fontSize: 12, color: sizeColor }}>{(file.size / 1024).toFixed(1)} KB</span>
          <div style={{ flexShrink: 0, marginLeft: 8, marginRight: 12 }}>
            <ButtonImpl label="" icon={<GlyphClose size={12} />} type="default" size="small" onPress={() => removeFile(file.id)} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** kind 'upload' 的实现分发视图 */
const UploadDispatcher = createImplDispatcher('upload', UploadAssembledView);

/**
 * UploadCell：上传（高级 Cell，按钮族）。text 为按钮文案（可存 i18n key
 * 或纯文本，默认"选择文件"），fileList 为文件列表（[{id, name, size}]），
 * accept 预留文件类型限制；页面作者可用 onUpload(handler) 注入上传回调。
 * 默认宽 240。呈现实现由 kind 'upload' 分发（缺省为按钮组装版）。
 */
class UploadCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.defaultWidth(240).moveY(true).layout('vertical').color('surface')
      .schema({
        text: { type: 'string', default: '选择文件' },
        fileList: { type: 'array', default: [] },
        accept: { type: 'string', default: '' },
      })
      .renderContent(UploadDispatcher);
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

export { UploadCell, UploadAssembledView };
