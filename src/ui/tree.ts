// ウィンドウ一覧ツリー（SPEC.md §4.2 ui/tree.ts）。
// Phase 1 では読み取り専用。並べ替え / 複製 / 削除 / リネームは Phase 3 で追加する。
//
// 実装注意: render() は毎フレーム呼ばれるが、Id 集合が変わっていない限り
// DOM ノードを作り直さない。毎フレーム innerHTML で全再構築すると、
// クリック（mousedown〜mouseup の間）の途中で要素が差し替わり、
// click イベントが成立しなくなる不具合があったため（実機で確認）。

import type { EditorState } from '../editor/state';

export class WindowTree {
  readonly el: HTMLDivElement;
  private itemElements = new Map<string, HTMLDivElement>();
  private lastIds: string[] = [];
  private lastSelectedId: string | null | undefined;

  constructor(
    private readonly state: EditorState,
    private readonly onSelect: (id: string) => void
  ) {
    this.el = document.createElement('div');
    this.el.className = 'scmd-tree';
  }

  render(): void {
    const ids = this.state.windows.map((w) => w.id);
    const idsChanged = ids.length !== this.lastIds.length || ids.some((id, i) => id !== this.lastIds[i]);

    if (idsChanged) {
      this.el.innerHTML = '';
      this.itemElements.clear();

      if (ids.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'scmd-empty';
        empty.textContent = 'ウィンドウが見つかりません';
        this.el.appendChild(empty);
      } else {
        for (const win of this.state.windows) {
          const item = document.createElement('div');
          item.className = 'scmd-tree-item';
          item.textContent = win.id;
          item.addEventListener('click', () => this.onSelect(win.id));
          this.el.appendChild(item);
          this.itemElements.set(win.id, item);
        }
      }
      this.lastIds = ids;
    }

    if (idsChanged || this.state.selectedId !== this.lastSelectedId) {
      for (const [id, item] of this.itemElements) {
        item.classList.toggle('selected', id === this.state.selectedId);
      }
      this.lastSelectedId = this.state.selectedId;
    }
  }
}
