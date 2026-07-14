import { z } from 'zod';

// SceneCustomMenu.js 1.53.4 の struct を写像した zod スキーマ（SPEC.md §5.1, §5.2）。
// .passthrough() により、定義していない未知キーもオブジェクトに残したまま保持する
// （非破壊原則。CLAUDE.md「絶対に守るルール」2）。
//
// struct / 配列型のフィールドは、MZ 上で未設定の場合は空文字列 "" として
// 格納される（空オブジェクト "{}" とは意味が異なる）。この区別を維持するため、
// 該当フィールドは「構造化データ or 空文字列」の union として定義する。

const triState = z.union([z.literal(0), z.literal(1), z.literal(2)]);

/** struct / 配列型フィールド用: 本来の型か、未設定を表す空文字列のどちらかを許容する */
function orUnset<T extends z.ZodTypeAny>(schema: T) {
  return z.union([schema, z.literal('')]);
}

export const AudioSeDataSchema = z
  .object({
    name: z.string(),
    volume: z.number(),
    pitch: z.number(),
    pan: z.number(),
  })
  .passthrough();

export const EventDataSchema = z
  .object({
    CommandId: z.number(),
    FocusWindowId: z.string(),
    FocusWindowIndex: z.number(),
    Script: z.string(),
    SwitchId: z.number(),
    Deselect: z.boolean(),
  })
  .passthrough();

export const ButtonEventDataSchema = z
  .object({
    Name: z.string(),
    Event: orUnset(EventDataSchema),
  })
  .passthrough();

export const PanoramaDataSchema = z
  .object({
    Image: z.string(),
    ScrollX: z.number(),
    ScrollY: z.number(),
  })
  .passthrough();

export const CommandDataSchema = z
  .object({
    Text: z.string(),
    Align: triState,
    VisibleSwitchId: z.number(),
    VisibleScript: z.string(),
    EnableSwitchId: z.number(),
    IsEnableScript: z.string(),
    HelpText: z.string(),
    DecisionEvent: orUnset(EventDataSchema),
    CancelChoice: z.boolean(),
    OkSound: orUnset(AudioSeDataSchema),
  })
  .passthrough();

export const WindowDataSchema = z
  .object({
    Id: z.string(),
    x: z.number(),
    y: z.number(),
    RelativeWindowIdX: z.string(),
    RelativeWindowIdY: z.string(),
    width: z.number(),
    height: z.number(),
    originX: triState,
    Rotation: z.number(),
    ColumnNumber: z.number(),
    RowNumber: z.number(),
    ItemHeight: z.number(),
    CommandList: orUnset(z.array(CommandDataSchema)),
    ListWindowId: z.string(),
    ListScript: z.string(),
    FilterScript: z.string(),
    MappingScript: z.string(),
    SortScript: z.string(),
    ItemDrawScript: orUnset(z.array(z.string())),
    ItemDrawMultiLineScript: z.string(),
    IsEnableScript: z.string(),
    DecisionEvent: orUnset(EventDataSchema),
    CancelEvent: orUnset(EventDataSchema),
    CursorEvent: orUnset(EventDataSchema),
    ButtonEvent: orUnset(z.array(ButtonEventDataSchema)),
    Cancelable: z.boolean(),
    PopCancel: z.boolean(),
    WindowSkin: z.string(),
    FontSize: z.number(),
    FontFace: z.string(),
    textColor: z.number(),
    VisibleSwitchId: z.number(),
    ShowOpenAnimation: z.boolean(),
    OverlapOther: z.boolean(),
    HiddenNoFocus: z.boolean(),
    DarkNoFocus: z.boolean(),
    noFrame: z.boolean(),
    noItemBackground: z.boolean(),
    cursorOverContents: z.boolean(),
    CommonHelpText: z.string(),
    MaskingText: z.string(),
    RefreshSwitchId: z.number(),
    IndexVariableId: z.number(),
    RememberIndex: z.boolean(),
    ItemVariableId: z.number(),
    ActorChangeable: z.boolean(),
    okSound: orUnset(AudioSeDataSchema),
    cursorAllSwitchId: z.number(),
    cursorFixedSwitchId: z.number(),
  })
  .passthrough();

export const SceneDataSchema = z
  .object({
    Id: z.string(),
    UseHelp: triState,
    HelpRows: z.number(),
    InitialEvent: orUnset(EventDataSchema),
    ParallelEventId: z.number(),
    ActorChangeEvent: orUnset(EventDataSchema),
    WindowList: orUnset(z.array(WindowDataSchema)),
    PicturePriority: triState,
    Panorama: orUnset(PanoramaDataSchema),
    UsePageButtons: z.boolean(),
    SnapNoFilter: z.boolean(),
  })
  .passthrough();
