// SceneCustomMenu.js 1.53.4 の struct をそのまま写像した型定義（SPEC.md §5.1）。
// パラメータ値は元々すべて文字列だが、ここでは mzformat.parse 後の「内部表現」
// （数値/真偽値に変換済み）を表す。未知キーは passthrough で保持するため、
// 各インターフェースは index signature で unknown を許容する。
//
// struct / 配列型のフィールドは MZ 上で未設定の場合 "" として格納されるため、
// 対応する型は `T | ''` の union にしている（mzformat.ts / schema.ts 参照）。

export type TriState = 0 | 1 | 2;

export interface AudioSeData {
  name: string;
  volume: number;
  pitch: number;
  pan: number;
  [key: string]: unknown;
}

export interface ButtonEventData {
  Name: string;
  Event: EventData | '';
  [key: string]: unknown;
}

export interface PanoramaData {
  Image: string;
  ScrollX: number;
  ScrollY: number;
  [key: string]: unknown;
}

export interface EventData {
  CommandId: number;
  FocusWindowId: string;
  FocusWindowIndex: number;
  Script: string;
  SwitchId: number;
  Deselect: boolean;
  [key: string]: unknown;
}

export interface CommandData {
  Text: string;
  Align: TriState;
  VisibleSwitchId: number;
  VisibleScript: string;
  EnableSwitchId: number;
  IsEnableScript: string;
  HelpText: string;
  DecisionEvent: EventData | '';
  CancelChoice: boolean;
  OkSound: AudioSeData | '';
  [key: string]: unknown;
}

export interface WindowData {
  // 識別
  Id: string;
  // 配置
  x: number;
  y: number;
  RelativeWindowIdX: string;
  RelativeWindowIdY: string;
  width: number;
  height: number;
  originX: TriState;
  Rotation: number;
  // レイアウト
  ColumnNumber: number;
  RowNumber: number;
  ItemHeight: number;
  // 中身
  CommandList: CommandData[] | '';
  ListWindowId: string;
  ListScript: string;
  FilterScript: string;
  MappingScript: string;
  SortScript: string;
  ItemDrawScript: string[] | '';
  ItemDrawMultiLineScript: string;
  IsEnableScript: string;
  // イベント
  DecisionEvent: EventData | '';
  CancelEvent: EventData | '';
  CursorEvent: EventData | '';
  ButtonEvent: ButtonEventData[] | '';
  Cancelable: boolean;
  PopCancel: boolean;
  // 表示
  WindowSkin: string;
  FontSize: number;
  FontFace: string;
  textColor: number;
  VisibleSwitchId: number;
  ShowOpenAnimation: boolean;
  OverlapOther: boolean;
  HiddenNoFocus: boolean;
  DarkNoFocus: boolean;
  noFrame: boolean;
  noItemBackground: boolean;
  cursorOverContents: boolean;
  // その他
  CommonHelpText: string;
  MaskingText: string;
  RefreshSwitchId: number;
  IndexVariableId: number;
  RememberIndex: boolean;
  ItemVariableId: number;
  ActorChangeable: boolean;
  okSound: AudioSeData | '';
  cursorAllSwitchId: number;
  cursorFixedSwitchId: number;
  [key: string]: unknown;
}

export interface SceneData {
  Id: string;
  UseHelp: TriState;
  HelpRows: number;
  InitialEvent: EventData | '';
  ParallelEventId: number;
  ActorChangeEvent: EventData | '';
  WindowList: WindowData[] | '';
  PicturePriority: TriState;
  Panorama: PanoramaData | '';
  UsePageButtons: boolean;
  SnapNoFilter: boolean;
  [key: string]: unknown;
}
