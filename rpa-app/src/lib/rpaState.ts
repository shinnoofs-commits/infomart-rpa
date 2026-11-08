declare global {
  // eslint-disable-next-line no-var
  var __rpaRunning: boolean | undefined;
  // eslint-disable-next-line no-var
  var __rpaAbortRequested: boolean | undefined;
  // eslint-disable-next-line no-var
  var __activeBrowser: any | undefined;
  // eslint-disable-next-line no-var
  var __deliSyncRunning: boolean | undefined;
  // eslint-disable-next-line no-var
  var __deliSyncStatus: {
    status: 'idle' | 'running' | 'completed' | 'error';
    message: string;
    lastRunAt?: string;
    details?: any[];
  } | undefined;
}

export function isRpaRunning(): boolean {
  return !!globalThis.__rpaRunning;
}

export function setRpaRunning(running: boolean): void {
  globalThis.__rpaRunning = running;
  if (!running) {
    globalThis.__rpaAbortRequested = false;
    globalThis.__activeBrowser = undefined;
  }
}

export function requestRpaAbort(): void {
  globalThis.__rpaAbortRequested = true;
  if (globalThis.__activeBrowser) {
    try {
      globalThis.__activeBrowser.close().catch(() => {});
    } catch (e) {
      // ignore
    }
  }
}

export function isRpaAbortRequested(): boolean {
  return !!globalThis.__rpaAbortRequested;
}

export function resetRpaAbort(): void {
  globalThis.__rpaAbortRequested = false;
}

export function setActiveBrowser(browser: any): void {
  globalThis.__activeBrowser = browser;
}

export function isDeliSyncRunning(): boolean {
  return !!globalThis.__deliSyncRunning;
}

export function setDeliSyncRunning(running: boolean, message = ''): void {
  globalThis.__deliSyncRunning = running;
  if (running) {
    globalThis.__deliSyncStatus = {
      status: 'running',
      message: message || 'デリサポーター連携を実行中...',
      lastRunAt: new Date().toISOString()
    };
  }
}

export function getDeliSyncStatus() {
  return globalThis.__deliSyncStatus || {
    status: 'idle',
    message: '待機中'
  };
}

export function setDeliSyncStatus(status: 'idle' | 'running' | 'completed' | 'error', message: string, details?: any[]) {
  globalThis.__deliSyncStatus = {
    status,
    message,
    lastRunAt: new Date().toISOString(),
    details
  };
}
