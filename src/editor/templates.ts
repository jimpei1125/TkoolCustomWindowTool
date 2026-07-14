// ウィンドウテンプレート定義（SPEC.md §7.5）。
// テンプレートは WindowData の全フィールドを持つ完全なオブジェクトを生成する
// （非破壊原則により、未設定の struct/配列フィールドは MZ の慣習に合わせて
// 空文字列 '' とする。mzformat.serializeStruct がそのまま '' として書き戻す）。

function baseWindowData(id: string): Record<string, unknown> {
  return {
    Id: id,
    x: 0,
    y: 0,
    RelativeWindowIdX: '',
    RelativeWindowIdY: '',
    width: 240,
    height: 0,
    originX: 0,
    Rotation: 0,
    ColumnNumber: 1,
    RowNumber: 0,
    ItemHeight: 0,
    CommandList: '',
    ListWindowId: '',
    ListScript: '',
    FilterScript: '',
    MappingScript: '',
    SortScript: '',
    ItemDrawScript: '',
    ItemDrawMultiLineScript: '',
    IsEnableScript: '',
    DecisionEvent: '',
    CancelEvent: '',
    CursorEvent: '',
    ButtonEvent: '',
    Cancelable: true,
    PopCancel: true,
    WindowSkin: '',
    FontSize: 0,
    FontFace: '',
    textColor: 0,
    VisibleSwitchId: 0,
    ShowOpenAnimation: true,
    OverlapOther: false,
    HiddenNoFocus: false,
    DarkNoFocus: false,
    noFrame: false,
    noItemBackground: false,
    cursorOverContents: false,
    CommonHelpText: '',
    MaskingText: '',
    RefreshSwitchId: 0,
    IndexVariableId: 0,
    RememberIndex: false,
    ItemVariableId: 0,
    ActorChangeable: false,
    okSound: '',
    cursorAllSwitchId: 0,
    cursorFixedSwitchId: 0,
  };
}

function commandData(text: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    Text: text,
    Align: 0,
    VisibleSwitchId: 0,
    VisibleScript: '',
    EnableSwitchId: 0,
    IsEnableScript: '',
    HelpText: '',
    DecisionEvent: '',
    CancelChoice: false,
    OkSound: '',
    ...overrides,
  };
}

function eventData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    CommandId: 0,
    FocusWindowId: '',
    FocusWindowIndex: -1,
    Script: '',
    SwitchId: 0,
    Deselect: false,
    ...overrides,
  };
}

export interface WindowTemplate {
  key: string;
  name: string;
  description: string;
  build(id: string): Record<string, unknown>;
}

export const WINDOW_TEMPLATES: WindowTemplate[] = [
  {
    key: 'yesno',
    name: 'はい / いいえ',
    description: 'コマンドリスト2件（「いいえ」はキャンセル選択肢）',
    build: (id) => ({
      ...baseWindowData(id),
      width: 240,
      RowNumber: 2,
      ItemHeight: 36,
      CommandList: [commandData('はい'), commandData('いいえ', { CancelChoice: true })],
    }),
  },
  {
    key: 'vertical-command',
    name: '縦コマンド',
    description: 'コマンドリスト3件のひな形',
    build: (id) => ({
      ...baseWindowData(id),
      width: 240,
      RowNumber: 3,
      ItemHeight: 36,
      CommandList: [commandData('項目1'), commandData('項目2'), commandData('項目3')],
    }),
  },
  {
    key: 'party-list',
    name: 'パーティ一覧',
    description: '$gameParty.members() + drawActorSimpleStatus',
    build: (id) => ({
      ...baseWindowData(id),
      width: 480,
      RowNumber: 4,
      ItemHeight: 96,
      ListScript: '$gameParty.members(); // パーティメンバー',
      ItemDrawScript: ['this.drawActorSimpleStatus(item, r.x, r.y, r.width); // アクターのステータス'],
    }),
  },
  {
    key: 'item-list',
    name: 'アイテム一覧',
    description: '$gameParty.items()、ヘルプ連動（共通ヘルプテキストは動作タブで設定してください）',
    build: (id) => ({
      ...baseWindowData(id),
      width: 0,
      RowNumber: 6,
      ItemHeight: 0,
      ListScript: '$gameParty.items(); // 所持消耗品',
    }),
  },
  {
    key: 'detail-linked',
    name: '一覧連動詳細',
    description:
      'ListWindowId=選択中の一覧 + 顔グラ描画（参照する一覧ウィンドウのIdは追加後に配置タブで設定してください）',
    build: (id) => ({
      ...baseWindowData(id),
      width: 0,
      height: 300,
      ItemDrawScript: ['this.drawFace(item.faceName(), item.faceIndex(), r.x, r.y); // フェイスグラフィック'],
    }),
  },
  {
    key: 'save-load',
    name: 'セーブ / ロード',
    description: 'createSaveFiles() + drawSavefileInfo + executeSave（ロードに変えたい場合は動作タブで編集）',
    build: (id) => ({
      ...baseWindowData(id),
      width: 0,
      RowNumber: 4,
      ItemHeight: 0,
      ListScript: 'this.createSaveFiles(); // セーブファイル一覧',
      ItemDrawScript: ['this.drawSavefileInfo(item, r.x, r.y, r.width); // セーブファイルの内容を描画'],
      DecisionEvent: eventData({ Script: 'this.executeSave(v(1)); // セーブ実行' }),
    }),
  },
  {
    key: 'gold',
    name: '所持金',
    description: '単項目 + drawText($gameParty.gold())',
    build: (id) => ({
      ...baseWindowData(id),
      width: 240,
      height: 0,
      RowNumber: 1,
      ListScript: 'null; // なし(単項目表示ウィンドウ用)',
      ItemDrawScript: ["this.drawText($gameParty.gold(), 0, 0, this.contentsWidth(), 'right'); // 所持金"],
    }),
  },
  {
    key: 'free-text',
    name: 'フリーテキスト',
    description: '単項目 + drawTextEx（制御文字が使えます）',
    build: (id) => ({
      ...baseWindowData(id),
      width: 240,
      height: 0,
      RowNumber: 1,
      ListScript: 'null; // なし(単項目表示ウィンドウ用)',
      ItemDrawScript: ['this.drawTextEx("ここにテキスト", 0, 0, this.contentsWidth()); // 任意のテキスト描画'],
    }),
  },
];

export function findTemplate(key: string): WindowTemplate | undefined {
  return WINDOW_TEMPLATES.find((t) => t.key === key);
}
