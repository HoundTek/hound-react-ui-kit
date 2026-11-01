// @vitest-environment jsdom
/**
 * @file axe-core 无障碍结构审计（CI 门禁，阶段 3 对比度审计的结构性部分）。
 *
 *       代表性预设矩阵在 jsdom 中渲染并经 axe 扫描，断言无违规。
 *       范围说明：jsdom 无渲染引擎，color-contrast 规则自动跳过——
 *       明暗对比由 palette.test.js 的 WCAG contrastRatio 断言覆盖；
 *       本审计覆盖角色有效性、必需 aria 属性、可达名称、结构嵌套。
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import {
  DataDag, createRuntime, I18nProvider, I18n,
  ButtonImpl, InputImpl,
} from '../src/index.jsx';
import { OptionImpl } from '../src/builtin-cells/checkbox';
import { SwitchCell, SwitchAssembledView } from '../src/builtin-cells/switch';
import { MenuCell, MenuAssembledView } from '../src/builtin-cells/menu';
import { TabBarCell, TabBarAssembledView } from '../src/builtin-cells/tab-bar';
import { TreeCell, TreeAssembledView } from '../src/builtin-cells/tree';
import { NoticeImpl } from '../src/builtin-cells/notice';
import { ProgressCell, ProgressAssembledView } from '../src/builtin-cells/progress';
import { ConfirmCell, ConfirmAssembledView } from '../src/builtin-cells/confirm';
import { SelectCell, SelectAssembledView } from '../src/builtin-cells/select';

const i18n = new I18n({}, 'zh-CN');
const wrap = (node) => React.createElement(I18nProvider, { i18n }, node);

function mountView(CellCls, id, setup = () => {}) {
  const dag = new DataDag({ runtime: createRuntime() });
  const cell = new CellCls(id);
  setup(cell);
  cell.mount(dag._root);
  return cell;
}

/** 单组件审计：返回 axe 违规列表（含 id/节点摘要，便于失败定位） */
async function audit(node) {
  const { container } = render(wrap(node));
  const results = await axe(container);
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.map((n) => n.html),
  }));
}

describe('axe 结构审计（代表性预设矩阵）', () => {
  const cases = [
    ['ButtonImpl', () => <ButtonImpl label="提交" onPress={() => {}} />],
    ['InputImpl', () => <InputImpl value="abc" placeholder="输入" onChange={() => {}} />],
    ['Checkbox 选项', () => <OptionImpl label="同意条款" checked={false} shape="checkbox" onToggle={() => {}} />],
    ['Radio 选项', () => <OptionImpl label="男" checked shape="radio" onToggle={() => {}} />],
    ['Switch', () => {
      const cell = mountView(SwitchCell, 'axs-switch', (c) => c.setLabel('通知').setEnabled(true));
      return <SwitchAssembledView cell={cell} />;
    }],
    ['Menu', () => {
      const cell = mountView(MenuCell, 'axs-menu', (c) => c.setItems([{ id: 'a', title: '甲' }, { id: 'b', title: '乙' }]));
      return <MenuAssembledView cell={cell} />;
    }],
    ['TabBar', () => {
      const cell = mountView(TabBarCell, 'axs-tabs', (c) => c.setItems([{ id: 't1', title: '一' }, { id: 't2', title: '二' }]).setActiveId('t1'));
      return <TabBarAssembledView cell={cell} />;
    }],
    ['Tree', () => {
      const cell = mountView(TreeCell, 'axs-tree', (c) => c.setNodes([{ id: 'n1', title: '根', children: [{ id: 'n11', title: '叶' }] }]));
      return <TreeAssembledView cell={cell} />;
    }],
    ['Notice(info)', () => <NoticeImpl text="提示内容" type="info" />],
    ['Notice(error)', () => <NoticeImpl text="错误内容" type="error" />],
    ['Progress', () => {
      const cell = mountView(ProgressCell, 'axs-prog', (c) => c.setPercent(60));
      return <ProgressAssembledView cell={cell} />;
    }],
    ['Confirm', () => {
      const cell = mountView(ConfirmCell, 'axs-confirm', (c) => c.setText('确认吗？'));
      return <ConfirmAssembledView cell={cell} />;
    }],
    ['Select', () => {
      const cell = mountView(SelectCell, 'axs-select', (c) => c.setOptions([{ id: 'o1', title: '一' }]).setValue('o1'));
      return <SelectAssembledView cell={cell} />;
    }],
  ];

  for (const [name, build] of cases) {
    it(`${name}：无 axe 违规`, async () => {
      const violations = await audit(build());
      expect(violations, JSON.stringify(violations)).toEqual([]);
    });
  }
});
