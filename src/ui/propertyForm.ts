// プロパティパネルの配置タブ / 動作タブ（SPEC.md §7.3）。
// ui/panel.ts から分離した編集フォーム（中身タブは Phase 4 で ui/contentEditor.ts に実装）。
//
// 実装注意: render() は毎フレーム呼ばれるが、選択中 Id / タブが変わらない限り
// フォームの DOM を作り直さない。フィールドの値は「フォーカスされていない
// 入力欄のみ」state から同期する（外部変化＝ドラッグ確定等の反映と、
// 入力中の値がフレームごとに上書きされる事故の両方を成立させるため）。

import type { EditorState } from '../editor/state';
import { getWindowConfig, getWindowList } from '../editor/state';
import { validateSceneData } from '../model/validate';

export interface PropertyFormCallbacks {
  /** field は WindowData 直下のキー、または "EventField.SubKey" のドット区切りパス。 */
  onFieldChange(id: string, field: string, value: unknown): void;
  listWindowSkins(): string[];
}

type TabKey = 'placement' | 'behavior';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'placement', label: '配置' },
  { key: 'behavior', label: '動作' },
];

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

export class PropertyForm {
  readonly el: HTMLDivElement;
  private readonly tabsEl: HTMLDivElement;
  private readonly bodyEl: HTMLDivElement;
  private readonly issuesEl: HTMLDivElement;
  private readonly tabButtons = new Map<TabKey, HTMLButtonElement>();
  private activeTab: TabKey = 'placement';
  private renderedId: string | null = null;
  private renderedTab: TabKey | null = null;
  private fields = new Map<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>();

  constructor(
    private readonly state: EditorState,
    private readonly callbacks: PropertyFormCallbacks
  ) {
    this.el = document.createElement('div');

    this.tabsEl = document.createElement('div');
    this.tabsEl.className = 'scmd-tabs';
    for (const tab of TABS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'scmd-tab-button';
      btn.textContent = tab.label;
      btn.addEventListener('click', () => {
        this.activeTab = tab.key;
        this.render();
      });
      this.tabsEl.appendChild(btn);
      this.tabButtons.set(tab.key, btn);
    }
    this.el.appendChild(this.tabsEl);

    this.bodyEl = document.createElement('div');
    this.el.appendChild(this.bodyEl);

    this.issuesEl = document.createElement('div');
    this.issuesEl.className = 'scmd-issues';
    this.el.appendChild(this.issuesEl);
  }

  render(): void {
    for (const [key, btn] of this.tabButtons) {
      btn.classList.toggle('active', key === this.activeTab);
    }

    const id = this.state.selectedId;
    const config = id ? getWindowConfig(this.state, id) : null;

    if (!config || !id) {
      if (this.renderedId !== null) {
        this.bodyEl.innerHTML = '';
        const empty = document.createElement('div');
        empty.className = 'scmd-empty';
        empty.textContent = 'ウィンドウを選択してください';
        this.bodyEl.appendChild(empty);
        this.fields.clear();
        this.renderedId = null;
        this.renderedTab = null;
      }
      this.renderIssues();
      return;
    }

    const needsRebuild = id !== this.renderedId || this.activeTab !== this.renderedTab;
    if (needsRebuild) {
      this.bodyEl.innerHTML = '';
      this.fields.clear();
      if (this.activeTab === 'placement') {
        this.buildPlacementForm(id, config);
      } else {
        this.buildBehaviorForm(id, config);
      }
      this.renderedId = id;
      this.renderedTab = this.activeTab;
    } else {
      this.syncFieldsFromState(config);
    }

    this.renderIssues();
  }

  // --- 汎用フィールド構築ヘルパー ---

  private row(label: string, input: HTMLElement, column = false): HTMLDivElement {
    const row = document.createElement('div');
    row.className = column ? 'scmd-form-row column' : 'scmd-form-row';
    const labelEl = document.createElement('span');
    labelEl.className = 'scmd-form-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);
    row.appendChild(input);
    return row;
  }

