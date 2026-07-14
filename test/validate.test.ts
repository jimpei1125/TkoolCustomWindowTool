import { describe, expect, it } from 'vitest';
import { findScriptReferences, validateSceneData } from '../src/model/validate';

function makeWindow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    Id: 'win',
    RelativeWindowIdX: '',
    RelativeWindowIdY: '',
    ListWindowId: '',
    ListScript: '',
    ...overrides,
  };
}

describe('validateSceneData', () => {
  it('Id の重複をエラーとして検出する', () => {
    const scene = {
      WindowList: [makeWindow({ Id: 'a' }), makeWindow({ Id: 'a' })],
    };
    const issues = validateSceneData(scene);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('重複'))).toBe(true);
  });

  it('自分より前のウィンドウへの参照は正常', () => {
    const scene = {
      WindowList: [makeWindow({ Id: 'a' }), makeWindow({ Id: 'b', RelativeWindowIdX: 'a' })],
    };
    const issues = validateSceneData(scene);
    expect(issues).toEqual([]);
  });

  it('前方参照（自分より後ろのウィンドウを参照）はエラー', () => {
    const scene = {
      WindowList: [makeWindow({ Id: 'a', RelativeWindowIdX: 'b' }), makeWindow({ Id: 'b' })],
    };
    const issues = validateSceneData(scene);
    expect(issues.some((i) => i.severity === 'error' && i.field === 'RelativeWindowIdX')).toBe(true);
  });

  it('自己参照はエラー', () => {
    const scene = {
      WindowList: [makeWindow({ Id: 'a', ListWindowId: 'a' })],
    };
    const issues = validateSceneData(scene);
    expect(issues.some((i) => i.severity === 'error' && i.field === 'ListWindowId')).toBe(true);
  });

  it('存在しない Id への参照はエラー', () => {
    const scene = {
      WindowList: [makeWindow({ Id: 'a', RelativeWindowIdY: 'not_exist' })],
    };
    const issues = validateSceneData(scene);
    expect(issues.some((i) => i.message.includes('not_exist'))).toBe(true);
  });

  it('FocusWindowId が同一シーン内に存在しない場合エラー', () => {
    const scene = {
      InitialEvent: { FocusWindowId: 'missing' },
      WindowList: [makeWindow({ Id: 'a' })],
    };
    const issues = validateSceneData(scene);
    expect(issues.some((i) => i.message.includes('missing'))).toBe(true);
  });

  it('FocusWindowId が同一シーン内に存在すればエラーなし', () => {
    const scene = {
      InitialEvent: { FocusWindowId: 'a' },
      WindowList: [makeWindow({ Id: 'a' })],
    };
    const issues = validateSceneData(scene);
    expect(issues).toEqual([]);
  });
});

describe('findScriptReferences', () => {
  it('ListScript 内のクォート付き Id 参照を検出する', () => {
    const scene = {
      WindowList: [
        makeWindow({ Id: 'a' }),
        makeWindow({ Id: 'b', ListScript: "this.findWindowItem('a').name" }),
      ],
    };
    const refs = findScriptReferences(scene, 'a');
    expect(refs.some((r) => r.includes('Window[b].ListScript'))).toBe(true);
  });

  it('Event.Script 内の参照も検出する', () => {
    const scene = {
      WindowList: [
        makeWindow({
          Id: 'a',
          DecisionEvent: { Script: "SceneManager.changeWindowFocus('target_id');" },
        }),
      ],
    };
    const refs = findScriptReferences(scene, 'target_id');
    expect(refs.some((r) => r.includes('DecisionEvent.Script'))).toBe(true);
  });

  it('参照がなければ空配列', () => {
    const scene = { WindowList: [makeWindow({ Id: 'a', ListScript: '$gameParty.members();' })] };
    expect(findScriptReferences(scene, 'a')).toEqual([]);
  });
});
