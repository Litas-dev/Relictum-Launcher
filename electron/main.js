const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto'); // Added for integrity check
const https = require('https');
const http = require('http');

// Suppress Electron security warnings in development
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

const fs = require('fs');
const AdmZip = require('adm-zip');
const net = require('net');

// Allow autoplay without user interaction
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// We'll load WebTorrent dynamically
let WebTorrent;
(async () => {
    try {
        const module = await import('webtorrent');
        WebTorrent = module.default || module;
    } catch (e) {
        console.error("Failed to load webtorrent:", e);
    }
})();

let client = null;
let mainWindow = null;
let downloadInterval = null;

// --- Configuration ---
const SECURITY_CHECK_ENABLED = true;
const SECURITY_ENDPOINT = 'https://raw.githubusercontent.com/Litas-dev/Unofficial-warmane-launcher/main/security.json';

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
      // webviewTag: true, // Removed as per request to revert changes
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

  ipcMain.on('minimize-window', () => win.minimize());
  ipcMain.on('maximize-window', () => {
    if (win.isMaximized()) {
        win.unmaximize();
    } else {
        win.setResizable(true); // Allow maximizing
        win.maximize();
    }
  });
  ipcMain.on('close-window', () => {
    if (client) {
        client.destroy(() => win.close());
    } else {
        win.close();
    }
  });
}

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

// Shared helper to process downloaded game (Extract Zip -> Find Exe)
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
        
        // Note: For torrents, we might need to look inside the folder, handled by caller or here if path is dir?
        // If gamePath is a directory (from torrent), we search inside.
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

