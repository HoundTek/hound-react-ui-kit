/**
 * @file UI-Kit 公共 API 出口。聚合 Cell 体系（CellBase、Cell React 组件、Hook）、
 *        DataTree（DataDag、DataNode）与 I18n 国际化系统，并透传 Box 三层组件以备高级用法。
 *        主题系统（Theme / ThemeProvider / useTheme）提供尺寸变化等动态特效的声明式入口。
 *        预设 Cell 分两级（见 docs/basic-cell-design.md）：
 *        - 基础 Cell（src/basic-cells/，8 种）：Text / Media / Button / Slider /
 *          Input / Panel / List / Window——不可互相派生的原语，不依赖其他 Cell；
 *          TextCell / WindowCell 居于 core/builtin-cells（框架自带构件）
 *        - 高级预设（src/builtin-cells/）：由基础/高级 Cell 的实现组件组装
 *         （组装 fallback），可经实现注册表（implementations）被主题整体重写
 */
import CellBaseBuilder from './cell/cell-base';
import { CellRoot, useCellData, useNodeData, createImplDispatcher } from './cell/cell-react';
import { registerCellImpl, getCellImpl, hasCellImpl } from './cell/implementations';
import { DataDag, DataNode } from './data-dag/data-dag';
import I18n from './i18n/i18n';
import { I18nProvider, I18nContext, useText, useI18n } from './i18n/i18n-react';
import Theme from './theme/theme';
import { ThemeProvider, ThemeContext, useTheme, useThemeColor, useCornerType, useShapeRadius, useElementStyle } from './theme/theme-react';
import { resizeEffectRegistry, resolveResizeEffect } from './theme/resize-effects';
import { cornerStyle, CAPSULE_RADIUS, ELEVATIONS, elevationStyle, resolveElementRadius } from './theme/shape';
import { ensureStateLayerStyle, stateLayerProps, FONT_STACK } from './theme/state-layer';
import {
  TextCell, ToggleCell,
  CloseButtonCell,
  NotificationCell, ModalCell, WindowCell,
} from './builtin-cells/builtin-cells';
import {
  ButtonCell, SliderCell, InputCell, MediaCell, PanelCell, ListCell,
  ButtonImpl, SliderTrackImpl, TextImpl, InputImpl, ListImpl,
  GlyphChevron, GlyphClose, GlyphCheck, GlyphTriangle, GlyphRadio, GlyphCheckbox,
} from '../basic-cells';
import { TextareaImpl } from '../builtin-cells/textarea';
import { OptionImpl } from '../builtin-cells/checkbox';
import { SelectImpl } from '../builtin-cells/select';
import { CalendarImpl } from '../builtin-cells/calendar';
import { NoticeImpl } from '../builtin-cells/notice';
import { MenuImpl } from '../builtin-cells/menu';
import { TabBarImpl } from '../builtin-cells/tab-bar';
import {
  AccordionCell, AlertCell, AvatarCell, BadgeCell, BarCell, BreadcrumbCell,
  CalendarCell, CardCell, CarouselCell, ChartCell, ChatCell,
  CheckboxCell, ColorPickerCell, ConfirmCell, ControlCell, DashboardCell,
  DatePickerCell, DialogCell, DividerCell, DocumentCell, DrawerCell, EditorCell,
  EmptyCell, FieldCell, FloatingPanelCell, FormCell, GridCell, GroupCell, IconCell,
  IndexBarCell, JoyConCell, KanbanCell, LoadingCell, LoginCell,
  MenuCell, MessageCell, MultiSwitchCell, NavBarCell, NoticeCell, OrderCell, PageCell,
  PaginationCell, PickerCell, PopoverCell, ProcessCell, ProfileCell,
  ProgressCell, RadioCell, RateCell, ResultCell, SearchCell, SectionCell, SelectCell,
  SettingsCell, SkeletonCell, StatCell, StepperCell, SwitchCell, TabBarCell,
  TabCell, TableCell, TagCell, TextareaCell, TilingCell, TimelineCell, TitleCell,
  ToastCell, TooltipCell, TreeCell, UploadCell,
} from '../builtin-cells';

export {
  CellBaseBuilder,
  CellRoot,
  useCellData,
  useNodeData,
  createImplDispatcher,
  registerCellImpl,
  getCellImpl,
  hasCellImpl,
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
  useThemeColor,
  useCornerType,
  useShapeRadius,
  useElementStyle,
  resizeEffectRegistry,
  resolveResizeEffect,
  cornerStyle,
  CAPSULE_RADIUS,
  ELEVATIONS,
  elevationStyle,
  resolveElementRadius,
  ensureStateLayerStyle,
  stateLayerProps,
  FONT_STACK,
  // 核心预设（框架自带构件；TextCell / WindowCell 兼为基础 Cell）
  TextCell,
  ToggleCell,
  CloseButtonCell,
  NotificationCell,
  ModalCell,
  WindowCell,
  // 基础 Cell（src/basic-cells/，实现组件供高级 Cell 组装复用）
  ButtonCell,
  SliderCell,
  InputCell,
  MediaCell,
  PanelCell,
  ListCell,
  ButtonImpl,
  SliderTrackImpl,
  TextImpl,
  InputImpl,
  ListImpl,
  // 共享 SVG 字形（跨浏览器一致，取代文本字形图标）
  GlyphChevron,
  GlyphClose,
  GlyphCheck,
  GlyphTriangle,
  GlyphRadio,
  GlyphCheckbox,
  // 高级 Cell 共享实现组件（供组装复用 / 主题重写参考）
  TextareaImpl,
  OptionImpl,
  SelectImpl,
  CalendarImpl,
  NoticeImpl,
  MenuImpl,
  TabBarImpl,
  // 高级预设（src/builtin-cells/）
  AccordionCell,
  AlertCell,
  AvatarCell,
  BadgeCell,
  BarCell,
  BreadcrumbCell,
  CalendarCell,
  CardCell,
  CarouselCell,
  ChartCell,
  ChatCell,
  CheckboxCell,
  ColorPickerCell,
  ConfirmCell,
  ControlCell,
  DashboardCell,
  DatePickerCell,
  DialogCell,
  DividerCell,
  DocumentCell,
  DrawerCell,
  EditorCell,
  EmptyCell,
  FieldCell,
  FloatingPanelCell,
  FormCell,
  GridCell,
  GroupCell,
  IconCell,
  IndexBarCell,
  JoyConCell,
  KanbanCell,
  LoadingCell,
  LoginCell,
  MenuCell,
  MessageCell,
  MultiSwitchCell,
  NavBarCell,
  NoticeCell,
  OrderCell,
  PageCell,
  PaginationCell,
  PickerCell,
  PopoverCell,
  ProcessCell,
  ProfileCell,
  ProgressCell,
  RadioCell,
  RateCell,
  ResultCell,
  SearchCell,
  SectionCell,
  SelectCell,
  SettingsCell,
  SkeletonCell,
  StatCell,
  StepperCell,
  SwitchCell,
  TabBarCell,
  TabCell,
  TableCell,
  TagCell,
  TextareaCell,
  TilingCell,
  TimelineCell,
  TitleCell,
  ToastCell,
  TooltipCell,
  TreeCell,
  UploadCell,
};
