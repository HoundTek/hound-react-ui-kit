class DataDagNode {
  constructor(path, type, data) {
    this._path = path;
    this._type = type;
    this._data = data;
    this._children = new Map();
    this._children.set(".", this);
  }
  _setRoot(root) {
    this._children.set("@", root);
  }
  _setParent(parent) {
    this._children.set("..", parent);
  }
  get(path) {
    const parts = path.split('/').filter(p => p !== '');
    let node = this;
    for (let id of parts) {
      node = node._children.get(id);
      if (!node) {
        return null;
      }
    }
    return node;
  }
  addChild(id, child) {
    this._children.set(id, child);
    child._setParent(this);
    child._setRoot(this.get("@"));
  }
  mount(id, path) {
    this.addChild(id, this.get(path));
  }
  unmount(id) {
    if (id === "@" || id === ".." || id === ".") {
      return;
    }
    this._children.delete(id);
  }
  getData() {
    return this._data;
  }
  setData(data) {
    this._data = data;
  }
  setData(type, data) {
    this._type = type;
    this._data = data;
  }
  getType() {
    return this._type;
  }
}
class DataDag {
  constructor() {
    this._root = new DataDagNode('@', 'root', null);
    this._root._setRoot(this._root);
  }
  get(path) {
    return this._root.get(path);
  }
}

export { DataDagNode, DataDag };