  private addNumberRow(label: string, value: unknown, fieldKey: string, onCommit: (n: number) => void): void {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'scmd-input scmd-form-input';
    input.value = String(typeof value === 'number' ? value : 0);
    input.addEventListener('change', () => {
      const num = Number(input.value);
      onCommit(Number.isFinite(num) ? num : 0);
    });
    this.bodyEl.appendChild(this.row(label, input));
    this.fields.set(fieldKey, input);
  }

  private addTextRow(label: string, value: unknown, fieldKey: string, onCommit: (s: string) => void): void {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'scmd-input scmd-form-input';
    input.value = typeof value === 'string' ? value : '';
    input.addEventListener('change', () => onCommit(input.value));
    this.bodyEl.appendChild(this.row(label, input));
    this.fields.set(fieldKey, input);
  }

  private addTextAreaRow(label: string, value: unknown, fieldKey: string, onCommit: (s: string) => void): void {
    const textarea = document.createElement('textarea');
    textarea.className = 'scmd-input scmd-form-input';
    textarea.rows = 2;
    textarea.value = typeof value === 'string' ? value : '';
    textarea.addEventListener('change', () => onCommit(textarea.value));
    this.bodyEl.appendChild(this.row(label, textarea, true));
    this.fields.set(fieldKey, textarea);
  }

  private addCheckboxRow(label: string, value: unknown, fieldKey: string, onCommit: (b: boolean) => void): void {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(value);
    input.addEventListener('change', () => onCommit(input.checked));
    const row = document.createElement('div');
    row.className = 'scmd-form-checkbox-row';
    const labelEl = document.createElement('label');
    labelEl.className = 'scmd-form-label';
    labelEl.textContent = label;
    row.appendChild(input);
    row.appendChild(labelEl);
    this.bodyEl.appendChild(row);
    this.fields.set(fieldKey, input);
  }

  private addSelectRow(
    label: string,
    value: unknown,
    options: Array<{ value: string; label: string }>,
    fieldKey: string,
    onCommit: (v: string) => void
  ): void {
    const select = document.createElement('select');
    select.className = 'scmd-select scmd-form-input';
    for (const opt of options) {
      const optionEl = document.createElement('option');
      optionEl.value = opt.value;
      optionEl.textContent = opt.label;
      select.appendChild(optionEl);
    }
    select.value = String(value ?? '');
    select.addEventListener('change', () => onCommit(select.value));
    this.bodyEl.appendChild(this.row(label, select));
    this.fields.set(fieldKey, select);
  }

  // --- 配置タブ ---

  private buildPlacementForm(id: string, config: Record<string, unknown>): void {
    const list = getWindowList(this.state);
    const index = list.findIndex((w) => w.Id === id);
    const earlierIds = index >= 0 ? list.slice(0, index).map((w) => String(w.Id)) : [];

    this.addNumberRow('x', config.x, 'x', (v) => this.callbacks.onFieldChange(id, 'x', v));
    this.addNumberRow('y', config.y, 'y', (v) => this.callbacks.onFieldChange(id, 'y', v));

    this.addSelectRow(
      'X方向の基準',
      config.RelativeWindowIdX,
      [{ value: '', label: '絶対' }, ...earlierIds.map((wid) => ({ value: wid, label: `${wid} の右` }))],
      'RelativeWindowIdX',
      (v) => this.callbacks.onFieldChange(id, 'RelativeWindowIdX', v)
    );
    this.addSelectRow(
      'Y方向の基準',
      config.RelativeWindowIdY,
      [{ value: '', label: '絶対' }, ...earlierIds.map((wid) => ({ value: wid, label: `${wid} の下` }))],
      'RelativeWindowIdY',
      (v) => this.callbacks.onFieldChange(id, 'RelativeWindowIdY', v)
    );

    this.addAutoNumberRow('width（0=画面端まで自動）', 'width', config.width, id);
    this.addAutoNumberRow('height（0=行数から自動）', 'height', config.height, id);

    this.addSelectRow(
      'X軸原点',
      String(typeof config.originX === 'number' ? config.originX : 0),
      [
        { value: '0', label: '左' },
        { value: '1', label: '中央' },
        { value: '2', label: '右' },
      ],
      'originX',
      (v) => this.callbacks.onFieldChange(id, 'originX', Number(v))
    );

    this.addNumberRow('列数', config.ColumnNumber, 'ColumnNumber', (v) =>
      this.callbacks.onFieldChange(id, 'ColumnNumber', v)
    );
    this.addNumberRow('行数（0=コマンド数から自動）', config.RowNumber, 'RowNumber', (v) =>
      this.callbacks.onFieldChange(id, 'RowNumber', v)
    );
    this.addNumberRow('項目の高さ（0=自動）', config.ItemHeight, 'ItemHeight', (v) =>
      this.callbacks.onFieldChange(id, 'ItemHeight', v)
    );
  }

