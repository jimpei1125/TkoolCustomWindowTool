// Phase 0 のラウンドトリップテスト用フィクスチャ。
//
// 注意: 実際の SceneCustomMenu.js 1.53.4 のパラメータ定義（@param 一覧）を
// 参照して作成したものではなく、SPEC.md §5.1 のデータモデル記述に基づいて
// 手作業で構成した近似フィクスチャである。実プロジェクトの plugins.js から
// 抜粋した実データに差し替えて検証することを強く推奨する
// （CLAUDE.md「テスト」節、test/fixtures/ に実 plugins.js 抜粋を置く方針）。

function structStr(obj: Record<string, string>): string {
  return JSON.stringify(obj);
}

const emptyEventRaw = '';

const decisionEventRaw = structStr({
  CommandId: '0',
  FocusWindowId: '',
  FocusWindowIndex: '-1',
  Script: '',
  SwitchId: '0',
  Deselect: 'false',
  // 未知キー（非破壊原則の確認用）
  UnknownFutureField: 'keep-me',
});

const okSoundRaw = structStr({ name: 'Decision1', volume: '90', pitch: '100', pan: '0' });

const command1Raw = structStr({
  Text: 'はい',
  Align: '0',
  VisibleSwitchId: '0',
  VisibleScript: '',
  EnableSwitchId: '0',
  IsEnableScript: '',
  HelpText: '',
  DecisionEvent: decisionEventRaw,
  CancelChoice: 'false',
  OkSound: okSoundRaw,
});

const command2Raw = structStr({
  Text: 'いいえ',
  Align: '0',
  VisibleSwitchId: '0',
  VisibleScript: '',
  EnableSwitchId: '0',
  IsEnableScript: '',
  HelpText: '',
  DecisionEvent: emptyEventRaw,
  CancelChoice: 'true',
  OkSound: '',
});

const commandListRaw = JSON.stringify([command1Raw, command2Raw]);

const window1Raw = structStr({
  Id: 'win_command',
  x: '0',
  y: '0',
  RelativeWindowIdX: '',
  RelativeWindowIdY: '',
  width: '240',
  height: '0',
  originX: '0',
  Rotation: '0',
  ColumnNumber: '1',
  RowNumber: '2',
  ItemHeight: '36',
  CommandList: commandListRaw,
  ListWindowId: '',
  ListScript: '',
  FilterScript: '',
  MappingScript: '',
  SortScript: '',
  ItemDrawScript: '',
  ItemDrawMultiLineScript: '',
  IsEnableScript: '',
  DecisionEvent: emptyEventRaw,
  CancelEvent: emptyEventRaw,
  CursorEvent: emptyEventRaw,
  ButtonEvent: '',
  Cancelable: 'true',
  PopCancel: 'false',
  WindowSkin: '',
  FontSize: '26',
  FontFace: '',
  textColor: '0',
  VisibleSwitchId: '0',
  ShowOpenAnimation: 'true',
  OverlapOther: 'false',
  HiddenNoFocus: 'false',
  DarkNoFocus: 'true',
  noFrame: 'false',
  noItemBackground: 'false',
  cursorOverContents: 'false',
  CommonHelpText: '',
  MaskingText: '',
  RefreshSwitchId: '0',
  IndexVariableId: '0',
  RememberIndex: 'false',
  ItemVariableId: '0',
  ActorChangeable: 'false',
  okSound: '',
  cursorAllSwitchId: '0',
  cursorFixedSwitchId: '0',
});

// win_command の右に相対配置・originX=中央・ItemDrawScript 2件・未知キーを含む
const window2Raw = structStr({
  Id: 'win_detail',
  x: '0',
  y: '0',
  RelativeWindowIdX: 'win_command',
  RelativeWindowIdY: '',
  width: '0',
  height: '0',
  originX: '1',
  Rotation: '0',
  ColumnNumber: '1',
  RowNumber: '1',
  ItemHeight: '36',
  CommandList: '',
  ListWindowId: '',
  ListScript: '',
  FilterScript: '',
  MappingScript: '',
  SortScript: '',
  ItemDrawScript: JSON.stringify(['drawText:所持金', 'drawGold']),
  ItemDrawMultiLineScript: '',
  IsEnableScript: '',
  DecisionEvent: emptyEventRaw,
  CancelEvent: emptyEventRaw,
  CursorEvent: emptyEventRaw,
  ButtonEvent: '',
  Cancelable: 'false',
  PopCancel: 'false',
  WindowSkin: '',
  FontSize: '26',
  FontFace: '',
  textColor: '0',
  VisibleSwitchId: '0',
  ShowOpenAnimation: 'true',
  OverlapOther: 'false',
  HiddenNoFocus: 'false',
  DarkNoFocus: 'true',
  noFrame: 'false',
  noItemBackground: 'false',
  cursorOverContents: 'false',
  CommonHelpText: '',
  MaskingText: '',
  RefreshSwitchId: '0',
  IndexVariableId: '0',
  RememberIndex: 'false',
  ItemVariableId: '0',
  ActorChangeable: 'false',
  okSound: '',
  cursorAllSwitchId: '0',
  cursorFixedSwitchId: '0',
  // 未知キー（非破壊原則の確認用）
  FutureWindowField: 'unknown-passthrough',
});

const windowListRaw = JSON.stringify([window1Raw, window2Raw]);

export const sceneDataRaw = structStr({
  Id: 'Scene1',
  UseHelp: '0',
  HelpRows: '2',
  InitialEvent: emptyEventRaw,
  ParallelEventId: '0',
  ActorChangeEvent: emptyEventRaw,
  WindowList: windowListRaw,
  PicturePriority: '0',
  Panorama: '',
  UsePageButtons: 'false',
  SnapNoFilter: 'false',
});
