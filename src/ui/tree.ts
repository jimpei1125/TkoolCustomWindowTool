// ウィンドウ一覧ツリー（SPEC.md §4.2 ui/tree.ts）。
// Phase 3: 順序変更 / 複製 / 削除 / リネーム、テンプレートからの新規追加。
//
// 実装注意: render() は毎フレーム呼ばれるが、WindowList の Id 構成（集合と順序）が
// 変わっていない限り行の DOM ノードを作り直さない。無条件に innerHTML で
// 全再構築すると、クリックや入力中の要素が差し替わってしまい、
// click / focus が成立しなくなる不具合があったため（実機で確認）。

import type { EditorState } from '../editor/state';
import { getWindowList } from '../editor/state';
import { WINDOW_TEMPLATES } from '../editor/templates';

export interface WindowTreeCallbacks {
  onSelect(id: string): void;
  onDelete(id: string): void;
  onDuplicate(id: string): void;
  onMove(id: string, direction: 'up' | 'down'): void;
  onRename(oldId: string, newId: string): void;
  onAddTemplate(templateKey: string, newId: string): void;
}

export class WindowTree {
  readonly el: HTMLDivElement;
  private readonly rowsContainer: HTMLDivElement;
  private readonly rows = new Map<string, HTMLDivElement>();
  private lastIds: string[] = [];
  private lastSelectedId: string | null | undefined;

  constructor(
    private readonly state: EditorState,
    private readonly callbacks: WindowTreeCallbacks
  ) {
    this.el = document.createElement('div');
    this.el.className = 'scmd-tree';

    this.rowsContainer = document.createElement('div');
    this.el.appendChild(this.rowsContainer);
    this.el.appendChild(this.buildAddSection());
  }

  render(): void {
    const list = getWindowList(this.state);
    const ids = list.map((w) => String(w.Id));
    const idsChanged = ids.length !== this.lastIds.length || ids.some((id, i) => id !== this.lastIds[i]);

    if (idsChanged) {
      this.rowsContainer.innerHTML = '';
      this.rows.clear();
      if (list.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'scmd-empty';
        empty.textContent = 'ウィンドウが見つかりません';
        this.rowsContainer.appendChild(empty);
      } else {
        list.forEach((_win, index) => {
          const id = ids[index]!;
          const row = this.createRow(id, index, list.length);
          this.rowsContainer.appendChild(row);
          this.rows.set(id, row);
        });
      }
      this.lastIds = ids;
    }

    if (idsChanged || this.state.selectedId !== this.lastSelectedId) {
      for (const [id, row] of this.rows) {
        row.classList.toggle('selected', id === this.state.selectedId);
      }
      this.lastSelectedId = this.state.selectedId;
    }
  }

  private createRow(id: string, index: number, total: number): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'scmd-tree-item';
    row.addEventListener('click', () => this.callbacks.onSelect(id));

    const idInput = document.createElement('input');
    idInput.type = 'text';
    idInput.className = 'scmd-tree-id-input';
    idInput.value = id;
    idInput.addEventListener('click', (e) => e.stopPropagation());
    idInput.addEventListener('focus', () => this.callbacks.onSelect(id));
    idInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') idInput.blur();
    });
    idInput.addEventListener('blur', () => {
      const newId = idInput.value.trim();
      if (newId && newId !== id) {
        this.callbacks.onRename(id, newId);
      } else {
        idInput.value = id;
      }
    });
    row.appendChild(idInput);

    const buttons = document.createElement('div');
    buttons.className = 'scmd-tree-buttons';
    const upBtn = this.createButton('▲', () => this.callbacks.onMove(id, 'up'));
    upBtn.disabled = index === 0;
    const downBtn = this.createButton('▼', () => this.callbacks.onMove(id, 'down'));
    downBtn.disabled = index === total - 1;
    buttons.appendChild(upBtn);
    buttons.appendChild(downBtn);
    buttons.appendChild(this.createButton('⧉', () => this.callbacks.onDuplicate(id)));
    buttons.appendChild(
      this.createButton('×', () => {
        if (window.confirm(`ウィンドウ "${id}" を削除しますか？`)) this.callbacks.onDelete(id);
      })
    );
    row.appendChild(buttons);

    return row;
  }

  private createButton(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'scmd-tree-btn';
    btn.textContent = label;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  private buildAddSection(): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'scmd-tree-add';

    const select = document.createElement('select');
    select.className = 'scmd-select';
    for (const tpl of WINDOW_TEMPLATES) {
      const option = document.createElement('option');
      option.value = tpl.key;
      option.textContent = tpl.name;
      option.title = tpl.description;
      select.appendChild(option);
    }

    const idInput = document.createElement('input');
    idInput.type = 'text';
    idInput.className = 'scmd-input';
    idInput.placeholder = '新しい Id';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'scmd-button';
    addBtn.textContent = 'テンプレートから追加';
    addBtn.addEventListener('click', () => {
      const id = idInput.value.trim();
      if (!id) {
        window.alert('Id を入力してください');
        return;
      }
      this.callbacks.onAddTemplate(select.value, id);
      idInput.value = '';
    });

    section.appendChild(select);
    section.appendChild(idInput);
    section.appendChild(addBtn);
    return section;
  }
}
