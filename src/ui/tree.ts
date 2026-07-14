// ウィンドウ一覧ツリー（SPEC.md §4.2 ui/tree.ts）。
// Phase 1 では読み取り専用。並べ替え / 複製 / 削除 / リネームは Phase 3 で追加する。

import type { EditorState } from '../editor/state';

export class WindowTree {
  readonly el: HTMLDivElement;

  constructor(
    private readonly state: EditorState,
    private readonly onSelect: (id: string) => void
  ) {
    this.el = document.createElement('div');
    this.el.className = 'scmd-tree';
  }

  render(): void {
    this.el.innerHTML = '';
    if (this.state.windows.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'scmd-empty';
      empty.textContent = 'ウィンドウが見つかりません';
      this.el.appendChild(empty);
      return;
    }
    for (const win of this.state.windows) {
      const item = document.createElement('div');
      item.className = 'scmd-tree-item' + (win.id === this.state.selectedId ? ' selected' : '');
      item.textContent = win.id;
      item.addEventListener('click', () => this.onSelect(win.id));
      this.el.appendChild(item);
    }
  }
}
