import BoxBuilder from "../box/box";
class CellBuilder {
    constructor(id) {
        this._boxConfig = {}

    }

    maxWidth(width) {
        this._boxConfig._maxWidth = width;
        this._boxConfig._explicitMaxWidth = true;
        return this;
    }

    maxHeight(height) {
        this._boxConfig._maxHeight = height;
        this._boxConfig._explicitMaxHeight = true;
        return this;
    }

    minWidth(width) {
        this._boxConfig._minWidth = width;
        this._boxConfig._explicitMinWidth = true;
        return this;
    }

    minHeight(height) {
        this._boxConfig._minHeight = height;
        this._boxConfig._explicitMinHeight = true;
        return this;
    }

    defaultWidth(width) {
        this._boxConfig._defaultWidth = width;
        return this;
    }

    defaultHeight(height) {
        this._boxConfig._defaultHeight = height;
        return this;
    }

    fixedWidth(width) {
        return this.maxWidth(width).minWidth(width);
    }

    fixedHeight(height) {
        return this.maxHeight(height).minHeight(height);
    }

    backgroundColor(color) {
        this._boxConfig._backgroundColor = color;
        return this;
    }

    content(content) {
        this._boxConfig._content = content;
        return this;
    }

    layout(layoutType) {
        this._boxConfig._layout = layoutType;
        return this;
    }

    alignItems(alignment) {
        this._boxConfig._alignItems = alignment;
        this._boxConfig._alignItems = alignment;
        return this;
    }

    moveX(allow) {
        this._boxConfig._moveX = allow;
        return this;
    }

    moveY(allow) {
        this._boxConfig._moveY = allow;
        return this;
    }
}