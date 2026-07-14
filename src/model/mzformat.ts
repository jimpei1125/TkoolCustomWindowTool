// MZ プラグインパラメータ文字列 ⇔ モデルの相互変換（SPEC.md §5.2、本ツールの心臓部）。
//
// MZ の struct パラメータは「JSON 文字列の入れ子」である。子 struct / 配列は
// JSON.stringify 済みの文字列として親オブジェクトの中に格納される。
// 例: WindowList: '["{\\"Id\\":\\"win1\\",...}"]'
//
// 非破壊原則（CLAUDE.md「絶対に守るルール」2）:
//  - 未知のキーは型変換せず、生の文字列のまま保持して書き戻す
//  - struct / 配列型のフィールドが「未設定」の場合、MZ は空文字列 "" を格納する
//    （空オブジェクト "{}" とは意味が異なる）。この区別を維持するため、
//    parse 後もそのフィールドの値が空文字列 '' であればそのまま '' として扱う。

export type StructName =
  | 'AudioSeData'
  | 'EventData'
  | 'ButtonEventData'
  | 'PanoramaData'
  | 'CommandData'
  | 'WindowData'
  | 'SceneData';

type FieldKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'stringArray'
  | { struct: StructName }
  | { structArray: StructName };

type FieldTypeMap = Record<string, FieldKind>;

const AudioSeDataFields: FieldTypeMap = {
  name: 'string',
  volume: 'number',
  pitch: 'number',
  pan: 'number',
};

const EventDataFields: FieldTypeMap = {
  CommandId: 'number',
  FocusWindowId: 'string',
  FocusWindowIndex: 'number',
  Script: 'string',
  SwitchId: 'number',
  Deselect: 'boolean',
};

const ButtonEventDataFields: FieldTypeMap = {
  Name: 'string',
  Event: { struct: 'EventData' },
};

const PanoramaDataFields: FieldTypeMap = {
  Image: 'string',
  ScrollX: 'number',
  ScrollY: 'number',
};

const CommandDataFields: FieldTypeMap = {
  Text: 'string',
  Align: 'number',
  VisibleSwitchId: 'number',
  VisibleScript: 'string',
  EnableSwitchId: 'number',
  IsEnableScript: 'string',
  HelpText: 'string',
  DecisionEvent: { struct: 'EventData' },
  CancelChoice: 'boolean',
  OkSound: { struct: 'AudioSeData' },
};

const WindowDataFields: FieldTypeMap = {
  Id: 'string',
  x: 'number',
  y: 'number',
  RelativeWindowIdX: 'string',
  RelativeWindowIdY: 'string',
  width: 'number',
  height: 'number',
  originX: 'number',
  Rotation: 'number',
  ColumnNumber: 'number',
  RowNumber: 'number',
  ItemHeight: 'number',
  CommandList: { structArray: 'CommandData' },
  ListWindowId: 'string',
  ListScript: 'string',
  FilterScript: 'string',
  MappingScript: 'string',
  SortScript: 'string',
  ItemDrawScript: 'stringArray',
  ItemDrawMultiLineScript: 'string',
  IsEnableScript: 'string',
  DecisionEvent: { struct: 'EventData' },
  CancelEvent: { struct: 'EventData' },
  CursorEvent: { struct: 'EventData' },
  ButtonEvent: { structArray: 'ButtonEventData' },
  Cancelable: 'boolean',
  PopCancel: 'boolean',
  WindowSkin: 'string',
  FontSize: 'number',
  FontFace: 'string',
  textColor: 'number',
  VisibleSwitchId: 'number',
  ShowOpenAnimation: 'boolean',
  OverlapOther: 'boolean',
  HiddenNoFocus: 'boolean',
  DarkNoFocus: 'boolean',
  noFrame: 'boolean',
  noItemBackground: 'boolean',
  cursorOverContents: 'boolean',
  CommonHelpText: 'string',
  MaskingText: 'string',
  RefreshSwitchId: 'number',
  IndexVariableId: 'number',
  RememberIndex: 'boolean',
  ItemVariableId: 'number',
  ActorChangeable: 'boolean',
  okSound: { struct: 'AudioSeData' },
  cursorAllSwitchId: 'number',
  cursorFixedSwitchId: 'number',
};