  private addAutoNumberRow(label: string, field: string, rawValue: unknown, id: string): void {
    const currentValue = Number(rawValue ?? 0);
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.className = 'scmd-input scmd-form-input';
    input.value = currentValue === 0 ? '' : String(currentValue);
    input.disabled = currentValue === 0;
    input.addEventListener('change', () => {
      const num = Number(input.value);
      this.callbacks.onFieldChange(id, field, Number.isFinite(num) && num > 0 ? num : 1);
    });

    const autoCheckbox = document.createElement('input');
    autoCheckbox.type = 'checkbox';
    autoCheckbox.checked = currentValue === 0;
    autoCheckbox.addEventListener('change', () => {
      if (autoCheckbox.checked) {
        input.disabled = true;
        input.value = '';
        this.callbacks.onFieldChange(id, field, 0);
      } else {
        input.disabled = false;
        input.value = '240';
        this.callbacks.onFieldChange(id, field, 240);
        input.focus();
      }
    });
    const autoLabel = document.createElement('label');
    autoLabel.className = 'scmd-auto-toggle';
    autoLabel.appendChild(autoCheckbox);
    autoLabel.appendChild(document.createTextNode('auto'));

    const row = document.createElement('div');
    row.className = 'scmd-form-row';
    const labelEl = document.createElement('span');
    labelEl.className = 'scmd-form-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);
    row.appendChild(input);
    row.appendChild(autoLabel);
    this.bodyEl.appendChild(row);

    this.fields.set(field, input);
  }

  // --- 動作タブ ---

  private buildBehaviorForm(id: string, config: Record<string, unknown>): void {
    this.addCheckboxRow('キャンセル可能', config.Cancelable, 'Cancelable', (v) =>
      this.callbacks.onFieldChange(id, 'Cancelable', v)
    );
    this.addCheckboxRow('シーン戻しキャンセル', config.PopCancel, 'PopCancel', (v) =>
      this.callbacks.onFieldChange(id, 'PopCancel', v)
    );
    this.addTextAreaRow('共通ヘルプテキスト', config.CommonHelpText, 'CommonHelpText', (v) =>
      this.callbacks.onFieldChange(id, 'CommonHelpText', v)
    );
    this.addNumberRow('表示スイッチID', config.VisibleSwitchId, 'VisibleSwitchId', (v) =>
      this.callbacks.onFieldChange(id, 'VisibleSwitchId', v)
    );
    this.addNumberRow('フォントサイズ（0=既定）', config.FontSize, 'FontSize', (v) =>
      this.callbacks.onFieldChange(id, 'FontSize', v)
    );

    const skinOptions = [
      { value: '', label: '(デフォルト)' },
      ...this.callbacks.listWindowSkins().map((name) => ({ value: name, label: name })),
    ];
    this.addSelectRow('ウィンドウスキン', config.WindowSkin, skinOptions, 'WindowSkin', (v) =>
      this.callbacks.onFieldChange(id, 'WindowSkin', v)
    );

    this.buildEventFieldset('決定イベント', 'DecisionEvent', config, id);
    this.buildEventFieldset('キャンセルイベント', 'CancelEvent', config, id);
    this.buildEventFieldset('カーソルイベント', 'CursorEvent', config, id);
  }

