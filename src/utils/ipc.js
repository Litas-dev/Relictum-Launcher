/** Cross-environment IPC handler (Browser/Electron) */
let ipcRenderer = {
  on: () => {},
  send: () => {},
  invoke: async (channel) => {
    // Mock implementations for browser-based development
    if (channel === 'get-app-version') return '3.0.0-dev';
    if (channel === 'check-for-updates') return { updateAvailable: true, latestVersion: '1.0.1', url: '#' };
    if (channel === 'verify-integrity') return { status: 'secure', message: 'Protected by Developer (Preview)', localHash: 'BROWSER-PREVIEW-HASH' };
    if (channel === 'update-realmlist') return { success: true };
    if (channel === 'get-game-version') return '3.3.5.12340';
    if (channel === 'read-realmlist') return { success: true, content: 'set realmlist logon.example.com' };
    return null;
  },
  removeAllListeners: () => {},
  removeListener: () => {}
};

try {
  if (window.require) {
    const electron = window.require('electron');
    ipcRenderer = electron.ipcRenderer;
  }
} catch (e) {
  console.log('Running in browser mode');
}

export default ipcRenderer;
