/**
 * @file docs-page.jsx —— 组件文档站（playground 第二页）
 *
 *   左侧：分类目录 + 全文过滤；右侧：预设详情——描述、通用 Cell API、
 *   Schema 字段表（构造期声明自动内省，零维护）、事件表（元数据）、
 *   代表性预设的可运行示例（独立 runtime 挂载，示例区固定高度滚动）。
 *   顶部为文档站页头：品牌标识 + "返回展示台"退出按钮（onExit 注入）。
 *
 *   布局为普通 React + 内联样式（文档站是开发工具，不占 Cell 体系）；
 *   示例区渲染的即库的真实产物。配色/圆角/焦点环取自当前主题的颜色角色
 *   与形状尺度（与展示台同一设计语言），并随亮/暗主题切换同步更新。
 */
import React, { useMemo, useState } from 'react';
import { useThemeColor, stateLayerProps } from '../src/core/ui-kit';
import { CATEGORIES, ENTRIES, EXAMPLES, introspectSchema } from './docs-meta';

const GENERIC_API = [
  ['setData(key, v) / setXxx(v)', '写入 Schema 字段（setXxx 由 schema 自动生成，链式）'],
  ['getData(key)', '读取字段（绑定字段透明转发目标节点）'],
  ['on(event, fn) / off / emit', '统一事件注册表（多处理器按序触发）'],
  ['onPress / onSelect / onChange …', '语义事件注册糖（等价 on(\'press\') 等）'],
  ['controlled(value, onCommit)', '受控语义糖：值注入 + 内部变更回写'],
  ['fill(slot, cells) / slots', '插槽填充（挂载前记录关系，挂载后动态挂载）'],
  ['mount(dag._root) / react()', '挂载数据与 Box 树；取 React 元素'],
  ['destroy()', '释放全部运行时资源（子 Cell / Box / 数据节点 / 事件表）'],
  ['find(path) / resolve(path)', '路径访问：@/绝对、../相对、@锚点'],
];

/**
 * 由主题颜色角色构造文档站样式表：与展示台共用同一套令牌（surface /
 * surface-muted / text / text-secondary / primary / outline-variant），
 * 亮/暗主题切换时随角色解析结果整体更新。
 * @param {Object} c 颜色角色解析结果
 * @returns {Object} 样式表（按区域分组的样式对象）
 */
