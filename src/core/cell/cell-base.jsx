import BoxBuilder from "../box/box";
import { DataDagNode } from "../data-dag/data-dag.js";

class CellBaseBuilder {
  constructor(id, parentNode) {
    this._id = id;
    this._parentNode = parentNode;
    this._box = new BoxBuilder(id);
    this._dagNode = new DataDagNode(id, 'cell', null);
    this._slotsNode = new DataDagNode(id + '/slots', 'slots', null);
    
    if (parentNode) {
      parentNode.addChild(id, this._dagNode);
    }
    this._dagNode.addChild('slots', this._slotsNode);
  }

  _getParentNode() {
    return this._parentNode;
  }

  _getDagNode() {
    return this._dagNode;
  }

  _getSlotsNode() {
    return this._slotsNode;
  }

  _getBox() {
    return this._box;
  }

  slot(id, childCell) {
    this._slotsNode.addChild(id, childCell._getDagNode());
    childCell._getBox()._parent = this._box;
    if (!this._box._children) {
      this._box._children = [];
    }
    this._box._children.push(childCell._getBox());
    return this;
  }

  slots(childrenCells) {
    childrenCells.forEach((childCell, index) => {
      const id = childCell._id || `slot-${index}`;
      this.slot(id, childCell);
    });
    return this;
  }

  maxWidth(width) {
    this._box.maxWidth(width);
    return this;
  }

  maxHeight(height) {
    this._box.maxHeight(height);
    return this;
  }

  minWidth(width) {
    this._box.minWidth(width);
    return this;
  }

  minHeight(height) {
    this._box.minHeight(height);
    return this;
  }

  defaultWidth(width) {
    this._box.defaultWidth(width);
    return this;
  }

  defaultHeight(height) {
    this._box.defaultHeight(height);
    return this;
  }

  fixedWidth(width) {
    this._box.fixedWidth(width);
    return this;
  }

  fixedHeight(height) {
    this._box.fixedHeight(height);
    return this;
  }

  backgroundColor(color) {
    this._box.backgroundColor(color);
    return this;
  }

  content(content) {
    this._box.content(content);
    return this;
  }

  layout(layoutType) {
    this._box.layout(layoutType);
    return this;
  }

  alignItems(alignment) {
    this._box.alignItems(alignment);
    return this;
  }

  moveX(allow) {
    this._box.moveX(allow);
    return this;
  }

  moveY(allow) {
    this._box.moveY(allow);
    return this;
  }

  viewport() {
    this._box.viewport();
    return this;
  }

  react() {
    return this._box.react();
  }
}

export default CellBaseBuilder;