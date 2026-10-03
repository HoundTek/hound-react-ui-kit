/**
 * @file editor.jsx —— EditorCell（多行编辑）高级 Cell
 *
 * 输入族：多行编辑 = 多行文本域 + 字数统计（见 docs/basic-cell-design.md）。
 * 组装 fallback（EditorAssembledView）：TextareaImpl（textarea.jsx 的族内
 * 共享实现组件）+ TextImpl 字数小字沉底。主题可经 theme.components.editor
 * 整体重写呈现实现。
 *
 * Schema（数据契约，与旧版一致）：content / placeholder。
 */
import React from 'react';
import CellBaseBuilder from '../core/cell/cell-base';
import { useCellData, createImplDispatcher } from '../core/cell/cell-react';
import { useThemeColor } from '../core/theme/theme-react';
import { TextareaImpl } from './textarea';
import { TextImpl } from '../basic-cells';

/**
 * 多行编辑组装视图（fallback）：TextareaImpl 受控写回 content，
 * 底部 TextImpl 实时显示字数（右对齐小字）。
 * @param {{cell: CellBaseBuilder}} props 组件属性
 * @returns {JSX.Element} 视图元素
 */
function EditorAssembledView({ cell }) {
  const content = useCellData(cell, 'content');
  const placeholder = useCellData(cell, 'placeholder');
  const surfaceColor = useThemeColor('surface', '#ffffff');
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
      backgroundColor: surfaceColor, overflow: 'hidden',
    }}>
      <TextareaImpl
        value={content}
        placeholder={placeholder}
        onChange={v => cell.setContent(v)}
      />
      <div style={{ height: 20, flexShrink: 0, padding: '2px 0 6px', boxSizing: 'border-box' }}>
        <TextImpl text={`${content.length} 字`} size={11} color="text-muted" align="right" />
      </div>
    </div>
  );
}

/** kind 'editor' 的实现分发视图 */
const EditorDispatcher = createImplDispatcher('editor', EditorAssembledView);

/**
 * EditorCell：多行编辑（高级 Cell，输入族）。content 为编辑内容（受控），
 * placeholder 为占位提示（i18n key 或纯文本），底部实时显示字数。
 * 呈现实现由 kind 'editor' 分发（缺省为组装 fallback）。
 */
class EditorCell extends CellBaseBuilder {
  /**
   * @param {string} id Cell 标识
   */
  constructor(id) {
    super(id);
    this.layout('vertical').minHeight(120).defaultWidth(280).color('surface')
      .schema({
        content: { type: 'string', default: '' },
        placeholder: { type: 'string', default: '' },
      })
      .renderContent(EditorDispatcher);
  }
}

export { EditorCell, EditorAssembledView };
