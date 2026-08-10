/**
 * @file UI-Kit 公共 API 出口。聚合 Cell 体系（CellBase、Cell React 组件、Hook、内置预设）、
 *        DataTree（DataDag、DataNode）与 I18n 国际化系统，并透传 Box 三层组件以备高级用法。
 *        主题系统（Theme / ThemeProvider / useTheme）提供尺寸变化等动态特效的声明式入口。
 */
import CellBaseBuilder from './cell/cell-base';
import { CellRoot, useCellData, useNodeData } from './cell/cell-react';
import { DataDag, DataNode } from './data-dag/data-dag';
import I18n from './i18n/i18n';
import { I18nProvider, I18nContext, useText, useI18n } from './i18n/i18n-react';
import Theme from './theme/theme';
import { ThemeProvider, ThemeContext, useTheme } from './theme/theme-react';
import { resizeEffectRegistry, resolveResizeEffect } from './theme/resize-effects';
import {
  TextCell, ButtonCell, InputCell, ToggleCell, ListCell,
  CloseButtonCell,
  NotificationCell, ModalCell, WindowCell,
} from './builtin-cells/builtin-cells';

export {
  CellBaseBuilder,
  CellRoot,
  useCellData,
  useNodeData,
  DataDag,
  DataNode,
  I18n,
  I18nProvider,
  I18nContext,
  useText,
  useI18n,
  Theme,
  ThemeProvider,
  ThemeContext,
  useTheme,
  resizeEffectRegistry,
  resolveResizeEffect,
  TextCell,
  ButtonCell,
  InputCell,
  ToggleCell,
  ListCell,
  CloseButtonCell,
  NotificationCell,
  ModalCell,
  WindowCell,
};
