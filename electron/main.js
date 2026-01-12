const { app, BrowserWindow, ipcMain, dialog, shell, net: electronNet } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto'); // Added for integrity check
const https = require('https');
const http = require('http');
const semver = require('semver');

// Suppress Electron security warnings in development
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

const fs = require('fs');
const AdmZip = require('adm-zip');
const net = require('net');

// Allow autoplay without user interaction
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-gpu-program-cache');

let mainWindow = null;
let downloadInterval = null;
let downloadedInstallerPath = null;

// --- Configuration ---
const SECURITY_CHECK_ENABLED = true;
const SECURITY_ENDPOINT = 'https://raw.githubusercontent.com/Litas-dev/Relictum-Launcher/refs/heads/main/security.json';

// --- AutoUpdater Configuration ---
autoUpdater.autoDownload = false;
autoUpdater.verifyUpdateCodeSignature = false; // Allow delta updates for unsigned builds

// --- Application Logic ---
function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    resizable: false,
    frame: false,
    thickFrame: false, // Removes 1px border on Windows
    backgroundColor: '#1a1a1a',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow = win;

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../dist_renderer/index.html')}`;
  
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      win.loadURL('http://localhost:5174');
      win.webContents.openDevTools({ mode: 'detach' });
  } else {
      win.loadURL(startUrl);
  }

  // Ensure window is not resizable when restored
  win.on('unmaximize', () => {
      win.setResizable(false);
  });
}

// --- Global Window Controls ---

ipcMain.on('minimize-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.setResizable(true); // Allow maximizing
            mainWindow.maximize();
        }
    }
});

