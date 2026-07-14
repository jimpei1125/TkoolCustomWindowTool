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
      padding: 4px 6px;
      cursor: pointer;
      border-radius: 2px;
    }
    .scmd-tree-item:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    .scmd-tree-item.selected {
      background: rgba(0, 150, 255, 0.4);
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
  `;
  document.head.appendChild(style);
}
