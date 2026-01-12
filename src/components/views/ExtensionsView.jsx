import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Search, Puzzle, Download, Check, Loader2, Info, X, ToggleLeft, ToggleRight } from 'lucide-react';
import ipcRenderer from '../../utils/ipc';
import ExtensionStore from '../../utils/ExtensionStore';
import ExtensionLoader from '../../utils/ExtensionLoader';
import styles from '../AddonsView.module.css';

const ExtensionsView = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('installed');
    const [installedExtensions, setInstalledExtensions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [installing, setInstalling] = useState(null);
    const [search, setSearch] = useState('');
    const [selectedExtension, setSelectedExtension] = useState(null);
    const [fetchLog, setFetchLog] = useState([]);
    
    const [availableExtensions, setAvailableExtensions] = useState([]);
    const [extensionToDelete, setExtensionToDelete] = useState(null);

    

    // Remote Fetch
    const fetchRemoteExtensions = async () => {
        const logFetch = (m) => setFetchLog(prev => [...prev, { ts: Date.now(), m }].slice(-50));
        const candidateFiles = ['extensions.json', 'exstentions.json'];
        const urls = [
            // main/main
            'https://raw.githubusercontent.com/Litas-dev/Extensions/refs/heads/main/main/extensions.json',
            'https://raw.githubusercontent.com/Litas-dev/Extensions/main/main/extensions.json',
            'https://raw.githubusercontent.com/Litas-dev/Extensions/refs/heads/main/main/exstentions.json',
            'https://raw.githubusercontent.com/Litas-dev/Extensions/main/main/exstentions.json',
            // root and main/
            'https://raw.githubusercontent.com/Litas-dev/Extensions/refs/heads/main/extensions.json',
            'https://raw.githubusercontent.com/Litas-dev/Extensions/main/extensions.json',
            'https://raw.githubusercontent.com/Litas-dev/Extensions/refs/heads/main/exstentions.json',
            'https://raw.githubusercontent.com/Litas-dev/Extensions/main/exstentions.json',
            // legacy master
            'https://raw.githubusercontent.com/Litas-dev/Extensions/master/extensions.json',
            'https://raw.githubusercontent.com/Litas-dev/Extensions/master/exstentions.json'
        ];
        const githubApiFileUrl = 'https://api.github.com/repos/Litas-dev/Extensions/contents/main/extensions.json?ref=main';

        const safeParseJson = (text) => {
            if (!text) return null;
            let cleaned = text.replace(/^\uFEFF/, '');
            cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
            cleaned = cleaned.replace(/(^|\n)\s*\/\/.*$/gm, '');
            cleaned = cleaned
                .replace(/,\s*([}\]])/g, '$1')
                .trim();
            try {
                return JSON.parse(cleaned);
            } catch {
                return null;
            }
        };

        const normalize = (raw) => {
            let list = [];
            if (Array.isArray(raw)) list = raw;
            else if (raw && Array.isArray(raw.extensions)) list = raw.extensions;
            else if (raw && raw.main && Array.isArray(raw.main.extensions)) list = raw.main.extensions;
            // Filter invalid entries, map alternate keys
            const sanitizeUrl = (u) => {
                if (!u) return u;
                return String(u).replace(/[`\s]+/g, '').trim();
            };
            return (list || []).map(item => {
                const mapped = {
                    name: item.name || item.id || 'Unnamed',
                    author: item.author || item.metadata?.author || '',
                    version: item.version || item.metadata?.version || '',
                    description: item.description || item.metadata?.description || '',
                    url: item.url || item.download_url || item.script_url || item.content_url,
                    id: item.id || item.name,
                    downloads: item.downloads || 0,
                    date: item.date || item.updated_at || '',
                    image: item.image || item.metadata?.image || null
                };
                mapped.url = sanitizeUrl(mapped.url);
                if (mapped.image) mapped.image = sanitizeUrl(mapped.image);
                return mapped;
            }).filter(e => !!e.url && !!e.name);
        };

        // Renderer fetch removed due to CORS; use main-process fetch only
        for (let base of urls) {
            const url = `${base}?t=${Date.now()}`;
            logFetch(`try ${url}`);
            const viaMain = await ipcRenderer.invoke('fetch-remote-json', url);
            if (viaMain && viaMain.success && viaMain.text) {
                const json = safeParseJson(viaMain.text);
                const normalized = normalize(json);
                logFetch(`main parsed ${normalized.length} from ${base}`);
                if (normalized.length) return normalized;
            } else {
                logFetch(`main fail ${base}: ${viaMain && viaMain.error ? viaMain.error : 'no response'}`);
            }
        }

        // Fallback: GitHub API single file (raw via accept header)
        try {
            const apiUrl = `${githubApiFileUrl}&t=${Date.now()}`;
            logFetch(`try ${apiUrl}`);
            const viaMain = await ipcRenderer.invoke('fetch-remote-json', apiUrl);
            if (viaMain && viaMain.success && viaMain.text) {
                const json = safeParseJson(viaMain.text);
                const normalized = normalize(json);
                logFetch(`parsed ${normalized.length} from single-file api (main)`);
                if (normalized.length) return normalized;
            } else {
                logFetch(`fail single-file api (main): ${viaMain && viaMain.error ? viaMain.error : 'no response'}`);
            }
        } catch (e) {
            logFetch(`fail single-file api (exception): ${e && e.message ? e.message : 'error'}`);
        }

        // Fallback: GitHub API directory listing to locate feed file dynamically
        const githubDirUrls = [
            'https://api.github.com/repos/Litas-dev/Extensions/contents/main/main?ref=main',
            'https://api.github.com/repos/Litas-dev/Extensions/contents/main?ref=main',
            'https://api.github.com/repos/Litas-dev/Extensions/contents/?ref=main'
        ];
        for (let dir of githubDirUrls) {
            const dirUrl = `${dir}&t=${Date.now()}`;
            logFetch(`try ${dirUrl}`);
            const listingMain = await ipcRenderer.invoke('fetch-remote-json', dirUrl);
            if (listingMain && listingMain.success && listingMain.text) {
                let listing;
                try { listing = JSON.parse(listingMain.text); } catch { listing = null; }
                if (Array.isArray(listing)) {
                    for (let fname of candidateFiles) {
                        const match = listing.find(entry => entry && entry.name === fname);
                        if (match && match.download_url) {
                            const rawUrl = `${match.download_url}?t=${Date.now()}`;
                            logFetch(`try ${rawUrl}`);
                            const rawMain = await ipcRenderer.invoke('fetch-remote-json', rawUrl);
                            if (rawMain && rawMain.success && rawMain.text) {
                                const json = safeParseJson(rawMain.text);
                                const normalized = normalize(json);
                                logFetch(`parsed ${normalized.length} from dir match (main)`);
                                if (normalized.length) return normalized;
                            } else {
                                logFetch(`fail dir match (main): ${rawMain && rawMain.error ? rawMain.error : 'no response'}`);
                            }
                        }
                    }
                }
            } else {
                logFetch(`fail dir (main) ${dir}: ${listingMain && listingMain.error ? listingMain.error : 'no response'}`);
            }
        }
        return [];
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Load installed
                setInstalledExtensions([...ExtensionStore.getExtensions()]);
                
                // Load available
                const remote = await fetchRemoteExtensions();
                setAvailableExtensions(remote);
            } catch (e) {
                console.error("Failed to load extensions:", e);
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
        
        const updateInstalled = () => {
            setInstalledExtensions([...ExtensionStore.getExtensions()]);
        };
        
        // Subscribe to store changes
        const unsubscribe = ExtensionStore.subscribe(updateInstalled);
        return unsubscribe;
    }, []);

    useEffect(() => {
        const refreshIfBrowse = async () => {
            if (activeTab === 'browse') {
                const remote = await fetchRemoteExtensions();
                setAvailableExtensions(remote);
            }
        };
        refreshIfBrowse();
    }, [activeTab]);

    const handleInstall = async (extension) => {
        const installId = extension.id || extension.name;
        setInstalling(installId);
        try {
            const result = await ExtensionLoader.installExtension(extension.url, installId);
            
            if (result) {
                // The loader will automatically reload and the store subscription will update the UI
                console.log("Install successful");
            } else {
                console.error("Install failed");
            }
        } catch (e) {
            console.error("Install error:", e);
        } finally {
            setInstalling(null);
        }
    };

    const handleUninstall = (extensionName) => {
        // Find extension object or create a temporary one for the modal
        const extension = installedExtensions.find(p => p.name === extensionName) || { name: extensionName };
        setExtensionToDelete(extension);
    };

    const confirmUninstall = async () => {
        if (!extensionToDelete) return;
        try {
            const success = await ExtensionLoader.uninstallExtension(extensionToDelete.name);
            if (success) {
                // Ensure UI reflects latest store state
                setInstalledExtensions([...ExtensionStore.getExtensions()]);
            } else {
                console.error("Uninstall failed");
            }
        } catch (e) {
            console.error("Uninstall error:", e);
        } finally {
            setExtensionToDelete(null);
        }
    };
    
    const isInstalled = (id) => {
        return installedExtensions.some(p => 
            p.name === id || 
            (p.metadata && p.metadata.id === id) ||
            (id && p.name === id.split(/[/\\]/).pop())
        );
    };

    const openDetails = (extension) => {
        setSelectedExtension(extension);
    };

    const closeDetails = () => {
        setSelectedExtension(null);
    };

    const toggleExtension = async (name, enabled) => {
        await ExtensionLoader.toggleExtension(name, enabled);
        // The loader reload will trigger store update which updates UI
    };

    

    const filteredBrowse = availableExtensions.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        p.description.toLowerCase().includes(search.toLowerCase())
    );

    const filteredInstalled = installedExtensions.filter(p => 
        (p.metadata?.name || p.name).toLowerCase().includes(search.toLowerCase())
    );

    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewCandidates, setPreviewCandidates] = useState([]);

    const getInstalledPreviewCandidates = (ext) => {
        const p = String(ext && ext.path ? ext.path : '');
        if (!p) return [];
        const forward = p.replace(/\\/g, '/');
        const dirFs = forward.replace(/\/[^\/]*$/, '');
        const manifestImage = (ext && ext.metadata && ext.metadata.image) ? String(ext.metadata.image) : null;
        if (manifestImage) {
            if (/^https?:\/\//i.test(manifestImage)) return [manifestImage];
            return [dirFs + '/' + manifestImage];
        }
        const files = ['preview.png','preview.jpg','image.png','image.jpg','screenshot.png','screenshot.jpg','cover.png','cover.jpg'];
        return files.map(f => dirFs + '/' + f);
    };

    const getRemotePreviewCandidates = (ext) => {
        const u = String(ext && (ext.url || ''));
        if (!u) return [];
        const root = u.replace(/manifest\.json$/i, '');
        const manifestImage = (ext.image || (ext.metadata && ext.metadata.image)) ? String(ext.image || ext.metadata.image) : null;
        if (manifestImage) {
            if (/^https?:\/\//i.test(manifestImage)) return [manifestImage];
            return [root + manifestImage];
        }
        const files = ['preview.png','image.png','screenshot.png','cover.png','preview.jpg','image.jpg','screenshot.jpg','cover.jpg'];
        return files.map(f => root + f);
    };

    useEffect(() => {
        if (!selectedExtension) {
            setPreviewUrl(null);
            setPreviewCandidates([]);
            return;
        }
        const id = selectedExtension.id || selectedExtension.name;
        if (isInstalled(id)) {
            const localCandidates = getInstalledPreviewCandidates(selectedExtension);
            const remoteRef = availableExtensions.find(e => (e.id === id) || (e.name === id) || (e.name === (selectedExtension.name || '')));
            const remoteCandidates = remoteRef ? getRemotePreviewCandidates(remoteRef) : [];
            const candidates = [...localCandidates, ...remoteCandidates];
            setPreviewCandidates(candidates);
            (async () => {
                let found = null;
                for (let i = 0; i < candidates.length; i++) {
                    const c = candidates[i];
                    if (/^https?:\/\//i.test(c)) {
                        found = c;
                        break;
                    }
                    const res = await ipcRenderer.invoke('extension-read-image', c);
                    if (res && res.success && res.dataUrl) {
                        found = res.dataUrl;
                        break;
                    }
                }
                setPreviewUrl(found || null);
            })();
        } else {
            const candidates = getRemotePreviewCandidates(selectedExtension);
            setPreviewCandidates(candidates);
            setPreviewUrl(candidates[0] || null);
        }
    }, [selectedExtension, installedExtensions]);

    const handlePreviewError = async () => {
        if (previewCandidates.length > 1) {
            const next = [...previewCandidates.slice(1)];
            setPreviewCandidates(next);
            const id = selectedExtension && (selectedExtension.id || selectedExtension.name);
            const installed = id ? isInstalled(id) : false;
            const candidate = next[0] || null;
            if (!candidate) {
                setPreviewUrl(null);
                return;
            }
            if (installed) {
                if (/^https?:\/\//i.test(candidate)) {
                    setPreviewUrl(candidate);
                } else {
                    const res = await ipcRenderer.invoke('extension-read-image', candidate);
                    setPreviewUrl((res && res.success && res.dataUrl) ? res.dataUrl : null);
                }
            } else {
                setPreviewUrl(candidate);
            }
        } else {
            setPreviewUrl(null);
        }
    };

    const isOfficialExt = (ext) => {
        const u = String(ext.url || '').toLowerCase();
        return u.includes('raw.githubusercontent.com/litas-dev/extensions');
    };
    const officialBrowse = filteredBrowse.filter(isOfficialExt);
    const communityBrowse = filteredBrowse.filter(e => !isOfficialExt(e));

    return (
        <div className={`${styles.addonsView} ${styles.extensionsRoot}`}>
             <div className={styles.viewHeader}>
                <h2>{t('extensions.title') || 'Extensions'}</h2>
                <div className={styles.addonTabs}>
                    <button 
                        className={`${styles.tabBtn} ${activeTab === 'installed' ? styles.active : ''}`} 
                        onClick={() => setActiveTab('installed')}
                    >
                        {t('extensions.tabs.installed')}
                    </button>
                    <button 
                        className={`${styles.tabBtn} ${activeTab === 'browse' ? styles.active : ''}`} 
                        onClick={() => setActiveTab('browse')}
                    >
                        {t('extensions.tabs.browse')}
                    </button>
                </div>
            </div>

            <div className={styles.addonsContent}>
                <div className={styles.addonsToolbar}>
                    <div className={styles.searchInputWrapper} style={{width: activeTab === 'browse' ? 'auto' : '100%', flex: 1}}>
                        <Search size={16} className={styles.searchIcon} />
                        <input 
                            type="text" 
                            className={styles.searchInput}
                            placeholder={t('addons.search_placeholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    
                    
                </div>

                <div className={styles.addonsListContainer}>
                    {loading ? (
                        <div className={styles.loadingState}>{t('addons.loading')}</div>
                    ) : activeTab === 'installed' ? (
                        filteredInstalled.length > 0 ? (
                            filteredInstalled.map((extension, idx) => (
                                <div key={idx} className={styles.addonRow} onClick={() => openDetails(extension)}>
                                    <div className={styles.addonHeader}>
                                        <div className={styles.addonIconPlaceholder}>
                                            <Puzzle size={24} />
                                        </div>
                                        <div className={styles.addonInfo}>
                                            <div className={styles.addonName}>{extension.metadata?.name || extension.name}</div>
                                            <div className={styles.addonAuthor}>
                                                {extension.metadata?.author ? t('extensions.author', { author: extension.metadata.author }) : ''}
                                                {extension.metadata?.version ? ` • v${extension.metadata.version}` : ''}
                                            </div>
                                            <div className={styles.addonDesc} style={{fontSize: '0.85em', opacity: 0.7}}>
                                                {extension.metadata?.description}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className={styles.addonActions}>
                                        <button className={styles.viewBtnSmall} onClick={(e) => {
                                            e.stopPropagation();
                                            openDetails(extension);
                                        }}>
                                            <Info size={14} /> {t('addons.details')}
                                        </button>
                                        
                                        <button 
                                            className={styles.viewBtnSmall}
                                            style={{ color: extension.enabled ? '#4ade80' : '#888' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleExtension(extension.name, !extension.enabled);
                                            }}
                                            title={extension.enabled ? "Disable Extension" : "Enable Extension"}
                                        >
                                            {extension.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                            <span style={{marginLeft: '5px'}}>{extension.enabled ? 'On' : 'Off'}</span>
                                        </button>

                                        <button className={styles.deleteBtnSmall} onClick={(e) => {
                                            e.stopPropagation();
                                            handleUninstall(extension.name);
                                        }}>
                                            <Trash2 size={14} /> {t('extensions.uninstall')}
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className={styles.emptyState}>{t('extensions.no_extensions_installed')}</div>
                        )
                    ) : (
                        filteredBrowse.length > 0 ? (
                            <>
                                <div className={styles.sectionHeader}>
                                    <div className={styles.sectionTitle}>Official Extensions</div>
                                    <div className={styles.sectionSubtitle}>Developed and maintained by Relictum.</div>
                                </div>
                                {officialBrowse.length > 0 ? (
                                    officialBrowse.map((extension, idx) => (
                                        <div key={`off-${idx}`} className={styles.addonRow} onClick={() => openDetails(extension)}>
                                            <div className={styles.addonHeader}>
                                                <div className={styles.addonIconPlaceholder}>
                                                    <Puzzle size={24} />
                                                </div>
                                                <div className={styles.addonInfo}>
                                                    <div className={styles.addonName}>
                                                        {extension.name}
                                                        <span className={styles.versionBadge} style={{ marginLeft: 8, background: '#22c55e', color: '#0b130c' }}>OFFICIAL</span>
                                                    </div>
                                                    <div className={styles.addonAuthor}>{t('extensions.author', { author: extension.author })} • v{extension.version}</div>
                                                    <div className={styles.addonDesc} style={{fontSize: '0.85em', opacity: 0.7}}>{extension.description}</div>
                                                </div>
                                            </div>
                                            <div className={styles.addonActions}>
                                                <button className={styles.viewBtnSmall} onClick={(e) => { e.stopPropagation(); openDetails(extension); }}>
                                                    <Info size={14} /> {t('addons.details')}
                                                </button>
                                                {isInstalled(extension.id || extension.name) ? (
                                                    <button className={`${styles.installBtnSmall} ${styles.installed}`} disabled>
                                                        <Check size={14} /> {t('addons.already_installed')}
                                                    </button>
                                                ) : (
                                                    <button className={styles.installBtnSmall} onClick={(e) => { e.stopPropagation(); handleInstall(extension); }} disabled={installing === (extension.id || extension.name)}>
                                                        {installing === (extension.id || extension.name) ? (<><Loader2 size={14} className={styles.spin} />{t('extensions.installing')}</>) : (<><Download size={14} />{t('extensions.install')}</>)}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.emptyState} style={{marginBottom: '16px'}}>No official extensions yet.</div>
                                )}

                                <div className={styles.sectionHeader}>
                                    <div className={styles.sectionTitle}>Community Extensions</div>
                                    <div className={styles.sectionSubtitle}>User-made extensions. Use at your own risk.</div>
                                </div>
                                {communityBrowse.length > 0 ? (
                                    communityBrowse.map((extension, idx) => (
                                        <div key={`com-${idx}`} className={styles.addonRow} onClick={() => openDetails(extension)}>
                                            <div className={styles.addonHeader}>
                                                <div className={styles.addonIconPlaceholder}>
                                                    <Puzzle size={24} />
                                                </div>
                                                <div className={styles.addonInfo}>
                                                    <div className={styles.addonName}>
                                                        {extension.name}
                                                        <span className={styles.versionBadge} style={{ marginLeft: 8, background: '#f59e0b', color: '#1a1200' }}>COMMUNITY</span>
                                                    </div>
                                                    <div className={styles.addonAuthor}>{t('extensions.author', { author: extension.author })} • v{extension.version}</div>
                                                    <div className={styles.addonDesc} style={{fontSize: '0.85em', opacity: 0.7}}>{extension.description}</div>
                                                </div>
                                            </div>
                                            <div className={styles.addonActions}>
                                                <button className={styles.viewBtnSmall} onClick={(e) => { e.stopPropagation(); openDetails(extension); }}>
                                                    <Info size={14} /> {t('addons.details')}
                                                </button>
                                                {isInstalled(extension.id || extension.name) ? (
                                                    <button className={`${styles.installBtnSmall} ${styles.installed}`} disabled>
                                                        <Check size={14} /> {t('addons.already_installed')}
                                                    </button>
                                                ) : (
                                                    <button className={styles.installBtnSmall} onClick={(e) => { e.stopPropagation(); handleInstall(extension); }} disabled={installing === (extension.id || extension.name)}>
                                                        {installing === (extension.id || extension.name) ? (<><Loader2 size={14} className={styles.spin} />{t('extensions.installing')}</>) : (<><Download size={14} />{t('extensions.install')}</>)}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.emptyState}>Community is empty for now.</div>
                                )}
                            </>
                        ) : (
                            <div className={styles.emptyState}>
                                {t('extensions.no_extensions_available')}
                                {fetchLog.length > 0 && (
                                    <div style={{marginTop: '10px', fontSize: '0.8em', opacity: 0.8}}>
                                        {fetchLog.slice(-8).map((l, i) => (
                                            <div key={i}>{new Date(l.ts).toLocaleTimeString()} — {l.m}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Extension Details Modal */}
            {selectedExtension && (
                <div className={styles.addonModalOverlay} onClick={closeDetails}>
                    <div className={styles.addonModal} onClick={e => e.stopPropagation()}>
                        <div className={styles.addonModalHeader}>
                            <div className={styles.addonModalTitle}>
                                <h3>
                                    {selectedExtension.metadata?.name || selectedExtension.name}
                                    <span className={styles.versionBadge} style={{
                                        fontSize: '12px',
                                        padding: '4px 8px',
                                        marginLeft: '10px',
                                        fontWeight: 'normal',
                                        verticalAlign: 'middle'
                                    }}>
                                        v{selectedExtension.metadata?.version || selectedExtension.version}
                                    </span>
                                </h3>
                                <span className={styles.addonAuthor}>
                                    {t('extensions.author', { author: selectedExtension.metadata?.author || selectedExtension.author })}
                                </span>
                            </div>
                            <button className={styles.addonModalClose} onClick={closeDetails}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.addonModalContent}>
                            <div className={styles.addonModalDesc}>
                                {selectedExtension.metadata?.description || selectedExtension.description}
                            </div>
                            {previewUrl && (
                                <div style={{
                                    width: '100%',
                                    aspectRatio: '16/9',
                                    maxHeight: '360px',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    marginTop: '16px',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    background: '#0f1114'
                                }}>
                                    <img 
                                        src={previewUrl}
                                        alt={(selectedExtension.metadata?.name || selectedExtension.name) + ' preview'}
                                        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
                                        onError={handlePreviewError}
                                    />
                                </div>
                            )}
                            
                            {/* If we had more info like changelogs or screenshots, it would go here */}
                            
                            <div className={styles.addonModalActions} style={{marginTop: '20px', display: 'flex', justifyContent: 'flex-end'}}>
                                {isInstalled(selectedExtension.id || selectedExtension.name) ? (
                                    activeTab === 'installed' ? (
                                        <>
                                            <button 
                                                className={styles.viewBtnSmall}
                                                style={{ color: (selectedExtension.enabled ?? true) ? '#4ade80' : '#888', marginRight: '10px', padding: '10px 20px' }}
                                                onClick={() => {
                                                    toggleExtension(selectedExtension.name, !selectedExtension.enabled);
                                                    // Update the selected extension state to reflect the change immediately in the modal
                                                    setSelectedExtension({
                                                        ...selectedExtension,
                                                        enabled: !selectedExtension.enabled
                                                    });
                                                }}
                                            >
                                                {(selectedExtension.enabled ?? true) ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                                <span style={{marginLeft: '5px'}}>{(selectedExtension.enabled ?? true) ? 'On' : 'Off'}</span>
                                            </button>
                                            <button className={styles.deleteBtnSmall} style={{padding: '10px 20px'}} onClick={() => {
                                                handleUninstall(selectedExtension.name);
                                                closeDetails();
                                            }}>
                                                <Trash2 size={14} /> {t('extensions.uninstall')}
                                            </button>
                                        </>
                                    ) : (
                                        <button className={`${styles.installBtnSmall} ${styles.installed}`} disabled style={{padding: '10px 20px'}}>
                                            <Check size={14} /> {t('addons.already_installed')}
                                        </button>
                                    )
                                ) : (
                                    <button 
                                        className={styles.installBtnSmall}
                                        style={{padding: '10px 20px'}}
                                        onClick={() => {
                                            handleInstall(selectedExtension);
                                            // closeDetails();
                                        }}
                                        disabled={installing === (selectedExtension.id || selectedExtension.name)}
                                    >
                                        {installing === (selectedExtension.id || selectedExtension.name) ? (
                                            <>
                                                <Loader2 size={14} className={styles.spin} />
                                                {t('extensions.installing')}
                                            </>
                                        ) : (
                                            <>
                                                <Download size={14} />
                                                {t('extensions.install')}
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Delete Confirmation Modal */}
            {extensionToDelete && (
                <div className={styles.addonModalOverlay} onClick={() => setExtensionToDelete(null)}>
                    <div className={styles.addonModal} style={{maxWidth: '400px', height: 'auto'}} onClick={e => e.stopPropagation()}>
                        <div className={styles.addonModalHeader}>
                            <div className={styles.addonModalTitle}>
                                <h3>{t('extensions.uninstall')}</h3>
                            </div>
                            <button className={styles.addonModalClose} onClick={() => setExtensionToDelete(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.addonModalContent}>
                            <p style={{color: '#ccc', marginBottom: '20px'}}>
                                {t('extensions.confirm_uninstall', { name: extensionToDelete.metadata?.name || extensionToDelete.name })}
                            </p>
                            <div className={styles.addonModalActions} style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '0'}}>
                                <button 
                                    className={styles.viewBtnSmall} 
                                    onClick={() => setExtensionToDelete(null)}
                                    style={{padding: '8px 16px', border: '1px solid #333'}}
                                >
                                    {t('cancel')}
                                </button>
                                <button 
                                    className={styles.deleteBtnSmall} 
                                    onClick={confirmUninstall}
                                    style={{padding: '8px 16px'}}
                                >
                                    {t('extensions.uninstall')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExtensionsView;