ipcMain.on('close-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- Game Logic ---

/** 
 * Shared helper to process downloaded game assets
 * Handles archive extraction (ZIP/RAR) and executable discovery 
 */
async function processGameDownload(downloadedFile, finalPath, eventSender, options = {}) {
    console.log("Processing download:", downloadedFile);
    let gamePath = downloadedFile;
    let archiveToExtract = null;
    let archiveType = null;

    if (!options.skipExtraction) {
        // 1. Check if the file itself is a zip or rar
        if (gamePath.toLowerCase().endsWith('.zip') && fs.existsSync(gamePath)) {
            archiveToExtract = gamePath;
            archiveType = 'zip';
        } else if (gamePath.toLowerCase().endsWith('.rar') && fs.existsSync(gamePath)) {
            archiveToExtract = gamePath;
            archiveType = 'rar';
        }
        
        // If gamePath is a directory (e.g. from torrent), search inside for archives
        if (!archiveToExtract && fs.existsSync(gamePath) && fs.statSync(gamePath).isDirectory()) {
             try {
                const files = fs.readdirSync(gamePath);
                const zipFiles = files.filter(f => f.toLowerCase().endsWith('.zip'));
                const rarFiles = files.filter(f => f.toLowerCase().endsWith('.rar'));
                
                if (zipFiles.length > 0) {
                     archiveToExtract = path.join(gamePath, zipFiles[0]);
                     archiveType = 'zip';
                } else if (rarFiles.length > 0) {
                     archiveToExtract = path.join(gamePath, rarFiles[0]);
                     archiveType = 'rar';
                }
             } catch(e) {
                 console.error("Error scanning for archive in dir:", e);
             }
        }
    } else {
        console.log("Extraction skipped per options.");
    }

    if (archiveToExtract && fs.existsSync(archiveToExtract)) {
        try {
            console.log(`Detected ${archiveType.toUpperCase()}:`, archiveToExtract);
            eventSender.send('download-status', `Extracting ${archiveType.toUpperCase()} please wait...`);
            
            if (archiveType === 'rar') {
                console.log("Using 7zip to extract RAR...");
                await new Promise((resolve, reject) => {
                    const myStream = Seven.extractFull(archiveToExtract, finalPath, {
                        $bin: sevenBin.path7za,
                        $progress: true
                    });
                    
                    myStream.on('end', () => resolve());
                    myStream.on('error', (err) => reject(err));
                    myStream.on('progress', (progress) => {
                        // Optional: Could send progress updates
                        // console.log(progress); 
                    });
                });
            } else {
                // ZIP Extraction
                // Use PowerShell for extraction on Windows (more reliable for large files)
                if (process.platform === 'win32') {
                    const powershellCommand = `Expand-Archive -LiteralPath "${archiveToExtract}" -DestinationPath "${finalPath}" -Force`;
                    console.log("Using PowerShell to extract...");
                    
                    await new Promise((resolve, reject) => {
                        const ps = spawn('powershell.exe', ['-NoProfile', '-Command', powershellCommand]);
                        
                        ps.on('close', (code) => {
                            if (code === 0) resolve();
                            else reject(new Error(`PowerShell extraction failed with code ${code}`));
                        });
                        
                        ps.on('error', (err) => reject(err));
                    });
                } else {
                    // Fallback for non-Windows (or if PS fails, though we await above)
                    const zip = new AdmZip(archiveToExtract);
                    zip.extractAllTo(finalPath, true);
                }
            }
            
            console.log("Extraction successful.");
            
            // Delete the archive file after successful extraction to save space
            try {
                fs.unlinkSync(archiveToExtract);
            } catch (err) {
                console.warn("Failed to delete archive file:", err);
            }
            
            // Attempt to locate the extracted folder
            const archiveName = path.basename(archiveToExtract, path.extname(archiveToExtract));
            const possibleDir = path.join(finalPath, archiveName);
            
            if (fs.existsSync(possibleDir) && fs.statSync(possibleDir).isDirectory()) {
                gamePath = possibleDir;
            } else {
                gamePath = finalPath;
            }
        } catch (e) {
            console.error("Extraction failed:", e);
        }
    } else {
        console.log("No Archive file detected or file not found.");
    }

    // Helper to find WoW executable
    const findExe = (dir) => {
        if (!fs.existsSync(dir)) return null;
        try {
            const files = fs.readdirSync(dir, { withFileTypes: true });
            
            // Priority 1: WoW.exe
            const wowExe = files.find(f => f.isFile() && f.name.toLowerCase() === 'wow.exe');
            if (wowExe) return path.join(dir, wowExe.name);

            // Priority 2: World of Warcraft.exe (Launcher)
            const launcherExe = files.find(f => f.isFile() && f.name.toLowerCase() === 'world of warcraft.exe');
            if (launcherExe) return path.join(dir, launcherExe.name);

            // Recursive search (Depth limited to avoid deep scans)
            for (const subdir of files.filter(f => f.isDirectory())) {
                    // Skip hidden folders or non-game folders
                    if (subdir.name.startsWith('.')) continue;
                    
                    const found = findExe(path.join(dir, subdir.name));
                    if (found) return found;
            }
        } catch (e) {
            console.error("Error scanning dir:", dir, e);
        }
        return null;
    };

    console.log("Searching for executable in:", gamePath);
    const exePath = findExe(gamePath) || findExe(finalPath);
    
    if (exePath) {
        console.log("Executable found:", exePath);
        eventSender.send('download-complete', { path: exePath });
    } else {
        console.log("Executable not found. Returning folder path.");
        eventSender.send('download-complete', { path: gamePath });
    }
}

ipcMain.handle('open-external', async (event, url) => {
    try {
        // Security: Ensure it's a web URL
        if (url.startsWith('http://') || url.startsWith('https://')) {
            await shell.openExternal(url);
            return { success: true };
        }
        return { success: false, error: 'Only HTTP/HTTPS URLs are allowed.' };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('install-remote-extension', async (event, { url, id }) => {
    try {
        const extensionsDir = path.join(app.getPath('userData'), 'extensions');
        if (!fs.existsSync(extensionsDir)) {
            fs.mkdirSync(extensionsDir, { recursive: true });
        }
        
        // Sanitize extension ID (folder name)
        const safeId = path.basename(id);
        if (safeId !== id || !id) {
             throw new Error("Invalid extension ID");
        }
        
        const extensionDir = path.join(extensionsDir, safeId);
        if (!fs.existsSync(extensionDir)) {
            fs.mkdirSync(extensionDir, { recursive: true });
        }
        
        // 1. Download Manifest
        // The URL provided is expected to be the MANIFEST URL
        const manifestUrl = url;
        const manifestPath = path.join(extensionDir, 'manifest.json');
        
        console.log(`[Extension Install] Downloading manifest from ${manifestUrl}`);
        
        await new Promise((resolve, reject) => {
             const request = electronNet.request(manifestUrl);
             request.on('response', (response) => {
                 if (response.statusCode !== 200) {
                     reject(new Error(`Failed to download manifest: ${response.statusCode}`));
                     return;
                 }
                 const file = fs.createWriteStream(manifestPath);
                 response.pipe(file);
                 file.on('finish', () => file.close(() => resolve()));
                 file.on('error', (err) => reject(err));
             });
             request.on('error', (err) => reject(err));
             request.end();
        });

        // 2. Parse Manifest to get Main Script
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const mainScript = manifest.main;
        if (!mainScript) throw new Error("Manifest missing 'main' script definition");

        // 3. Download Main Script
        // Assume script is in same folder as manifest
        const scriptUrl = manifestUrl.substring(0, manifestUrl.lastIndexOf('/')) + '/' + mainScript;
        const scriptPath = path.join(extensionDir, mainScript);
        
        // Ensure script directory exists
        const scriptDir = path.dirname(scriptPath);
        if (!fs.existsSync(scriptDir)) {
            fs.mkdirSync(scriptDir, { recursive: true });
        }

        console.log(`[Extension Install] Downloading script from ${scriptUrl}`);

        await new Promise((resolve, reject) => {
             const request = electronNet.request(scriptUrl);
             request.on('response', (response) => {
                 if (response.statusCode !== 200) {
                     reject(new Error(`Failed to download script: ${response.statusCode}`));
                     return;
                 }
                 const file = fs.createWriteStream(scriptPath);
                 response.pipe(file);
                 file.on('finish', () => file.close(() => resolve()));
                 file.on('error', (err) => reject(err));
             });
             request.on('error', (err) => reject(err));
             request.end();
        });

        return { success: true };
    } catch (e) {
        console.error("Install extension error:", e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('uninstall-extension', async (event, filename) => {
    try {
        const extensionsDir = path.join(app.getPath('userData'), 'extensions');
        const safeFilename = path.basename(filename);
        const targetPath = path.join(extensionsDir, safeFilename);
        
        if (fs.existsSync(targetPath)) {
            // Updated to support directory deletion for folder-based extensions
            fs.rmSync(targetPath, { recursive: true, force: true });
            return { success: true };
        } else {
            return { success: false, error: "Extension not found" };
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('fetch-remote-json', async (event, url) => {
    try {
        const text = await new Promise((resolve, reject) => {
            const request = electronNet.request(url);
            request.setHeader('Accept', 'application/json');
            request.on('response', (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}`));
                    return;
                }
                let data = '';
                response.on('data', (chunk) => {
                    data += chunk.toString('utf8');
                });
                response.on('end', () => resolve(data));
            });
            request.on('error', (err) => reject(err));
            request.end();
        });
        return { success: true, text };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.on('launch-game', (event, gamePath) => {
  if (!gamePath || !fs.existsSync(gamePath)) {
      event.reply('game-launch-error', 'Game executable not found!');
      return;
  }
  
  // Launch the game process
  // detached: true allows it to run independently
  // stdio: 'ignore' prevents hanging on output
  let gameProcess;
  
  if (process.platform === 'linux') {
      // Linux: Launch via Wine
      // We assume 'wine' is available in the system PATH
      console.log('Launching on Linux via Wine:', gamePath);
      gameProcess = spawn('wine', [gamePath], { detached: true, stdio: 'ignore' });
  } else {
      // Windows: Direct launch
      gameProcess = spawn(gamePath, [], { detached: true, stdio: 'ignore' });
  }
  
  // Listen for the process exit to notify renderer
  gameProcess.on('close', (code) => {
      if (!event.sender.isDestroyed()) {
          event.reply('game-closed', code);
      }
  });

  gameProcess.on('error', (err) => {
      if (!event.sender.isDestroyed()) {
          event.reply('game-launch-error', err.message);
      }
  });

  // Note: We DO NOT call gameProcess.unref() here because we want to keep 
  // the reference to listen for the 'close' event.
  // If we unref(), the event loop won't wait for the child, and listeners might stop working
  // or the object might be garbage collected (though less likely for ChildProcess).
  // However, since detached: true is set, the child will survive even if the parent exits
  // (on Windows mostly), but keeping the reference in the variable `gameProcess` 
  // within this closure is enough for the listener to work while the main process is alive.

  event.reply('game-launched', 'Game launched successfully!');
});

ipcMain.handle('clear-game-cache', async (event, gamePath) => {
    try {
        if (!gamePath) return { success: false, message: "No game path provided" };
        
        const gameDir = fs.lstatSync(gamePath).isFile() ? path.dirname(gamePath) : gamePath;
        const wdbPath = path.join(gameDir, 'WDB');
        const cachePath = path.join(gameDir, 'Cache'); // Modern clients might use this too

        let cleared = false;

        if (fs.existsSync(wdbPath)) {
            console.log("Clearing WDB cache at:", wdbPath);
            fs.rmSync(wdbPath, { recursive: true, force: true });
            cleared = true;
        }

        if (fs.existsSync(cachePath)) {
            console.log("Clearing Cache folder at:", cachePath);
            fs.rmSync(cachePath, { recursive: true, force: true });
            cleared = true;
        }

        return { success: true, cleared };
    } catch (e) {
        console.error("Error clearing cache:", e);
        return { success: false, message: e.message };
    }
});

ipcMain.handle('select-game-path', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Executables', extensions: ['exe'] }]
    });
    return (result.canceled || result.filePaths.length === 0) ? null : result.filePaths[0];
});



ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    return (result.canceled || result.filePaths.length === 0) ? null : result.filePaths[0];
});

ipcMain.handle('get-game-version', async (event, gamePath) => {
    try {
        if (!gamePath || !fs.existsSync(gamePath)) return null;
        
        // Only Windows supports getting version info this way easily
        if (process.platform === 'win32') {
             // Use PowerShell to get the ProductVersion
             const powershellCommand = `(Get-Item "${gamePath}").VersionInfo.ProductVersion`;
             
             return new Promise((resolve) => {
                 const ps = spawn('powershell.exe', ['-NoProfile', '-Command', powershellCommand]);
                 let output = '';
                 
                 ps.stdout.on('data', (data) => {
                     output += data.toString();
                 });
                 
                 ps.on('close', (code) => {
                     if (code === 0) {
                         resolve(output.trim());
                     } else {
                         resolve(null);
                     }
                 });
                 
                 ps.on('error', (err) => {
                     console.error("PowerShell version check error:", err);
                     resolve(null);
                 });
             });
        }
        return null;
    } catch (e) {
        console.error("Error getting game version:", e);
        return null;
    }
});

ipcMain.handle('read-realmlist', async (event, { gamePath }) => {
    try {
        if (!gamePath) return { success: false, message: "Missing game path" };
        
        const gameDir = path.dirname(gamePath);
        
        // Potential locations for realmlist.wtf
        const potentialPaths = [
            path.join(gameDir, 'Data', 'enUS', 'realmlist.wtf'),
            path.join(gameDir, 'Data', 'enGB', 'realmlist.wtf'),
            path.join(gameDir, 'realmlist.wtf')
        ];
        
        for (const p of potentialPaths) {
            if (fs.existsSync(p)) {
                const content = fs.readFileSync(p, 'utf8');
                return { success: true, content: content.trim() };
            }
        }
        
        return { success: false, message: "Realmlist file not found" };
    } catch (e) {
        console.error("Error reading realmlist:", e);
        return { success: false, message: e.message };
    }
});

ipcMain.handle('update-realmlist', async (event, { gamePath, content }) => {
    try {
        if (!gamePath || !content) return { success: false, message: "Missing arguments" };
        
        const gameDir = path.dirname(gamePath);
        console.log("Updating realmlist in:", gameDir);
        
        // Potential locations for realmlist.wtf
        const potentialPaths = [
            path.join(gameDir, 'realmlist.wtf'),
            path.join(gameDir, 'Data', 'enUS', 'realmlist.wtf'),
            path.join(gameDir, 'Data', 'enGB', 'realmlist.wtf')
        ];
        
        let updatedCount = 0;
        
        // Try to update existing files
        for (const p of potentialPaths) {
            if (fs.existsSync(p)) {
                try {
                    // Try to remove read-only attribute if present
                    try {
                        fs.chmodSync(p, 0o666);
                    } catch (permErr) {
                        console.warn("Could not change file permissions:", permErr);
                    }

                    fs.writeFileSync(p, content, 'utf8');
                    console.log("Updated realmlist at:", p);
                    updatedCount++;
                } catch (e) {
                    console.error("Failed to write to:", p, e);
                    // Don't throw immediately, try other paths or fallback
                }
            }
        }
        
        // If no file was found/updated, create one in the most likely location
        // For WotLK/TBC, Data/enUS is standard, but root is safer for many custom launchers
        // We will try to write to Data/enUS if the Data folder exists, otherwise root.
        if (updatedCount === 0) {
            console.log("No existing realmlist found. Creating new one.");
            
            const dataDir = path.join(gameDir, 'Data');
            const enUSDir = path.join(dataDir, 'enUS');
            
            if (fs.existsSync(enUSDir)) {
                const target = path.join(enUSDir, 'realmlist.wtf');
                fs.writeFileSync(target, content, 'utf8');
                console.log("Created realmlist at:", target);
            } else {
                const target = path.join(gameDir, 'realmlist.wtf');
                fs.writeFileSync(target, content, 'utf8');
                console.log("Created realmlist at:", target);
            }
        }
        
        return { success: true };
    } catch (e) {
        console.error("Error updating realmlist:", e);
        return { success: false, message: e.message };
    }
});

// --- AutoUpdater Configuration ---
autoUpdater.autoDownload = false;
autoUpdater.logger = console;

// --- AutoUpdater Events ---
autoUpdater.on('checking-for-update', () => {
    if (mainWindow) mainWindow.webContents.send('updater-message', { type: 'checking', text: 'Checking for updates...' });
});

autoUpdater.on('update-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('updater-message', { 
        type: 'available', 
        text: 'Update available.', 
        data: info 
    });
});

autoUpdater.on('update-not-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('updater-message', { 
        type: 'not-available', 
        text: 'Update not available.', 
        data: info 
    });
});

autoUpdater.on('error', (err) => {
    if (mainWindow) mainWindow.webContents.send('updater-message', { 
        type: 'error', 
        text: 'Error in auto-updater: ' + err, 
        data: err 
    });
});

autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow) mainWindow.webContents.send('updater-message', { 
        type: 'progress', 
        text: 'Downloading...', 
        data: progressObj 
    });
});

autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) mainWindow.webContents.send('updater-message', { 
        type: 'downloaded', 
        text: 'Update downloaded', 
        data: info 
    });
});

// --- Update IPC Handlers ---
ipcMain.on('download-update', () => {
    autoUpdater.downloadUpdate();
});

ipcMain.on('install-update', () => {
    autoUpdater.quitAndInstall();
});

ipcMain.on('open-url', (event, url) => {
    shell.openExternal(url);
});

// --- Extension System ---
let hasSyncedDevExtensions = false;

ipcMain.handle('load-extensions', async () => {
    try {
        const extensionsDir = path.join(app.getPath('userData'), 'extensions');
        
        if (!fs.existsSync(extensionsDir)) {
            fs.mkdirSync(extensionsDir, { recursive: true });
        }

        // Dev-mode sync: Sync local folders to userData (Always sync in dev to allow hot-reloading)
        if (!app.isPackaged) {
            // hasSyncedDevExtensions = true; 
            const localExtensionsDir = path.join(__dirname, '../extensions');
            if (fs.existsSync(localExtensionsDir)) {
                const entries = fs.readdirSync(localExtensionsDir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        const srcDir = path.join(localExtensionsDir, entry.name);
                        const destDir = path.join(extensionsDir, entry.name);
                        
                        // Simple sync: if not exists or dev forced, copy recursively
                        if (!fs.existsSync(destDir)) {
                             // Using simple cp recursive
                             fs.cpSync(srcDir, destDir, { recursive: true });
                             console.log(`[Extension System] Synced dev extension folder: ${entry.name}`);
                        } else {
                            // Update content if exists (basic copy over)
                            fs.cpSync(srcDir, destDir, { recursive: true, force: true });
                        }
                    }
                }
            }
        }

        const entries = fs.readdirSync(extensionsDir, { withFileTypes: true });
        const extensions = [];
        
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const extensionDir = path.join(extensionsDir, entry.name);
                const manifestPath = path.join(extensionDir, 'manifest.json');
                
                if (fs.existsSync(manifestPath)) {
                    try {
                        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                        const mainFile = manifest.main || 'index.js';
                        const mainPath = path.join(extensionDir, mainFile);
                        
                        if (fs.existsSync(mainPath)) {
                            const content = fs.readFileSync(mainPath, 'utf8');
                            
                            extensions.push({
                                name: entry.name, // Use folder name as ID/Name key
                                path: mainPath,
                                content: content,
                                metadata: manifest // Use manifest directly
                            });
                        }
                    } catch (e) {
                        console.error(`Error loading extension ${entry.name}:`, e);
                    }
                }
            }
        }
        return extensions;
    } catch (e) {
        console.error("Error loading extensions:", e);
        return [];
    }
});

// --- Extension Download & File Operations ---

// Extension System Info
    ipcMain.handle('extension-get-system-info', async () => {
        const os = require('os');
        return {
            platform: os.platform(),
            arch: os.arch(),
            release: os.release(),
            cpus: os.cpus(),
            totalmem: os.totalmem(),
            freemem: os.freemem(),
            hostname: os.hostname(),
            userInfo: os.userInfo().username
        };
    });

    // Extension Open Path
ipcMain.on('extension-open-path', (event, path) => {
    shell.openPath(path);
});

ipcMain.handle('extension-read-image', async (event, filePath) => {
    try {
        if (!filePath) return { success: false, error: 'No path' };
        if (!fs.existsSync(filePath)) return { success: false, error: 'Not found' };
        const ext = path.extname(filePath).toLowerCase();
        let mime = 'application/octet-stream';
        if (ext === '.png') mime = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
        else if (ext === '.gif') mime = 'image/gif';
        else if (ext === '.webp') mime = 'image/webp';
        const buf = fs.readFileSync(filePath);
        const base64 = buf.toString('base64');
        return { success: true, dataUrl: `data:${mime};base64,${base64}` };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

    ipcMain.on('extension-download-file', (event, { url, savePath, id }) => {
    try {
        const file = fs.createWriteStream(savePath);
        
        file.on('error', (err) => {
            console.error("[Extension] File Write Error:", err);
            event.reply('extension-download-error', { id, error: err.message });
        });

        const request = electronNet.request(url);
        
        request.on('response', (response) => {
            if (response.statusCode !== 200) {
                file.end();
                fs.unlink(savePath, () => {});
                event.reply('extension-download-error', { id, error: 'Status Code: ' + response.statusCode });
                return;
            }

            const totalBytes = parseInt(response.headers['content-length'], 10);
            let downloadedBytes = 0;

            response.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                file.write(chunk);
                
                const progress = totalBytes ? (downloadedBytes / totalBytes) * 100 : 0;
                // Send progress every ~1% or so to avoid flooding IPC? 
                // For now, send every chunk but maybe throttle in renderer.
                event.reply('extension-download-progress', { id, progress, downloadedBytes, totalBytes });
            });

            response.on('end', () => {
                file.end();
                event.reply('extension-download-complete', { id, path: savePath });
            });
            
            response.on('error', (err) => {
                file.end();
                fs.unlink(savePath, () => {});
                event.reply('extension-download-error', { id, error: err.message });
            });
        });

        request.on('error', (err) => {
            fs.unlink(savePath, () => {});
            event.reply('extension-download-error', { id, error: err.message });
        });

        request.end();
    } catch (e) {
        event.reply('extension-download-error', { id, error: e.message });
    }
});

ipcMain.handle('extension-extract-file', async (event, { filePath, destPath }) => {
    try {
        console.log(`[Extension] Extracting ${filePath} to ${destPath}`);
        if (!fs.existsSync(filePath)) throw new Error("File not found");
        
        // Ensure destination exists
        if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath, { recursive: true });
        }

        // Use AdmZip for now as it is available
        const zip = new AdmZip(filePath);
        zip.extractAllTo(destPath, true);
        
        return { success: true };
    } catch (e) {
        console.error("[Extension] Extraction failed:", e);
        return { success: false, error: e.message };
    }
});

// --- News & Status ---

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.handle('check-for-updates', async () => {
    if (!app.isPackaged) {
        // Mock for dev mode
        return { updateAvailable: false, currentVersion: app.getVersion() };
    }
    try {
        const result = await autoUpdater.checkForUpdates();
        // result is CheckResult | null
        if (result && semver.gt(result.updateInfo.version, app.getVersion())) {
             return {
                updateAvailable: true,
                currentVersion: app.getVersion(),
                latestVersion: result.updateInfo.version
             };
        } else {
             return { updateAvailable: false, currentVersion: app.getVersion() };
        }
    } catch (e) {
        console.error("AutoUpdater check failed:", e);
        return { updateAvailable: false, error: e.message, currentVersion: app.getVersion() };
    }
});

ipcMain.handle('verify-integrity', async () => {
    // 1. In Development, we cannot verify integrity of "electron.exe" against app source hash
    if (!app.isPackaged) {
        return { 
            status: 'secure', 
            message: 'Development Mode (Unverified)',
            localHash: 'DEVELOPMENT-MODE-NO-HASH'
        };
    }

    if (!SECURITY_CHECK_ENABLED) {
        return { 
            status: 'secure', 
            message: 'Security Check Disabled by Config',
            localHash: 'DISABLED'
        };
    }

    let localHash = null;
    let targetPath = 'unknown';

    try {
        // 2. Calculate Hash
        // Use original-fs to bypass Electron's ASAR patching.
        // This allows us to read the 'app.asar' file as a regular binary file.
        const originalFs = require('original-fs');
        
        targetPath = process.execPath;
        const asarPath = path.join(process.resourcesPath, 'app.asar');
        
        if (originalFs.existsSync(asarPath)) {
            targetPath = asarPath;
        }

        const fileBuffer = originalFs.readFileSync(targetPath);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        localHash = hashSum.digest('hex');

        // 3. Fetch Trusted Hash from GitHub
        const response = await fetch(SECURITY_ENDPOINT, {
            headers: { 'Cache-Control': 'no-cache' }
        });

        if (!response.ok) {
            return { status: 'warning', message: 'Could not connect to verification server.', localHash };
        }

        const data = await response.json();
        const currentVersion = app.getVersion();
        const trustedHash = data[currentVersion];

        if (!trustedHash) {
            return { status: 'warning', message: `Version ${currentVersion} is not yet verified by developer.`, localHash };
        }

        if (localHash === trustedHash) {
            return { status: 'secure', message: 'Protected by Developer', localHash, remoteHash: trustedHash };
        }

        console.warn(`Integrity Mismatch! Local: ${localHash}, Remote: ${trustedHash}`);
        return { 
            status: 'danger', 
            message: `Integrity Mismatch! Expected: ${trustedHash ? trustedHash.substring(0, 8) + '...' : 'None'}, Found: ${localHash}`,
            localHash,
            remoteHash: trustedHash
        };

    } catch (error) {
        console.error('Integrity check error:', error);
        return { 
            status: 'warning', 
            message: `Verification Error: ${error.message}`,
            localHash: localHash 
        };
    }
});

ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url);
});





// --- Discord Status ---

ipcMain.handle('fetch-discord-status', async () => {
    try {
        const response = await fetch('https://discord.com/api/v9/invites/cyH3pYM28Z?with_counts=true');
        const data = await response.json();
        return {
            online: data.approximate_presence_count || 0,
            members: data.approximate_member_count || 0,
            name: data.guild ? data.guild.name : 'Azeroth Legacy',
            invite: 'https://discord.gg/cyH3pYM28Z'
        };
    } catch (error) {
        console.error('Error fetching discord status:', error);
        return {
            online: 1914,
            members: 9503,
            name: 'Azeroth Legacy',
            invite: 'https://discord.gg/cyH3pYM28Z'
        };
    }
});

// --- Network Utils ---

ipcMain.handle('measure-latency', async () => {
    return new Promise((resolve) => {
        const start = Date.now();
        const socket = new net.Socket();
        
        socket.setTimeout(2000); // 2s timeout
        
        socket.on('connect', () => {
            const ping = Date.now() - start;
            socket.destroy();
            resolve(ping);
        });
        
        socket.on('error', () => {
            socket.destroy();
            resolve(-1);
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            resolve(-1);
        });
        
        // Connect to Logon Server
        socket.connect(3724, 'logon.warmane.com');
    });
});

// --- Addon Management ---

ipcMain.handle('get-addons', async (event, gamePath) => {
    try {
        if (!gamePath || !fs.existsSync(gamePath)) return [];
        const gameDir = fs.lstatSync(gamePath).isFile() ? path.dirname(gamePath) : gamePath;
        const addonsPath = path.join(gameDir, 'Interface', 'AddOns');
        
        if (!fs.existsSync(addonsPath)) return [];

        const folders = fs.readdirSync(addonsPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
            .filter(name => !name.startsWith('Blizzard_'));

        const addons = folders.map(folder => {
            const addonPath = path.join(addonsPath, folder);
            // Try folder name TOC first, then fallback to any .toc file
            let tocPath = path.join(addonPath, `${folder}.toc`);
            
            // If specific TOC doesn't exist, try to find any .toc file
            if (!fs.existsSync(tocPath)) {
                const files = fs.readdirSync(addonPath);
                const anyToc = files.find(f => f.endsWith('.toc'));
                if (anyToc) tocPath = path.join(addonPath, anyToc);
            }

            let metadata = { id: folder, folderName: folder, title: folder, author: null, version: null };

            if (fs.existsSync(tocPath)) {
                try {
                    const content = fs.readFileSync(tocPath, 'utf-8');
                    // Simple regex for TOC fields
                    const titleMatch = content.match(/## Title:\s*(.*)/);
                    const authorMatch = content.match(/## Author:\s*(.*)/);
                    const versionMatch = content.match(/## Version:\s*(.*)/);

                    if (titleMatch) {
                         // Remove color codes like |cffffffffName|r and |r
                         // Also handles cases with missing |r or nested colors
                         metadata.title = titleMatch[1]
                             .replace(/\|c[0-9a-fA-F]{8}/g, '') // Remove start tags
                             .replace(/\|r/g, '')               // Remove end tags
                             .replace(/\[|\]/g, '')             // Optional: clean brackets if desired, but user issue was colors. 
                                                                // Actually, let's stick to colors first.
                             .trim();
                         
                         // Re-running clean just in case brackets were intended to be kept, 
                         // but usually addons use brackets for [Category] which might be fine.
                         // The screenshot showed |c...[... so removing color code is key.
                         metadata.title = titleMatch[1]
                             .replace(/\|c[0-9a-fA-F]{8}/g, '')
                             .replace(/\|r/g, '')
                             .trim();
                    }
                    if (authorMatch) metadata.author = authorMatch[1].trim();
                    if (versionMatch) metadata.version = versionMatch[1].trim();
                } catch (e) {
                    console.error(`Error parsing TOC for ${folder}:`, e);
                }
            }

            // Check for Relictum metadata (link to browser)
            const metaPath = path.join(addonPath, '.relictum.json');
            if (fs.existsSync(metaPath)) {
                try {
                    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                    if (meta.detailUrl) metadata.detailUrl = meta.detailUrl;
                } catch (e) {
                    console.error(`Error parsing metadata for ${folder}:`, e);
                }
            }

            return metadata;
        });

        return addons;
    } catch (error) {
        console.error('Error fetching addons:', error);
        return [];
    }
});

ipcMain.handle('delete-addon', async (event, { gamePath, addonNames, addonName }) => {
    try {
        if (!gamePath) throw new Error('No game path');
        // Handle single string (legacy param or new singular) or array
        let targets = [];
        if (addonNames) {
            targets = Array.isArray(addonNames) ? addonNames : [addonNames];
        } else if (addonName) {
            targets = [addonName];
        }
        
        const gameDir = fs.lstatSync(gamePath).isFile() ? path.dirname(gamePath) : gamePath;
        
        let successCount = 0;
        let errors = [];

        for (const name of targets) {
            const addonPath = path.join(gameDir, 'Interface', 'AddOns', name);
            if (fs.existsSync(addonPath)) {
                try {
                    fs.rmSync(addonPath, { recursive: true, force: true });
                    successCount++;
                } catch (e) {
                    errors.push(`${name}: ${e.message}`);
                }
            }
        }

        if (errors.length > 0) {
            return { success: false, message: `Deleted ${successCount} addons. Errors: ${errors.join(', ')}` };
        }
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url);
});

ipcMain.handle('select-zip-file', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Zip Files', extensions: ['zip'] }]
    });
    return (result.canceled || result.filePaths.length === 0) ? null : result.filePaths[0];
});

ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    return (result.canceled || result.filePaths.length === 0) ? null : result.filePaths[0];
});

ipcMain.handle('select-image', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Images', extensions: ['jpg', 'png', 'gif', 'webp', 'jpeg'] }
        ]
    });
    return (result.canceled || result.filePaths.length === 0) ? null : result.filePaths[0];
});

ipcMain.handle('install-addon', async (event, { gamePath, filePath }) => {
    try {
        if (!gamePath) throw new Error('No game path');
        const gameDir = fs.lstatSync(gamePath).isFile() ? path.dirname(gamePath) : gamePath;
        const addonsPath = path.join(gameDir, 'Interface', 'AddOns');
        
        if (!fs.existsSync(addonsPath)) fs.mkdirSync(addonsPath, { recursive: true });

        const zip = new AdmZip(filePath);
        zip.extractAllTo(addonsPath, true);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// --- Warperia Addons Integration ---

// Helper to safely strip HTML tags (mitigates CodeQL alert)
function stripHtml(html) {
    if (!html) return '';
    let oldHtml;
    do {
        oldHtml = html;
        // Regex to remove tags, ensuring we don't match across multiple tags incorrectly
        // <[^<>]+> matches a '<' followed by one or more non-'<' non-'>' characters, then '>'
        html = html.replace(/<[^<>]+>/g, '');
    } while (html !== oldHtml);
    return html.trim();
}

ipcMain.handle('fetch-warperia-addons', async (event, expansion) => {
    // Deprecated: Warperia scraping is disabled in favor of local/GitHub mirror data.
    return [];
    /*
    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };

        let url = 'https://warperia.com/wotlk-addons/';
        if (expansion === 'tbc') {
            url = 'https://warperia.com/tbc-addons/';
        } else if (expansion === 'classic') {
            url = 'https://warperia.com/vanilla-addons/';
        }

        console.log(`[Fetch] Fetching addons for ${expansion} from ${url}`);
        const response = await fetch(url, { headers });
        const html = await response.text();
        
        const addons = [];
        // Regex to find addon cards
        const cardRegex = /<a class="[^"]*card-addon[^"]*"[^>]*href="([^"]+)"[\s\S]*?<\/a>/g;
        
        let match;
        while ((match = cardRegex.exec(html)) !== null) {
            const detailUrl = match[1];
            const cardHtml = match[0];
            
            // Extract title
            const titleMatch = cardHtml.match(/<div class="addon-title[^"]*">([\s\S]*?)<\/div>/);
            let title = titleMatch ? stripHtml(titleMatch[1]) : 'Unknown Addon';
            title = title.replace(/&#8211;/g, '-').replace(/&amp;/g, '&');
            
            // Extract description
            const descMatch = cardHtml.match(/<div class="[^"]*addon-short[^"]*">([\s\S]*?)<\/div>/);
            const description = descMatch ? stripHtml(descMatch[1]) : '';
            
            // Extract image
            const imgMatch = cardHtml.match(/data-src="([^"]+)"/) || cardHtml.match(/src="([^"]+)"/);
            const image = imgMatch ? imgMatch[1] : null;
            
            // Determine version based on expansion
            let gameVersion = '3.3.5';
            if (expansion === 'tbc') gameVersion = '2.4.3';
            if (expansion === 'classic') gameVersion = '1.12.1';

            addons.push({ title, description, image, detailUrl, gameVersion });
        }
        
        return addons;
    } catch (error) {
        console.error('Error fetching Warperia addons:', error);
        return [];
    }
    */
});

ipcMain.handle('install-warperia-addon', async (event, { gamePath, detailUrl, downloadUrl, expansion }) => {
    try {
        console.log(`[Install] Starting installation for ${detailUrl} (Exp: ${expansion})`);
        if (!gamePath) throw new Error('No game path provided');
        if (!fs.existsSync(gamePath)) throw new Error(`Game path does not exist: ${gamePath}`);

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };
        
        let targetUrl = downloadUrl;

        if (!targetUrl) {
            // 1. Fetch detail page with timeout
            console.log(`[Install] Fetching detail page (fallback)...`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
            
            const response = await fetch(detailUrl, { headers, signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error(`Failed to fetch addon page: ${response.status} ${response.statusText}`);
            
            const html = await response.text();
            
            // 2. Find zip link
            console.log(`[Install] Parsing zip link...`);
            const zipRegex = /href="([^"]+\.zip)"/g;
            let zipMatch;
            
            while ((zipMatch = zipRegex.exec(html)) !== null) {
                const url = zipMatch[1];
                if (!targetUrl) targetUrl = url; 
                
                // Prioritize expansion-specific zip if possible
                const lowerUrl = url.toLowerCase();
                if (expansion === 'wotlk' && lowerUrl.includes('wotlk')) {
                    targetUrl = url;
                    break; 
                } else if (expansion === 'tbc' && (lowerUrl.includes('tbc') || lowerUrl.includes('2.4.3'))) {
                    targetUrl = url;
                    break;
                } else if (expansion === 'classic' && (lowerUrl.includes('vanilla') || lowerUrl.includes('1.12'))) {
                    targetUrl = url;
                    break;
                }
            }
            
            if (!targetUrl) {
                console.error(`[Install] No zip link found in HTML. HTML length: ${html.length}`);
                throw new Error('No download link found for this addon');
            }
        }
        
        console.log(`[Install] Found download URL: ${targetUrl}`);

        // 3. Download zip
        const tempDir = app.getPath('temp');
        const fileName = path.basename(targetUrl);
        const zipPath = path.join(tempDir, fileName);
        
        console.log(`[Install] Downloading to ${zipPath}...`);
        
        const dlController = new AbortController();
        const dlTimeoutId = setTimeout(() => dlController.abort(), 60000); // 60s timeout for download
        
        const zipResponse = await fetch(targetUrl, { headers, signal: dlController.signal });
        clearTimeout(dlTimeoutId);
        
        if (!zipResponse.ok) throw new Error(`Failed to download zip: ${zipResponse.statusText}`);
        
        const buffer = await zipResponse.arrayBuffer();
        fs.writeFileSync(zipPath, Buffer.from(buffer));
        console.log(`[Install] Download complete. Size: ${buffer.byteLength} bytes`);
        
        // 4. Install
        console.log(`[Install] Extracting...`);
        const gameDir = fs.lstatSync(gamePath).isFile() ? path.dirname(gamePath) : gamePath;
        const addonsPath = path.join(gameDir, 'Interface', 'AddOns');
        
        if (!fs.existsSync(addonsPath)) fs.mkdirSync(addonsPath, { recursive: true });

        const zip = new AdmZip(zipPath);
        zip.extractAllTo(addonsPath, true);

        // Track installed folders for metadata
        const zipEntries = zip.getEntries();
        const installedFolders = new Set();
        zipEntries.forEach(entry => {
            const parts = entry.entryName.split('/');
            // If it's a folder or a file inside a folder, the first part is the top-level folder
            if (parts.length > 0 && parts[0]) {
                installedFolders.add(parts[0]);
            }
        });

        // Write metadata to each installed folder
        installedFolders.forEach(folder => {
            const folderPath = path.join(addonsPath, folder);
            const metaPath = path.join(folderPath, '.relictum.json');
            try {
                // Only write if it is a directory
                if (fs.existsSync(folderPath) && fs.lstatSync(folderPath).isDirectory()) {
                    fs.writeFileSync(metaPath, JSON.stringify({
                        source: 'warperia',
                        detailUrl: detailUrl,
                        installDate: new Date().toISOString()
                    }, null, 2));
                }
            } catch (e) {
                console.error(`Failed to write metadata for ${folder}:`, e);
            }
        });
        
        // Cleanup
        fs.unlinkSync(zipPath);
        console.log(`[Install] Installation successful!`);
        
        return { success: true };
    } catch (error) {
        console.error('Install Warperia addon error:', error);
        return { success: false, message: error.message };
    }
});