ipcMain.on('launch-game', (event, gamePath) => {
  if (!gamePath || !fs.existsSync(gamePath)) {
      event.reply('game-launch-error', 'Game executable not found!');
      return;
  }
  
  // Launch the game process
  // detached: true allows it to run independently
  // stdio: 'ignore' prevents hanging on output
  const gameProcess = spawn(gamePath, [], { detached: true, stdio: 'ignore' });
  
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

// --- Torrent Logic ---

ipcMain.handle('start-download', async (event, { magnetURI, downloadPath }) => {
    try {
    let downloadSource = magnetURI;
    if (typeof downloadSource === 'string') {
        downloadSource = downloadSource.trim();
    }
    
    console.log(`[Start-Download] Received URI: '${downloadSource}'`);

    let isInternalTorrent = false;

    // Map internal torrent keys to file paths
    if (downloadSource === 'TORRENT:TBC') {
        const torrentPath = path.join(__dirname, 'torrents', 'tbc-2.4.3.torrent');
        console.log("Resolving internal torrent:", torrentPath);
        if (fs.existsSync(torrentPath)) {
             try {
                downloadSource = fs.readFileSync(torrentPath);
                isInternalTorrent = true;
                console.log("Internal torrent loaded. Buffer size:", downloadSource.length);
             } catch (e) {
                console.error("Failed to read torrent file:", e);
                return { success: false, message: "Failed to read internal torrent file" };
             }
        } else {
             console.error("Torrent file missing at:", torrentPath);
             return { success: false, message: "Internal torrent file missing" };
        }
    } else if (typeof downloadSource === 'string' && downloadSource.startsWith('TORRENT:')) {
        console.error("Unknown internal torrent key:", downloadSource);
        return { success: false, message: "Unknown internal torrent identifier" };
    }

    // Check if it's a Magnet Link or HTTP URL
    // If it's a buffer (internal torrent), isMagnet/isHttp are false
    const isMagnet = typeof downloadSource === 'string' && downloadSource.startsWith('magnet:');
    const isHttp = typeof downloadSource === 'string' && downloadSource.startsWith('http');

    // If not magnet, not http, and not internal torrent buffer, reject it
    if (!isMagnet && !isHttp && !isInternalTorrent && !Buffer.isBuffer(downloadSource)) {
        console.error("Invalid download source format");
        return { success: false, message: "Invalid download source" };
    }

    const finalPath = downloadPath || path.join(app.getPath('downloads'), 'Warmane');
    if (!fs.existsSync(finalPath)) fs.mkdirSync(finalPath, { recursive: true });

    // --- HTTP / HTTPS Download Logic ---
    if (isHttp) {
        // Ensure http/https are available in this scope (robustness fix)
        const http = require('http');
        const https = require('https');

        if (downloadInterval) clearInterval(downloadInterval);
        
        const fileUrl = downloadSource;
        const fileName = path.basename(new URL(fileUrl).pathname) || 'game_client.zip';
        const destPath = path.join(finalPath, fileName);
        
        console.log(`Starting HTTP download: ${fileUrl} -> ${destPath}`);

        return new Promise((resolve) => {
             const downloadFile = (url) => {
                 let targetUrl;
                 try {
                     targetUrl = new URL(url);
                 } catch (e) {
                     // Handle relative redirect
                     try {
                         targetUrl = new URL(url, fileUrl);
                     } catch (e2) {
                         resolve({ success: false, message: `Invalid URL: ${url}` });
                         return;
                     }
                 }
                 
                 const protocol = targetUrl.protocol === 'https:' ? https : http;
                 
                 const request = protocol.get(targetUrl.href, {
                     headers: {
                         'User-Agent': 'Azeroth-Legacy-Launcher/1.0',
                         'Connection': 'keep-alive'
                     }
                 }, (response) => {
                     // Handle Redirects
                     if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                         console.log(`Following redirect to: ${response.headers.location}`);
                         downloadFile(response.headers.location);
                         return;
                     }

                     if (response.statusCode !== 200) {
                         resolve({ success: false, message: `Download failed. Status Code: ${response.statusCode}` });
                         return;
                     }

                     const totalLength = parseInt(response.headers['content-length'], 10);
                     const startTime = Date.now();
                     
                     // Create write stream only after successful connection
                     const file = fs.createWriteStream(destPath);
                     
                     response.pipe(file);

                     // Progress Loop
                     downloadInterval = setInterval(() => {
                         if (!mainWindow) { clearInterval(downloadInterval); return; }
                         
                         const downloaded = file.bytesWritten;
                         const elapsed = (Date.now() - startTime) / 1000; // seconds
                         const speed = elapsed > 0 ? downloaded / elapsed : 0; // bytes per second

                         mainWindow.webContents.send('download-progress', {
                             progress: totalLength ? downloaded / totalLength : 0,
                             speed: speed,
                             downloaded: downloaded,
                             total: totalLength || 0,
                             peers: 1 // HTTP Source
                         });
                     }, 1000);

                     file.on('finish', () => {
                         file.close(async () => {
                             clearInterval(downloadInterval);
                             console.log("HTTP Download finished.");
                             await processGameDownload(destPath, finalPath, mainWindow.webContents);
                         });
                     });

                     file.on('error', (err) => {
                         console.error("File Write Error:", err);
                         clearInterval(downloadInterval);
                         mainWindow.webContents.send('download-cancelled');
                     });
                     
                     // Resolve success now that download has started
                     resolve({ success: true });
                 });

                 request.on('error', (err) => {
                     console.error("HTTP Request Error:", err);
                     resolve({ success: false, message: `Network Error: ${err.message}` });
                 });
             };
             
             downloadFile(fileUrl);
        });
    }

    // --- WebTorrent Logic ---
    if (!WebTorrent) return { success: false, message: 'Torrent client not initialized' };
    
    if (client) {
        client.destroy();
        if (downloadInterval) clearInterval(downloadInterval);
    }
    
    try {
        client = new WebTorrent();
    } catch (e) {
        console.error("Failed to create WebTorrent client:", e);
        return { success: false, message: "Failed to initialize torrent engine: " + e.message };
    }

    try {
        client.add(downloadSource, { path: finalPath }, (torrent) => {
            downloadInterval = setInterval(() => {
                if (!mainWindow) { clearInterval(downloadInterval); return; }
                mainWindow.webContents.send('download-progress', {
                    progress: torrent.progress,
                    speed: torrent.downloadSpeed,
                    downloaded: torrent.downloaded,
                    total: torrent.length,
                    peers: torrent.numPeers
                });
            }, 1000);

            torrent.on('done', async () => {
                clearInterval(downloadInterval);
                console.log("Torrent Download finished.");
                
                // For torrents, torrent.name is usually a folder or file name
                let gamePath = path.join(finalPath, torrent.name);
                
                // If it was the TBC internal torrent, we know we should skip extraction
                // (or if original magnetURI was the key)
                const isTBCTorrent = magnetURI === 'TORRENT:TBC';
                await processGameDownload(gamePath, finalPath, mainWindow.webContents, { skipExtraction: isTBCTorrent });
            });
            
            torrent.on('error', (err) => {
                 console.error('Torrent error:', err);
                 if (downloadInterval) clearInterval(downloadInterval);
                 mainWindow.webContents.send('download-cancelled'); // Reset UI
            });
        });
    } catch (err) {
        console.error("Failed to add torrent:", err);
        return { success: false, message: "Failed to start torrent: " + err.message };
    }

    return { success: true };
    } catch (err) {
        console.error("Unexpected error in start-download:", err);
        return { success: false, message: `Unexpected error: ${err.message}` };
    }
});

ipcMain.on('cancel-download', () => {
    if (downloadInterval) {
        clearInterval(downloadInterval);
        downloadInterval = null;
    }
    if (client) {
        client.destroy();
        client = null;
    }
    if (mainWindow) {
        mainWindow.webContents.send('download-cancelled');
        // Reset progress bar on cancel
        mainWindow.setProgressBar(-1);
    }
});

// --- Update Check ---
ipcMain.on('download-update', async (event, url) => {
    try {
        await shell.openExternal(url);
    } catch (e) {
        console.error('Failed to open update url:', e);
    }
});

ipcMain.on('open-url', (event, url) => {
    shell.openExternal(url);
});

// --- News & Status ---

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.handle('check-for-updates', async () => {
    try {
        const currentVersion = app.getVersion();
        const response = await fetch('https://api.github.com/repos/Litas-dev/Unofficial-warmane-launcher/releases/latest', {
            headers: { 'User-Agent': 'Warmane-Launcher' }
        });
        
        if (!response.ok) throw new Error('Failed to fetch releases');
        
        const data = await response.json();
        const latestVersion = data.tag_name.replace('v', '');
        
        // Simple version comparison (semver-like)
        const isNewer = (v1, v2) => {
            const p1 = v1.split('.').map(Number);
            const p2 = v2.split('.').map(Number);
            for (let i = 0; i < 3; i++) {
                if ((p1[i] || 0) > (p2[i] || 0)) return true;
                if ((p1[i] || 0) < (p2[i] || 0)) return false;
            }
            return false;
        };

        const updateAvailable = isNewer(latestVersion, currentVersion);
        
        return {
            updateAvailable,
            latestVersion,
            currentVersion,
            url: data.html_url
        };
    } catch (error) {
        console.error('Update check failed:', error);
        return { updateAvailable: false, error: error.message };
    }
});

ipcMain.handle('verify-integrity', async () => {
    // 1. In Development, we cannot verify integrity of "electron.exe" against app source hash
    if (isDev) {
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
                         // Remove color codes like |cffffffffName|r
                         metadata.title = titleMatch[1].replace(/\|c[0-9a-fA-F]{8}(.*?)\|r/g, '$1').trim(); 
                    }
                    if (authorMatch) metadata.author = authorMatch[1].trim();
                    if (versionMatch) metadata.version = versionMatch[1].trim();
                } catch (e) {
                    console.error(`Error parsing TOC for ${folder}:`, e);
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

ipcMain.handle('fetch-warperia-addons', async (event, expansion) => {
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
            let title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Unknown Addon';
            title = title.replace(/&#8211;/g, '-').replace(/&amp;/g, '&');
            
            // Extract description
            const descMatch = cardHtml.match(/<div class="[^"]*addon-short[^"]*">([\s\S]*?)<\/div>/);
            const description = descMatch ? descMatch[1].trim() : '';
            
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
});

ipcMain.handle('install-warperia-addon', async (event, { gamePath, detailUrl, expansion }) => {
    try {
        console.log(`[Install] Starting installation for ${detailUrl} (Exp: ${expansion})`);
        if (!gamePath) throw new Error('No game path provided');
        if (!fs.existsSync(gamePath)) throw new Error(`Game path does not exist: ${gamePath}`);

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };
        
        // 1. Fetch detail page with timeout
        console.log(`[Install] Fetching detail page...`);
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
        let downloadUrl = null;
        
        while ((zipMatch = zipRegex.exec(html)) !== null) {
            const url = zipMatch[1];
            if (!downloadUrl) downloadUrl = url; 
            
            // Prioritize expansion-specific zip if possible
            const lowerUrl = url.toLowerCase();
            if (expansion === 'wotlk' && lowerUrl.includes('wotlk')) {
                downloadUrl = url;
                break; 
            } else if (expansion === 'tbc' && (lowerUrl.includes('tbc') || lowerUrl.includes('2.4.3'))) {
                downloadUrl = url;
                break;
            } else if (expansion === 'classic' && (lowerUrl.includes('vanilla') || lowerUrl.includes('1.12'))) {
                downloadUrl = url;
                break;
            }
        }
        
        if (!downloadUrl) {
            console.error(`[Install] No zip link found in HTML. HTML length: ${html.length}`);
            throw new Error('No download link found for this addon');
        }
        
        console.log(`[Install] Found download URL: ${downloadUrl}`);

        // 3. Download zip
        const tempDir = app.getPath('temp');
        const fileName = path.basename(downloadUrl);
        const zipPath = path.join(tempDir, fileName);
        
        console.log(`[Install] Downloading to ${zipPath}...`);
        
        const dlController = new AbortController();
        const dlTimeoutId = setTimeout(() => dlController.abort(), 60000); // 60s timeout for download
        
        const zipResponse = await fetch(downloadUrl, { headers, signal: dlController.signal });
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
        
        // Cleanup
        fs.unlinkSync(zipPath);
        console.log(`[Install] Installation successful!`);
        
        return { success: true };
    } catch (error) {
        console.error('Install Warperia addon error:', error);
        return { success: false, message: error.message };
    }
});