function buildStyles(c) {
  const radius = 12;
  return {
    page: {
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: c.surface, color: c.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
      transition: 'background-color .2s ease, color .2s ease',
    },
    // 页头：品牌 + 返回展示台（退出入口与导航同一层级）
    top: {
      flexShrink: 0, height: 56, display: 'flex', alignItems: 'center', gap: 10,
      padding: '0 20px', background: c.surface,
      borderBottom: `1px solid ${c.outlineVariant}`,
    },
    brandMark: {
      width: 18, height: 18, borderRadius: 6, background: c.primary, flexShrink: 0,
    },
    brand: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: c.text },
    brandSub: { fontSize: 12, fontWeight: 400, color: c.textMuted, marginLeft: 2 },
    exit: {
      marginLeft: 'auto', height: 32, display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '0 14px', borderRadius: 9999, cursor: 'pointer',
      border: `1px solid ${c.outlineVariant}`, color: c.primary,
      background: 'transparent', fontSize: 13, fontWeight: 500,
      whiteSpace: 'nowrap', boxSizing: 'border-box',
    },
    body: { flex: 1, minHeight: 0, display: 'flex' },
    side: {
      width: 248, flexShrink: 0, overflowY: 'auto', padding: '12px 0 24px',
      background: c.surfaceMuted, borderRight: `1px solid ${c.outlineVariant}`,
    },
    search: {
      width: 'calc(100% - 24px)', margin: '0 12px 12px', padding: '8px 12px',
      border: `1px solid ${c.outlineVariant}`, borderRadius: 8, fontSize: 13,
      background: c.surface, color: c.text, boxSizing: 'border-box',
    },
    cat: { padding: '12px 14px 4px', fontSize: 12, fontWeight: 700, color: c.textMuted, letterSpacing: 0.2 },
    item: (active) => ({
      display: 'block', width: '100%', padding: '7px 14px 7px 22px', margin: 0,
      border: 'none', borderLeft: active ? `3px solid ${c.primary}` : '3px solid transparent',
      background: active ? c.primaryContainer : 'transparent',
      color: active ? c.primary : c.text, fontSize: 13, textAlign: 'left',
      cursor: 'pointer', boxSizing: 'border-box', outlineOffset: -2,
    }),
    main: { flex: 1, minWidth: 0, overflowY: 'auto', padding: '24px 32px 64px' },
    h1: { fontSize: 24, lineHeight: 1.3, margin: '0 0 4px', fontWeight: 700 },
    cat0: { fontSize: 12, color: c.textMuted, margin: '0 0 16px' },
    desc: { fontSize: 14, lineHeight: 1.7, margin: '0 0 20px', color: c.textSecondary },
    h2: { fontSize: 15, margin: '26px 0 10px', color: c.primary, fontWeight: 600 },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, borderRadius: 8, overflow: 'hidden' },
    th: {
      textAlign: 'left', padding: '8px 10px', background: c.surfaceMuted,
      border: `1px solid ${c.outlineVariant}`, fontWeight: 600, whiteSpace: 'nowrap',
    },
    td: { padding: '8px 10px', border: `1px solid ${c.outlineVariant}`, verticalAlign: 'top' },
    code: {
      fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 12,
      background: c.surfaceMuted, color: c.text, padding: '1px 5px', borderRadius: 4,
    },
    demoBox: {
      marginTop: 8, border: `1px dashed ${c.outlineVariant}`, borderRadius: radius,
      background: c.surface, padding: 16, overflow: 'auto',
    },
    note: { fontSize: 12, color: c.textMuted, marginTop: 8, lineHeight: 1.6 },
    empty: { ...{ padding: '0 14px', fontSize: 12, color: c.textMuted } },
  };
}

/** 内省结果缓存（同一 Cell 类只构造一次探针） */
const schemaCache = new Map();
function schemaOf(entry) {
  if (!schemaCache.has(entry.name)) {
    try {
      schemaCache.set(entry.name, introspectSchema(entry.cls));
    } catch (e) {
      schemaCache.set(entry.name, []);
    }
  }
  return schemaCache.get(entry.name);
}

/**
 * 预设详情区：描述、示例、Schema 字段表、事件表与通用 API。
 * @param {{entry: Object, s: Object}} props 组件属性
 * @returns {JSX.Element} 详情元素
 */