const SceneDataFields: FieldTypeMap = {
  Id: 'string',
  UseHelp: 'number',
  HelpRows: 'number',
  InitialEvent: { struct: 'EventData' },
  ParallelEventId: 'number',
  ActorChangeEvent: { struct: 'EventData' },
  WindowList: { structArray: 'WindowData' },
  PicturePriority: 'number',
  Panorama: { struct: 'PanoramaData' },
  UsePageButtons: 'boolean',
  SnapNoFilter: 'boolean',
};

const FIELD_TYPES: Record<StructName, FieldTypeMap> = {
  AudioSeData: AudioSeDataFields,
  EventData: EventDataFields,
  ButtonEventData: ButtonEventDataFields,
  PanoramaData: PanoramaDataFields,
  CommandData: CommandDataFields,
  WindowData: WindowDataFields,
  SceneData: SceneDataFields,
};

function parseScalar(raw: string, kind: 'string' | 'number' | 'boolean'): unknown {
  if (kind === 'string') return raw;
  if (kind === 'boolean') return raw === 'true';
  return Number(raw);
}

function serializeScalar(value: unknown, kind: 'string' | 'number' | 'boolean'): string {
  if (kind === 'string') return String(value);
  if (kind === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

/** struct 型フィールドの生文字列を parse する。空文字列は「未設定」としてそのまま '' を返す。 */
export function parseStruct(raw: string, structName: StructName): Record<string, unknown> | '' {
  if (raw === '') return '';
  const fieldTypes = FIELD_TYPES[structName];
  const rawObj = JSON.parse(raw) as Record<string, string>;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawObj)) {
    const kind = fieldTypes[key];
    result[key] = kind === undefined ? value : parseField(value, kind);
  }
  return result;
}

function parseField(raw: string, kind: FieldKind): unknown {
  if (kind === 'string' || kind === 'number' || kind === 'boolean') {
    return parseScalar(raw, kind);
  }
  if (kind === 'stringArray') {
    if (raw === '') return '';
    return JSON.parse(raw) as string[];
  }
  if ('struct' in kind) {
    return parseStruct(raw, kind.struct);
  }
  // structArray
  if (raw === '') return '';
  const items = JSON.parse(raw) as string[];
  return items.map((item) => parseStruct(item, kind.structArray));
}

/** parseStruct の逆変換。空文字列 '' が渡された場合はそのまま '' を返す。 */
export function serializeStruct(value: Record<string, unknown> | '', structName: StructName): string {
  if (value === '') return '';
  const fieldTypes = FIELD_TYPES[structName];
  const rawObj: Record<string, string> = {};
  for (const [key, fieldValue] of Object.entries(value)) {
    const kind = fieldTypes[key];
    rawObj[key] = kind === undefined ? String(fieldValue) : serializeField(fieldValue, kind);
  }
  return JSON.stringify(rawObj);
}

function serializeField(value: unknown, kind: FieldKind): string {
  if (kind === 'string' || kind === 'number' || kind === 'boolean') {
    return serializeScalar(value, kind);
  }
  if (kind === 'stringArray') {
    if (value === '') return '';
    return JSON.stringify(value as string[]);
  }
  if ('struct' in kind) {
    return serializeStruct(value as Record<string, unknown> | '', kind.struct);
  }
  // structArray
  if (value === '') return '';
  const items = (value as Array<Record<string, unknown>>).map((item) =>
    serializeStruct(item, kind.structArray)
  );
  return JSON.stringify(items);
}

/**
 * plugins.js の SceneCustomMenu parameters（トップレベル。Scene1..Scene20 等、
 * すべて struct<SceneData> の文字列）を parse する。
 */
export function parseSceneParameters(
  parameters: Record<string, string>,
  sceneKeys: string[]
): Record<string, Record<string, unknown> | ''> {
  const result: Record<string, Record<string, unknown> | ''> = {};
  for (const key of sceneKeys) {
    const raw = parameters[key];
    if (raw === undefined) continue;
    result[key] = parseStruct(raw, 'SceneData');
  }
  return result;
}

/** parseSceneParameters の逆変換。 */
export function serializeSceneParameters(
  scenes: Record<string, Record<string, unknown> | ''>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(scenes)) {
    result[key] = serializeStruct(value, 'SceneData');
  }
  return result;
}
