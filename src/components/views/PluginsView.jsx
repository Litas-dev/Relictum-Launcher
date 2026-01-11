import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Search, Puzzle, Download, Check, Loader2, Info, X, ChevronDown, ToggleLeft, ToggleRight } from 'lucide-react';
import ipcRenderer from '../../utils/ipc';
import PluginStore from '../../utils/PluginStore';
import PluginLoader from '../../utils/PluginLoader';
import styles from '../AddonsView.module.css';

const PluginsView = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('installed');
    const [installedPlugins, setInstalledPlugins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [installing, setInstalling] = useState(null);
    const [search, setSearch] = useState('');
    const [selectedPlugin, setSelectedPlugin] = useState(null);
    const [sort, setSort] = useState('popular');
    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
    const [availablePlugins, setAvailablePlugins] = useState([]);
    const [pluginToDelete, setPluginToDelete] = useState(null);

    const sortOptions = [
        { value: 'popular', label: t('addons.sort_popular') || 'Most Popular' },
        { value: 'newest', label: t('addons.sort_recent') || 'Recently Added' },
        { value: 'az', label: t('addons.sort_az') || 'Name (A-Z)' }
    ];

    const currentSortLabel = sortOptions.find(o => o.value === sort)?.label || sortOptions[0].label;

    // Remote Fetch
    const fetchRemotePlugins = async () => {
        try {
            // TODO: Update this URL to your actual trusted repository's plugins.json
            const response = await fetch('https://raw.githubusercontent.com/Litas-dev/Plugins/main/main/plugins.json');
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    return data;
                }
            }
        } catch (e) {
            console.warn("Failed to fetch remote plugins:", e);
        }

        // Return empty array if fetch fails - ensuring ONLY trusted repo plugins are shown
        return [];
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Load installed
                setInstalledPlugins([...PluginStore.getPlugins()]);
                
                // Load available
                const remote = await fetchRemotePlugins();
                setAvailablePlugins(remote);
            } catch (e) {
                console.error("Failed to load plugins:", e);
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
        
        const updateInstalled = () => {
            setInstalledPlugins([...PluginStore.getPlugins()]);
        };
        
        // Subscribe to store changes
        const unsubscribe = PluginStore.subscribe(updateInstalled);
        return unsubscribe;
    }, []);

    const handleInstall = async (plugin) => {
        const installId = plugin.id || plugin.name;
        setInstalling(installId);
        try {
            // New signature: { url: manifestUrl, id: folderName }
            const result = await ipcRenderer.invoke('install-remote-plugin', {
                url: plugin.url,
                id: installId
            });
            
            if (result.success) {
                // Reload plugins from disk to get the full plugin object (including script)
                await PluginLoader.reload();
                // The store subscription will automatically update the UI
            } else {
                console.error("Install failed:", result.error);
            }
        } catch (e) {
            console.error("Install error:", e);
        } finally {
            setInstalling(null);
        }
    };

    const handleUninstall = (pluginName) => {
        // Find plugin object or create a temporary one for the modal
        const plugin = installedPlugins.find(p => p.name === pluginName) || { name: pluginName };
        setPluginToDelete(plugin);
    };

    const confirmUninstall = async () => {
        if (!pluginToDelete) return;
        
        try {
            const result = await ipcRenderer.invoke('uninstall-plugin', pluginToDelete.name);
            
            if (result.success) {
                // Fully reload plugins from disk to ensure state is synced
                await PluginLoader.reload();
                // setInstalledPlugins will be updated by the store subscription
            } else {
                console.error("Uninstall failed:", result.error);
            }
        } catch (e) {
            console.error("Uninstall error:", e);
        } finally {
            setPluginToDelete(null);
        }
    };
    
    const isInstalled = (id) => {
        return installedPlugins.some(p => 
            p.name === id || 
            (p.metadata && p.metadata.id === id) ||
            (id && p.name === id.split(/[/\\]/).pop())
        );
    };

    const openDetails = (plugin) => {
        setSelectedPlugin(plugin);
    };

    const closeDetails = () => {
        setSelectedPlugin(null);
    };

    const togglePlugin = async (name, enabled) => {
        await PluginLoader.togglePlugin(name, enabled);
        // The loader reload will trigger store update which updates UI
    };

    const getSortedPlugins = (list) => {
        let sorted = [...list];
        switch (sort) {
            case 'newest':
                sorted.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
                break;
            case 'az':
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'popular':
            default:
                sorted.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
                break;
        }
        return sorted;
    };

    const filteredBrowse = getSortedPlugins(availablePlugins.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        p.description.toLowerCase().includes(search.toLowerCase())
    ));

    const filteredInstalled = installedPlugins.filter(p => 
        (p.metadata?.name || p.name).toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className={styles.addonsView}>
             <div className={styles.viewHeader}>
                <h2>{t('plugins.title') || 'Plugins Manager'}</h2>
                <div className={styles.addonTabs}>
                    <button 
                        className={`${styles.tabBtn} ${activeTab === 'installed' ? styles.active : ''}`} 
                        onClick={() => setActiveTab('installed')}
                    >
                        {t('plugins.tabs.installed')}
                    </button>
                    <button 
                        className={`${styles.tabBtn} ${activeTab === 'browse' ? styles.active : ''}`} 
                        onClick={() => setActiveTab('browse')}
                    >
                        {t('plugins.tabs.browse')}
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
                    
                    {activeTab === 'browse' && (
                        <div className={styles.sortDropdownContainer}>
                            <div 
                                className={styles.sortDropdownTrigger}
                                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                            >
                                <div className={styles.sortDropdownLabel}>
                                    {currentSortLabel}
                                </div>
                                <ChevronDown size={16} style={{transform: isSortDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s'}} />
                            </div>
                            
                            {isSortDropdownOpen && (
                                <div className={styles.sortDropdownMenu}>
                                    {sortOptions.map((option) => (
                                        <div 
                                            key={option.value}
                                            className={`${styles.sortOption} ${sort === option.value ? styles.selected : ''}`}
                                            onClick={() => {
                                                setSort(option.value);
                                                setIsSortDropdownOpen(false);
                                            }}
                                        >
                                            {option.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className={styles.addonsListContainer}>
                    {loading ? (
                        <div className={styles.loadingState}>{t('addons.loading')}</div>
                    ) : activeTab === 'installed' ? (
                        filteredInstalled.length > 0 ? (
                            filteredInstalled.map((plugin, idx) => (
                                <div key={idx} className={styles.addonRow} onClick={() => openDetails(plugin)}>
                                    <div className={styles.addonHeader}>
                                        <div className={styles.addonIconPlaceholder}>
                                            <Puzzle size={24} />
                                        </div>
                                        <div className={styles.addonInfo}>
                                            <div className={styles.addonName}>{plugin.metadata?.name || plugin.name}</div>
                                            <div className={styles.addonAuthor}>
                                                {plugin.metadata?.author ? t('plugins.author', { author: plugin.metadata.author }) : ''}
                                                {plugin.metadata?.version ? ` • v${plugin.metadata.version}` : ''}
                                            </div>
                                            <div className={styles.addonDesc} style={{fontSize: '0.85em', opacity: 0.7}}>
                                                {plugin.metadata?.description}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className={styles.addonActions}>
                                        <button className={styles.viewBtnSmall} onClick={(e) => {
                                            e.stopPropagation();
                                            openDetails(plugin);
                                        }}>
                                            <Info size={14} /> {t('addons.details')}
                                        </button>
                                        
                                        <button 
                                            className={styles.viewBtnSmall}
                                            style={{ color: plugin.enabled ? '#4ade80' : '#888' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                togglePlugin(plugin.name, !plugin.enabled);
                                            }}
                                            title={plugin.enabled ? "Disable Plugin" : "Enable Plugin"}
                                        >
                                            {plugin.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                            <span style={{marginLeft: '5px'}}>{plugin.enabled ? 'On' : 'Off'}</span>
                                        </button>

                                        <button className={styles.deleteBtnSmall} onClick={(e) => {
                                            e.stopPropagation();
                                            handleUninstall(plugin.name);
                                        }}>
                                            <Trash2 size={14} /> {t('plugins.uninstall')}
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className={styles.emptyState}>{t('plugins.no_plugins_installed')}</div>
                        )
                    ) : (
                        // Browse Tab
                        filteredBrowse.length > 0 ? (
                            filteredBrowse.map((plugin, idx) => (
                                <div key={idx} className={styles.addonRow} onClick={() => openDetails(plugin)}>
                                    <div className={styles.addonHeader}>
                                        <div className={styles.addonIconPlaceholder}>
                                            <Puzzle size={24} />
                                        </div>
                                        <div className={styles.addonInfo}>
                                            <div className={styles.addonName}>{plugin.name}</div>
                                            <div className={styles.addonAuthor}>
                                                {t('plugins.author', { author: plugin.author })} • v{plugin.version}
                                            </div>
                                            <div className={styles.addonDesc} style={{fontSize: '0.85em', opacity: 0.7}}>
                                                {plugin.description}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className={styles.addonActions}>
                                        <button className={styles.viewBtnSmall} onClick={(e) => {
                                            e.stopPropagation();
                                            openDetails(plugin);
                                        }}>
                                            <Info size={14} /> {t('addons.details')}
                                        </button>
                                        {isInstalled(plugin.id || plugin.name) ? (
                                            <button className={`${styles.installBtnSmall} ${styles.installed}`} disabled>
                                                <Check size={14} /> {t('addons.already_installed')}
                                            </button>
                                        ) : (
                                            <button 
                                                className={styles.installBtnSmall}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleInstall(plugin);
                                                }}
                                                disabled={installing === (plugin.id || plugin.name)}
                                            >
                                                {installing === (plugin.id || plugin.name) ? (
                                                    <>
                                                        <Loader2 size={14} className={styles.spin} />
                                                        {t('plugins.installing')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download size={14} />
                                                        {t('plugins.install')}
                                                    </>
                                                )} 
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                             <div className={styles.emptyState}>{t('plugins.no_plugins_available')}</div>
                        )
                    )}
                </div>
            </div>

            {/* Plugin Details Modal */}
            {selectedPlugin && (
                <div className={styles.addonModalOverlay} onClick={closeDetails}>
                    <div className={styles.addonModal} onClick={e => e.stopPropagation()}>
                        <div className={styles.addonModalHeader}>
                            <div className={styles.addonModalTitle}>
                                <h3>
                                    {selectedPlugin.metadata?.name || selectedPlugin.name}
                                    <span className={styles.versionBadge} style={{
                                        fontSize: '12px',
                                        padding: '4px 8px',
                                        marginLeft: '10px',
                                        fontWeight: 'normal',
                                        verticalAlign: 'middle'
                                    }}>
                                        v{selectedPlugin.metadata?.version || selectedPlugin.version}
                                    </span>
                                </h3>
                                <span className={styles.addonAuthor}>
                                    {t('plugins.author', { author: selectedPlugin.metadata?.author || selectedPlugin.author })}
                                </span>
                            </div>
                            <button className={styles.addonModalClose} onClick={closeDetails}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.addonModalContent}>
                            <div className={styles.addonModalDesc}>
                                {selectedPlugin.metadata?.description || selectedPlugin.description}
                            </div>
                            
                            {/* If we had more info like changelogs or screenshots, it would go here */}
                            
                            <div className={styles.addonModalActions} style={{marginTop: '20px', display: 'flex', justifyContent: 'flex-end'}}>
                                {isInstalled(selectedPlugin.id || selectedPlugin.name) ? (
                                    activeTab === 'installed' ? (
                                        <>
                                            <button 
                                                className={styles.viewBtnSmall}
                                                style={{ color: (selectedPlugin.enabled ?? true) ? '#4ade80' : '#888', marginRight: '10px', padding: '10px 20px' }}
                                                onClick={() => {
                                                    togglePlugin(selectedPlugin.name, !selectedPlugin.enabled);
                                                    // Update the selected plugin state to reflect the change immediately in the modal
                                                    setSelectedPlugin({
                                                        ...selectedPlugin,
                                                        enabled: !selectedPlugin.enabled
                                                    });
                                                }}
                                            >
                                                {(selectedPlugin.enabled ?? true) ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                                <span style={{marginLeft: '5px'}}>{(selectedPlugin.enabled ?? true) ? 'On' : 'Off'}</span>
                                            </button>
                                            <button className={styles.deleteBtnSmall} style={{padding: '10px 20px'}} onClick={() => {
                                                handleUninstall(selectedPlugin.name);
                                                closeDetails();
                                            }}>
                                                <Trash2 size={14} /> {t('plugins.uninstall')}
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
                                            handleInstall(selectedPlugin);
                                            // closeDetails();
                                        }}
                                        disabled={installing === (selectedPlugin.id || selectedPlugin.name)}
                                    >
                                        {installing === (selectedPlugin.id || selectedPlugin.name) ? (
                                            <>
                                                <Loader2 size={14} className={styles.spin} />
                                                {t('plugins.installing')}
                                            </>
                                        ) : (
                                            <>
                                                <Download size={14} />
                                                {t('plugins.install')}
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
            {pluginToDelete && (
                <div className={styles.addonModalOverlay} onClick={() => setPluginToDelete(null)}>
                    <div className={styles.addonModal} style={{maxWidth: '400px', height: 'auto'}} onClick={e => e.stopPropagation()}>
                        <div className={styles.addonModalHeader}>
                            <div className={styles.addonModalTitle}>
                                <h3>{t('plugins.uninstall')}</h3>
                            </div>
                            <button className={styles.addonModalClose} onClick={() => setPluginToDelete(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.addonModalContent}>
                            <p style={{color: '#ccc', marginBottom: '20px'}}>
                                Are you sure you want to remove this plugin?
                                <br/>
                                <strong style={{color: '#fff', display: 'block', marginTop: '10px'}}>{pluginToDelete.metadata?.name || pluginToDelete.name}</strong>
                            </p>
                            <div className={styles.addonModalActions} style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '0'}}>
                                <button 
                                    className={styles.viewBtnSmall} 
                                    onClick={() => setPluginToDelete(null)}
                                    style={{padding: '8px 16px', border: '1px solid #333'}}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className={styles.deleteBtnSmall} 
                                    onClick={confirmUninstall}
                                    style={{padding: '8px 16px'}}
                                >
                                    Uninstall
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PluginsView;