  private buildEventFieldset(title: string, field: string, config: Record<string, unknown>, id: string): void {
    const titleEl = document.createElement('div');
    titleEl.className = 'scmd-panel-title';
    titleEl.textContent = title;
    this.bodyEl.appendChild(titleEl);

    const event = asRecord(config[field]);
    const windowIds = getWindowList(this.state).map((w) => String(w.Id));

    this.addSelectRow(
      'フォーカス先ウィンドウ',
      event.FocusWindowId,
      [{ value: '', label: '(前のウィンドウに戻る)' }, ...windowIds.map((wid) => ({ value: wid, label: wid }))],
      `${field}.FocusWindowId`,
      (v) => this.callbacks.onFieldChange(id, `${field}.FocusWindowId`, v)
    );
    this.addNumberRow(
      'フォーカス先インデックス',
      event.FocusWindowIndex ?? -1,
      `${field}.FocusWindowIndex`,
      (v) => this.callbacks.onFieldChange(id, `${field}.FocusWindowIndex`, v)
    );
    this.addNumberRow('コモンイベントID', event.CommandId ?? 0, `${field}.CommandId`, (v) =>
      this.callbacks.onFieldChange(id, `${field}.CommandId`, v)
    );
    this.addNumberRow('スイッチID', event.SwitchId ?? 0, `${field}.SwitchId`, (v) =>
      this.callbacks.onFieldChange(id, `${field}.SwitchId`, v)
    );
    this.addTextRow('スクリプト', event.Script, `${field}.Script`, (v) =>
      this.callbacks.onFieldChange(id, `${field}.Script`, v)
    );
    this.addCheckboxRow('元ウィンドウ選択解除', event.Deselect, `${field}.Deselect`, (v) =>
      this.callbacks.onFieldChange(id, `${field}.Deselect`, v)
    );
  }

  // --- 状態同期・検証 ---

  private resolvePath(config: Record<string, unknown>, path: string): unknown {
    let cur: unknown = config;
    for (const part of path.split('.')) {
      if (typeof cur !== 'object' || cur === null) return undefined;
      cur = (cur as Record<string, unknown>)[part];
    }
    return cur;
  }

  private syncFieldsFromState(config: Record<string, unknown>): void {
    for (const [path, el] of this.fields) {
      if (document.activeElement === el) continue;
      const value = this.resolvePath(config, path);
      if (el instanceof HTMLInputElement && el.type === 'checkbox') {
        el.checked = Boolean(value);
      } else if (el instanceof HTMLSelectElement) {
        el.value = String(value ?? '');
      } else if (el instanceof HTMLTextAreaElement) {
        el.value = typeof value === 'string' ? value : '';
      } else if (el instanceof HTMLInputElement) {
        if (el.type === 'number' && el.disabled) continue; // auto 中は触らない
        el.value = value === undefined || value === '' ? '' : String(value);
      }
    }
  }

  private renderIssues(): void {
    this.issuesEl.innerHTML = '';
    const sceneData = this.state.sceneData;
    if (!sceneData) return;
    const issues = validateSceneData(sceneData);
    if (issues.length === 0) return;
    const title = document.createElement('div');
    title.className = 'scmd-panel-title';
    title.textContent = `検証警告 (${issues.length})`;
    this.issuesEl.appendChild(title);
    for (const issue of issues) {
      const div = document.createElement('div');
      div.className = `scmd-issue scmd-issue-${issue.severity}`;
      div.textContent = issue.windowId ? `[${issue.windowId}] ${issue.message}` : issue.message;
      this.issuesEl.appendChild(div);
    }
  }
}
