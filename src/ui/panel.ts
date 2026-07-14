// 右ドックパネル（SPEC.md §4.2 ui/panel.ts）。
// Phase 1: ウィンドウツリー + 読み取り専用プロパティ表示
// Phase 2: 保存 / 破棄 / グリッド切替の簡易ツールバーとステータス表示を追加
// 3タブ構成のプロパティパネル（配置/中身/動作）は Phase 3〜5 で拡張する。

import type { EditorState } from '../editor/state';
import { getSelectedWindow } from '../editor/state';
import { WindowTree } from './tree';
import { injectStyles } from './styles';

export interface PanelCallbacks {
  onSelect(id: string): void;
  onSave(): void;
  onDiscard(): void;
  onToggleGrid(enabled: boolean): void;
}

export class InspectorPanel {
  readonly el: HTMLDivElement;
  private readonly tree: WindowTree;
  private readonly propsEl: HTMLDivElement;
  private readonly statusEl: HTMLDivElement;
  private readonly saveButton: HTMLButtonElement;
  private readonly discardButton: HTMLButtonElement;

  constructor(
    private readonly state: EditorState,
    private readonly callbacks: PanelCallbacks
  ) {
    injectStyles();

    this.el = document.createElement('div');
    this.el.className = 'scmd-panel';

    const toolbar = document.createElement('div');
    toolbar.className = 'scmd-toolbar';

    this.saveButton = document.createElement('button');
    this.saveButton.className = 'scmd-button';
    this.saveButton.textContent = '保存';
    this.saveButton.addEventListener('click', () => this.callbacks.onSave());
    toolbar.appendChild(this.saveButton);

    this.discardButton = document.createElement('button');
    this.discardButton.className = 'scmd-button';
    this.discardButton.textContent = '破棄';
    this.discardButton.addEventListener('click', () => this.callbacks.onDiscard());
    toolbar.appendChild(this.discardButton);

    const gridLabel = document.createElement('label');
    gridLabel.className = 'scmd-grid-toggle';
    const gridCheckbox = document.createElement('input');
    gridCheckbox.type = 'checkbox';
    gridCheckbox.checked = state.gridEnabled;
    gridCheckbox.addEventListener('change', () => this.callbacks.onToggleGrid(gridCheckbox.checked));
    gridLabel.appendChild(gridCheckbox);
    gridLabel.appendChild(document.createTextNode('グリッド'));
    toolbar.appendChild(gridLabel);

    this.el.appendChild(toolbar);

    this.statusEl = document.createElement('div');
    this.statusEl.className = 'scmd-status';
    this.el.appendChild(this.statusEl);

    this.el.appendChild(this.createTitle('SCMDesigner - ウィンドウ一覧'));

    this.tree = new WindowTree(state, (id) => this.callbacks.onSelect(id));
    this.el.appendChild(this.tree.el);

    this.el.appendChild(this.createTitle('プロパティ（読み取り専用）'));
    this.propsEl = document.createElement('div');
    this.propsEl.className = 'scmd-props';
    this.el.appendChild(this.propsEl);
  }

  render(): void {
    this.tree.render();
    this.renderProps();
    this.renderToolbarState();
  }

  /** 保存結果やエラーなどの一時的なメッセージを表示する。 */
  setStatusMessage(message: string, isError = false): void {
    this.statusEl.textContent = message;
    this.statusEl.classList.toggle('scmd-status-error', isError);
  }

  private createTitle(text: string): HTMLDivElement {
    const title = document.createElement('div');
    title.className = 'scmd-panel-title';
    title.textContent = text;
    return title;
  }

  private renderToolbarState(): void {
    this.saveButton.disabled = !this.state.dirty;
    this.saveButton.textContent = this.state.dirty ? '保存 *' : '保存';
    this.discardButton.disabled = !this.state.dirty;
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
