// 右ドックパネル（SPEC.md §4.2 ui/panel.ts）。
// Phase 1 ではウィンドウツリー + 読み取り専用プロパティ表示のみ。
// 3タブ構成のプロパティパネル（配置/中身/動作）は Phase 3〜5 で拡張する。

import type { EditorState } from '../editor/state';
import { getSelectedWindow } from '../editor/state';
import { WindowTree } from './tree';
import { injectStyles } from './styles';

export class InspectorPanel {
  readonly el: HTMLDivElement;
  private readonly tree: WindowTree;
  private readonly propsEl: HTMLDivElement;

  constructor(
    private readonly state: EditorState,
    onSelect: (id: string) => void
  ) {
    injectStyles();

    this.el = document.createElement('div');
    this.el.className = 'scmd-panel';
    this.el.appendChild(this.createTitle('SCMDesigner - ウィンドウ一覧'));

    this.tree = new WindowTree(state, onSelect);
    this.el.appendChild(this.tree.el);

    this.el.appendChild(this.createTitle('プロパティ（読み取り専用）'));
    this.propsEl = document.createElement('div');
    this.propsEl.className = 'scmd-props';
    this.el.appendChild(this.propsEl);
  }

  render(): void {
    this.tree.render();
    this.renderProps();
  }

  private createTitle(text: string): HTMLDivElement {
    const title = document.createElement('div');
    title.className = 'scmd-panel-title';
    title.textContent = text;
    return title;
  }

  private renderProps(): void {
    this.propsEl.innerHTML = '';
    const selected = getSelectedWindow(this.state);
    if (!selected) {
      const empty = document.createElement('div');
      empty.className = 'scmd-empty';
      empty.textContent = 'ウィンドウを選択してください';
      this.propsEl.appendChild(empty);
      return;
    }
    const rows: Array<[string, string]> = [
      ['Id', selected.id],
      ['x', String(selected.x)],
      ['y', String(selected.y)],
      ['width', String(selected.width)],
      ['height', String(selected.height)],
      ['visible', String(selected.visible)],
      ['active', String(selected.active)],
    ];
    for (const [key, value] of rows) {
      const row = document.createElement('div');
      row.className = 'scmd-prop-row';
      const k = document.createElement('span');
      k.className = 'scmd-prop-key';
      k.textContent = key;
      const v = document.createElement('span');
      v.className = 'scmd-prop-value';
      v.textContent = value;
      row.append(k, v);
      this.propsEl.appendChild(row);
    }
  }
}