function Detail({ entry, s }) {
  const schema = schemaOf(entry);
  const example = EXAMPLES[entry.name];
  let demo = null;
  if (example) {
    try {
      demo = example();
    } catch {
      demo = <span style={{ color: '#b3261e', fontSize: 12 }}>示例构建失败</span>;
    }
  }
  return (
    <div style={s.main}>
      <h1 style={s.h1}>{entry.name}</h1>
      <div style={s.cat0}>{entry.cat}</div>
      <p style={s.desc}>{entry.desc}</p>

      {demo && (
        <>
          <h2 style={s.h2}>示例</h2>
          <div style={{ ...s.demoBox, height: 180 }}>{demo}</div>
          <div style={s.note}>示例经独立 runtime 挂载（createRuntime 隔离），浮动视口类预设不在此演示。</div>
        </>
      )}

      <h2 style={s.h2}>Schema 字段（构造期声明自动内省）</h2>
      {schema.length === 0
        ? <div style={s.note}>该 Cell 无 Schema 字段（容器/结构类预设）。</div>
        : (
          <table style={s.table}>
            <thead><tr><th style={s.th}>字段</th><th style={s.th}>类型</th><th style={s.th}>默认值</th><th style={s.th}>绑定</th></tr></thead>
            <tbody>
              {schema.map((f) => (
                <tr key={f.key}>
                  <td style={s.td}><code style={s.code}>{f.key}</code></td>
                  <td style={s.td}>{f.type}</td>
                  <td style={s.td}><code style={s.code}>{f.def}</code></td>
                  <td style={s.td}>{f.bind || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      <h2 style={s.h2}>事件</h2>
      {entry.events?.length
        ? (
          <table style={s.table}>
            <thead><tr><th style={s.th}>注册</th><th style={s.th}>事件名</th><th style={s.th}>语义</th></tr></thead>
            <tbody>
              {entry.events.map((ev) => (
                <tr key={ev.event}>
                  <td style={s.td}><code style={s.code}>{ev.api}</code></td>
                  <td style={s.td}><code style={s.code}>{ev.event}</code></td>
                  <td style={s.td}>{ev.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
        : <div style={s.note}>无专属事件；数据字段变更可经 <code style={s.code}>cell.on / subscribe</code> 观察，或使用 <code style={s.code}>controlled</code> 受控。</div>}

      <h2 style={s.h2}>通用 Cell API</h2>
      <table style={s.table}>
        <tbody>
          {GENERIC_API.map(([api, d]) => (
            <tr key={api}>
              <td style={{ ...s.td, width: 260 }}><code style={s.code}>{api}</code></td>
              <td style={s.td}>{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 文档站页面（App 在 page === 'docs' 时渲染）。
 * @param {{onExit?: () => void}} props 组件属性（onExit：返回展示台）
 * @returns {JSX.Element}
 */
export default function DocsPage({ onExit }) {
  const [filter, setFilter] = useState('');
  const [active, setActive] = useState('ButtonCell');
  // 颜色角色统一经主题解析（跟随亮/暗切换）；未注入主题时回退 MD3 light 值
  const c = {
    primary: useThemeColor('primary', '#6750A4'),
    primaryContainer: useThemeColor('primary-container', '#EADDFF'),
    surface: useThemeColor('surface', '#FEF7FF'),
    surfaceMuted: useThemeColor('surface-muted', '#F3EDF7'),
    text: useThemeColor('text', '#1D1B20'),
    textSecondary: useThemeColor('text-secondary', '#49454F'),
    textMuted: useThemeColor('text-muted', '#79747E'),
    outline: useThemeColor('outline', '#79747E'),
    outlineVariant: useThemeColor('outline-variant', '#CAC4D0'),
  };
  const s = buildStyles(c);
  const exitState = stateLayerProps(c.primary);
  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const matched = q
      ? ENTRIES.filter((e) => e.name.toLowerCase().includes(q) || e.desc.toLowerCase().includes(q))
      : ENTRIES;
    return CATEGORIES
      .map((cat) => ({ cat, items: matched.filter((e) => e.cat === cat) }))
      .filter((g) => g.items.length > 0);
  }, [filter]);
  const current = ENTRIES.find((e) => e.name === active) || ENTRIES[0];

  return (
    <div className="hk-docs" style={{ ...s.page, '--hk-focus': c.primary }}>
      <header style={s.top}>
        <span style={s.brandMark} aria-hidden="true" />
        <div style={s.brand}>
          组件文档
          <span style={s.brandSub}>Hound UI Kit · {ENTRIES.length} 个预设</span>
        </div>
        <button
          type="button"
          onClick={onExit}
          className={`hk-exit hk-focus hk-press ${exitState.className}`}
          style={{ ...s.exit, ...exitState.style }}
        >
          <span aria-hidden="true">←</span>
          返回展示台
        </button>
      </header>
      <div style={s.body}>
        <aside style={s.side}>
          <input
            className="hk-docs-search hk-focus"
            style={s.search}
            placeholder="搜索预设…"
            aria-label="搜索预设"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {grouped.map((g) => (
            <div key={g.cat}>
              <div style={s.cat}>{g.cat}</div>
              {g.items.map((e) => {
                const itemState = stateLayerProps(c.primary);
                return (
                  <button
                    type="button"
                    key={e.name}
                    className={`hk-docs-item hk-focus ${itemState.className}`}
                    style={{ ...s.item(e.name === current.name), ...itemState.style }}
                    onClick={() => setActive(e.name)}
                  >
                    {e.name}
                  </button>
                );
              })}
            </div>
          ))}
          {grouped.length === 0 && <div style={s.empty}>无匹配预设</div>}
        </aside>
        <Detail key={current.name} entry={current} s={s} />
      </div>
    </div>
  );
}
