/**
 * @file I18n 国际化核心。纯 JS 实现，与 React 解耦。
 *
 *        - I18n 实例持有按语言组织的文本资源与当前语言
 *        - t(key, vars) 查找文本并做变量插值
 *        - setLocale 切换语言，通知订阅方重新呈现
 *        - fallback：key 在当前语言缺失时，依次回退到 fallbackLocale、最后回退到 key 本身
 *
 *        与 Cell/Box 解耦：I18n 只管理文本资源与语言切换，
 *        不依赖任何 Cell 类型；Cell 内部组件通过注入层（i18n-react）获取译文。
 */
const DEFAULT_FALLBACK = 'en';

/**
 * I18n 国际化实例。
 */
class I18n {
  /**
   * @param {Object} messages 按语言组织的文本资源，形如 { 'zh-CN': { 'app.title': '工作台' } }
   * @param {string} locale 初始语言
   * @param {Object} [options]
   * @param {string} [options.fallbackLocale='en'] 回退语言；当前语言缺失某 key 时回退
   */
  constructor(messages, locale, options = {}) {
    this._messages = messages;
    this._locale = locale;
    this._fallbackLocale = options.fallbackLocale || DEFAULT_FALLBACK;
    this._subscribers = new Set();
  }

  /** 当前语言 */
  get locale() {
    return this._locale;
  }

  /** 回退语言 */
  get fallbackLocale() {
    return this._fallbackLocale;
  }

  /**
   * 切换当前语言。语言未变化时不触发通知。
   * @param {string} locale 目标语言
   */
  setLocale(locale) {
    if (this._locale === locale) return;
    const prev = this._locale;
    this._locale = locale;
    this._notify({ locale, prev });
  }

  /**
   * 翻译文本。查找顺序：当前语言 → fallback 语言 → key 本身。
   * 找到文本后若提供 vars，进行 `{name}` 形式的变量插值。
   * @param {string} key 文本资源标识
   * @param {Object} [vars] 插值变量
   * @returns {string} 译文
   */
  t(key, vars) {
    const text = this._lookup(key, this._locale)
      ?? this._lookup(key, this._fallbackLocale)
      ?? key;
    return vars ? this._interpolate(text, vars) : text;
  }

  /**
   * 在指定语言中查找 key 对应文本。
   * @param {string} key 资源标识
   * @param {string} locale 语言
   * @returns {string|undefined} 文本；不存在返回 undefined
   */
  _lookup(key, locale) {
    const dict = this._messages[locale];
    if (!dict) return undefined;
    const v = dict[key];
    return typeof v === 'string' ? v : undefined;
  }

  /**
   * 变量插值：将 `{name}` 替换为 vars.name。未提供的变量保留原样。
   * @param {string} text 含 `{name}` 占位的文本
   * @param {Object} vars 插值变量
   * @returns {string} 插值后的文本
   */
  _interpolate(text, vars) {
    return text.replace(/\{(\w+)\}/g, (match, name) => {
      const v = vars[name];
      return v === undefined || v === null ? match : String(v);
    });
  }

  /**
   * 订阅语言切换。回调在 setLocale 触发时被调用，收到 { locale, prev } 载荷。
   * @param {(payload: {locale: string, prev: string}) => void} callback
   * @returns {() => void} 取消订阅
   */
  subscribe(callback) {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  /**
   * 通知所有订阅者语言已切换
   * @param {{locale: string, prev: string}} payload 语言切换载荷（新语言与旧语言）
   * @private
   */
  _notify(payload) {
    this._subscribers.forEach(cb => cb(payload));
  }
}

export default I18n;
