/**
 * @file docs-page.jsx —— 组件文档站（playground 第三页）
 *
 *   左侧：分类目录 + 全文过滤；右侧：预设详情——描述、通用 Cell API、
 *   Schema 字段表（构造期声明自动内省，零维护）、事件表（元数据）、
 *   代表性预设的可运行示例（独立 runtime 挂载，示例区固定高度滚动）。
 *
 *   布局为普通 React + 内联样式（文档站是开发工具，不占 Cell 体系）；
 *   示例区渲染的即库的真实产物。
 */
import React, { useMemo, useState } from 'react';
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

const S = {
  page: { display: 'flex', height: '100vh', background: '#faf9fc', color: '#1d1b20', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", sans-serif' },
  side: { width: 240, flexShrink: 0, borderRight: '1px solid #e7e0ec', overflowY: 'auto', padding: '12px 0' },
  search: { width: 200, margin: '0 12px 10px', padding: '6px 10px', border: '1px solid #cac4d0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  cat: { padding: '10px 14px 4px', fontSize: 12, fontWeight: 700, color: '#79747e' },
  item: (active) => ({ padding: '6px 14px 6px 22px', fontSize: 13, cursor: 'pointer', color: active ? '#6750a4' : '#1d1b20', background: active ? '#eaddff' : 'transparent', borderRight: active ? '3px solid #6750a4' : '3px solid transparent' }),
  main: { flex: 1, minWidth: 0, overflowY: 'auto', padding: '20px 28px 60px' },
  h1: { fontSize: 22, margin: '4px 0 2px' },
  cat0: { fontSize: 12, color: '#79747e', margin: '0 0 14px' },
  desc: { fontSize: 14, lineHeight: 1.7, margin: '0 0 18px', color: '#49454f' },
  h2: { fontSize: 15, margin: '22px 0 8px', color: '#6750a4' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '6px 10px', background: '#f3edf7', border: '1px solid #e7e0ec', fontWeight: 600, whiteSpace: 'nowrap' },
  td: { padding: '6px 10px', border: '1px solid #e7e0ec', verticalAlign: 'top' },
  code: { fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 12, background: '#f3edf7', padding: '1px 5px', borderRadius: 4 },
  demoBox: { marginTop: 8, border: '1px dashed #cac4d0', borderRadius: 10, background: '#fff', padding: 12, overflow: 'auto' },
  note: { fontSize: 12, color: '#79747e', marginTop: 8 },
};

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

function Detail({ entry }) {
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
    <div style={S.main}>
      <h1 style={S.h1}>{entry.name}</h1>
      <div style={S.cat0}>{entry.cat}</div>
      <p style={S.desc}>{entry.desc}</p>

      {demo && (
        <>
          <h2 style={S.h2}>示例</h2>
          <div style={{ ...S.demoBox, height: 160 }}>{demo}</div>
          <div style={S.note}>示例经独立 runtime 挂载（createRuntime 隔离），浮动视口类预设不在此演示。</div>
        </>
      )}

      <h2 style={S.h2}>Schema 字段（构造期声明自动内省）</h2>
      {schema.length === 0
        ? <div style={S.note}>该 Cell 无 Schema 字段（容器/结构类预设）。</div>
        : (
          <table style={S.table}>
            <thead><tr><th style={S.th}>字段</th><th style={S.th}>类型</th><th style={S.th}>默认值</th><th style={S.th}>绑定</th></tr></thead>
            <tbody>
              {schema.map((f) => (
                <tr key={f.key}>
                  <td style={S.td}><code style={S.code}>{f.key}</code></td>
                  <td style={S.td}>{f.type}</td>
                  <td style={S.td}><code style={S.code}>{f.def}</code></td>
                  <td style={S.td}>{f.bind || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      <h2 style={S.h2}>事件</h2>
      {entry.events?.length
        ? (
          <table style={S.table}>
            <thead><tr><th style={S.th}>注册</th><th style={S.th}>事件名</th><th style={S.th}>语义</th></tr></thead>
            <tbody>
              {entry.events.map((ev) => (
                <tr key={ev.event}>
                  <td style={S.td}><code style={S.code}>{ev.api}</code></td>
                  <td style={S.td}><code style={S.code}>{ev.event}</code></td>
                  <td style={S.td}>{ev.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
        : <div style={S.note}>无专属事件；数据字段变更可经 <code style={S.code}>cell.on / subscribe</code> 观察，或使用 <code style={S.code}>controlled</code> 受控。</div>}

      <h2 style={S.h2}>通用 Cell API</h2>
      <table style={S.table}>
        <tbody>
          {GENERIC_API.map(([api, d]) => (
            <tr key={api}>
              <td style={{ ...S.td, width: 260 }}><code style={S.code}>{api}</code></td>
              <td style={S.td}>{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 文档站页面（App 在 page === 'docs' 时渲染）。
 * @returns {JSX.Element}
 */
export default function DocsPage() {
  const [filter, setFilter] = useState('');
  const [active, setActive] = useState('ButtonCell');
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
    <div style={S.page}>
      <aside style={S.side}>
        <input
          style={S.search}
          placeholder="搜索预设…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        {grouped.map((g) => (
          <div key={g.cat}>
            <div style={S.cat}>{g.cat}</div>
            {g.items.map((e) => (
              <div
                key={e.name}
                style={S.item(e.name === current.name)}
                onClick={() => setActive(e.name)}
              >
                {e.name}
              </div>
            ))}
          </div>
        ))}
        {grouped.length === 0 && <div style={{ ...S.note, padding: '0 14px' }}>无匹配预设</div>}
      </aside>
      <Detail key={current.name} entry={current} />
    </div>
  );
}
