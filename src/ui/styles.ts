// オーバーレイ用 CSS（JS 内埋め込み。SPEC.md §4.2 ui/styles.ts）。

let injected = false;

export function injectStyles(): void {
  if (injected) return;
  injected = true;
  const style = document.createElement('style');
  style.textContent = `
    .scmd-panel {
      position: fixed;
      top: 0;
      right: 0;
      width: 260px;
      height: 100%;
      background: rgba(20, 20, 24, 0.9);
      color: #fff;
      font: 12px sans-serif;
      box-sizing: border-box;
      padding: 8px;
      overflow-y: auto;
      z-index: 10001;
    }
    .scmd-panel-title {
      font-weight: bold;
      margin: 8px 0 4px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.3);
      padding-bottom: 2px;
    }
    .scmd-tree-item {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 4px;
      cursor: pointer;
      border-radius: 2px;
    }
    .scmd-tree-item:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    .scmd-tree-item.selected {
      background: rgba(0, 150, 255, 0.4);
    }
    .scmd-tree-id-input {
      flex: 1;
      min-width: 0;
      background: transparent;
      color: #fff;
      border: 1px solid transparent;
      font: inherit;
      padding: 2px 4px;
      border-radius: 2px;
    }
    .scmd-tree-id-input:hover,
    .scmd-tree-id-input:focus {
      border-color: rgba(255, 255, 255, 0.3);
      background: rgba(0, 0, 0, 0.3);
    }
    .scmd-tree-buttons {
      display: flex;
      gap: 2px;
      flex-shrink: 0;
    }
    .scmd-tree-btn {
      background: #2a2a30;
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 2px;
      width: 20px;
      height: 20px;
      line-height: 1;
      font-size: 11px;
      cursor: pointer;
      padding: 0;
    }
    .scmd-tree-btn:hover:not(:disabled) {
      background: #3a3a42;
    }
    .scmd-tree-btn:disabled {
      opacity: 0.35;
      cursor: default;
    }
    .scmd-tree-add {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed rgba(255, 255, 255, 0.25);
    }
    .scmd-prop-row {
      display: flex;
      justify-content: space-between;
      padding: 2px 4px;
      gap: 8px;
    }
    .scmd-prop-key {
      color: #9cc9ff;
    }
    .scmd-empty {
      color: #888;
      padding: 4px;
      font-style: italic;
    }
    .scmd-toolbar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.3);
    }
    .scmd-button {
      background: #2a2a30;
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 3px;
      padding: 4px 8px;
      cursor: pointer;
      font: inherit;
    }
    .scmd-button:hover:not(:disabled) {
      background: #3a3a42;
    }
    .scmd-button:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .scmd-grid-toggle {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: auto;
      cursor: pointer;
    }
    .scmd-status {
      min-height: 1.4em;
      padding: 4px 2px;
      color: #9cff9c;
      font-size: 11px;
    }
    .scmd-status.scmd-status-error {
      color: #ff9c9c;
    }
    .scmd-select,
    .scmd-input {
      background: #1c1c20;
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 3px;
      padding: 3px 4px;
      font: inherit;
      max-width: 100%;
      box-sizing: border-box;
    }
    .scmd-tabs {
      display: flex;
      gap: 4px;
      margin-top: 4px;
    }
    .scmd-tab-button {
      flex: 1;
      background: #1c1c20;
      color: #ccc;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 3px 3px 0 0;
      padding: 4px 2px;
      cursor: pointer;
      font: inherit;
    }
    .scmd-tab-button.active {
      background: #2a2a30;
      color: #fff;
      font-weight: bold;
    }
    .scmd-form-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 3px 2px;
    }
    .scmd-form-row.column {
      flex-direction: column;
      align-items: stretch;
    }
    .scmd-form-label {
      flex: 0 0 auto;
      min-width: 88px;
      color: #9cc9ff;
      font-size: 11px;
    }
    .scmd-form-input {
      flex: 1;
      min-width: 0;
    }
    .scmd-form-checkbox-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 3px 2px;
    }
    .scmd-form-checkbox-row .scmd-form-label {
      min-width: 0;
    }
    .scmd-auto-toggle {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      color: #ccc;
      white-space: nowrap;
    }
    .scmd-issues {
      margin-top: 4px;
    }
    .scmd-issue {
      padding: 3px 4px;
      border-radius: 2px;
      font-size: 11px;
      margin-bottom: 2px;
    }
    .scmd-issue-error {
      background: rgba(255, 60, 60, 0.2);
      color: #ff9c9c;
    }
    .scmd-issue-warning {
      background: rgba(255, 200, 60, 0.15);
      color: #ffd98c;
    }
  `;
  document.head.appendChild(style);
}
