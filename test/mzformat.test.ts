import { describe, expect, it } from 'vitest';
import { parseStruct, serializeStruct } from '../src/model/mzformat';
import { sceneDataRaw } from './fixtures/sceneSample';

describe('mzformat parse/serialize', () => {
  it('SceneData をラウンドトリップしても意味的に等価になる（再 parse 一致）', () => {
    const parsed = parseStruct(sceneDataRaw, 'SceneData');
    const serialized = serializeStruct(parsed, 'SceneData');
    expect(JSON.parse(serialized)).toEqual(JSON.parse(sceneDataRaw));
  });

  it('SceneData をラウンドトリップするとバイト一致する', () => {
    const parsed = parseStruct(sceneDataRaw, 'SceneData');
    const serialized = serializeStruct(parsed, 'SceneData');
    expect(serialized).toBe(sceneDataRaw);
  });

  it('未知キーを解釈せず保持する（非破壊原則）', () => {
    const parsed = parseStruct(sceneDataRaw, 'SceneData') as Record<string, unknown>;
    const windowList = parsed.WindowList as Array<Record<string, unknown>>;
    const window2 = windowList[1]!;
    expect(window2.FutureWindowField).toBe('unknown-passthrough');

    const commandList = (windowList[0]! as Record<string, unknown>).CommandList as Array<
      Record<string, unknown>
    >;
    const decisionEvent = commandList[0]!.DecisionEvent as Record<string, unknown>;
    expect(decisionEvent.UnknownFutureField).toBe('keep-me');
  });

  it('空文字列 "" と空オブジェクト "{}" を区別する', () => {
    const parsed = parseStruct(sceneDataRaw, 'SceneData') as Record<string, unknown>;
    // Panorama, InitialEvent は未設定（生値 ""）なので、parse 後も '' のまま
    expect(parsed.Panorama).toBe('');
    expect(parsed.InitialEvent).toBe('');

    const windowList = parsed.WindowList as Array<Record<string, unknown>>;
    const command2 = ((windowList[0]! as Record<string, unknown>).CommandList as Array<
      Record<string, unknown>
    >)[1]!;
    expect(command2.DecisionEvent).toBe('');
    expect(command2.OkSound).toBe('');
  });

  it('数値・真偽値フィールドを正しい型に変換する', () => {
    const parsed = parseStruct(sceneDataRaw, 'SceneData') as Record<string, unknown>;
    expect(parsed.HelpRows).toBe(2);
    expect(parsed.UseHelp).toBe(0);
    expect(parsed.UsePageButtons).toBe(false);

    const windowList = parsed.WindowList as Array<Record<string, unknown>>;
    const window2 = windowList[1]!;
    expect(window2.originX).toBe(1);
    expect(window2.width).toBe(0);
    expect(window2.height).toBe(0);
    expect(window2.RelativeWindowIdX).toBe('win_command');
    expect(window2.ItemDrawScript).toEqual(['drawText:所持金', 'drawGold']);
  });
});
