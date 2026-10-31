/**
 * @file Cell 实现注册表（组件级重写，见 docs/basic-cell-design.md 与
 *       docs/theme-shape-design.md「两级样式体系」第二级）。
 *
 *       高级 Cell 的呈现实现可注册多份，按 (kind, name) 检索：
 *       - 组装 fallback 不注册——它是 Cell 自带的缺省实现（组合基础/高级
 *         Cell 的 XxxImpl 纯组件），主题未声明时直接使用
 *       - 主题经 `components: { [kind]: name }` 声明启用哪份实现；
 *         名称未注册时降级为组装 fallback（与 resize 特效同一模式：
 *         声明式描述 + 注册表解析 + 未识别降级）
 *
 *       实现组件约定 props { cell }（与 renderContent 一致），内部经
 *       useCellData 订阅数据；同 kind 的各实现共用同一 Schema（数据契约）。
 *
 *       本模块为纯注册表门面，不依赖 React/Theme；Cell 视图层（dispatcher）
 *       在渲染时完成解析。注册表状态归属 KitRuntime 实例（多主题/多实例
 *       隔离）；runtime 参数缺省取全局默认 runtime（向后兼容）。
 */
import { getDefaultRuntime } from '../runtime';

/**
 * 注册一份 Cell 实现。重复注册同 (kind, name) 后者覆盖前者。
 * @param {string} kind Cell 种类（如 'switch'、'menu'）
 * @param {string} name 实现名（主题 components 声明中引用，如 'md3-switch'）
 * @param {React.ComponentType<{cell: object}>} Component 实现组件（props {cell}）
 * @param {KitRuntime} [runtime] 目标运行时；缺省全局默认 runtime
 * @returns {void}
 */
function registerCellImpl(kind, name, Component, runtime = null) {
  (runtime || getDefaultRuntime()).registerImpl(kind, name, Component);
}

/**
 * 按 (kind, name) 取实现组件。
 * @param {string} kind Cell 种类
 * @param {string} name 实现名
 * @param {KitRuntime} [runtime] 目标运行时；缺省全局默认 runtime
 * @returns {React.ComponentType|null} 实现组件；未注册返回 null（调用方降级 fallback）
 */
function getCellImpl(kind, name, runtime = null) {
  return (runtime || getDefaultRuntime()).getImpl(kind, name);
}

/**
 * 判断某 kind 是否注册过指定实现。
 * @param {string} kind Cell 种类
 * @param {string} name 实现名
 * @param {KitRuntime} [runtime] 目标运行时；缺省全局默认 runtime
 * @returns {boolean} 是否已注册
 */
function hasCellImpl(kind, name, runtime = null) {
  return (runtime || getDefaultRuntime()).hasImpl(kind, name);
}

export { registerCellImpl, getCellImpl, hasCellImpl };
