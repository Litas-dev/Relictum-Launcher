import { useState, useEffect } from 'react';
import ipcRenderer from '../utils/ipc';
import localAddons from '../assets/addons.json';
import { groupAddons, processAddonsForDisplay } from '../utils/addonUtils';

export const useAddons = ({ 
    activeView, 
    activeGame,
    activeGameId, 
    gamePaths, 
    selectedDownloadIndex,
    showModal,
    closeModal 
}) => {
    const [addonsList, setAddonsList] = useState([]);
    const [allWarperiaAddons, setAllWarperiaAddons] = useState([]);
    const [browseAddonsList, setBrowseAddonsList] = useState(localAddons.slice(0, 50));
    const [activeAddonTab, setActiveAddonTab] = useState('installed');
    const [installingAddon, setInstallingAddon] = useState(null);
    const [loadingAddons, setLoadingAddons] = useState(false);
    
    // State for filter and sort controls
    const [addonSearch, setAddonSearch] = useState('');
    const [addonSort, setAddonSort] = useState('popular');
    const [addonPage, setAddonPage] = useState(1);
    const [filteredAddonCount, setFilteredAddonCount] = useState(localAddons.length);
    const itemsPerPage = 10;

    useEffect(() => {
        if (activeView === 'addons' && activeAddonTab === 'installed') {
            const path = gamePaths[activeGameId];
            if (!path) {
                setAddonsList([]);
                return;
            }
            const fetchInstalled = async () => {
                try {
                    const raw = await ipcRenderer.invoke('get-addons', path);
                    const grouped = groupAddons(raw || []);
                    const display = processAddonsForDisplay(grouped);
                    setAddonsList(display);
                } catch (e) {
                    setAddonsList([]);
                }
            };
            fetchInstalled();
        }
    }, [activeView, activeAddonTab, activeGameId, gamePaths]);

    // Effect: Fetch available addons from remote source
    useEffect(() => {
        if (activeView === 'addons' && activeGame) {
            const selectedVersion = activeGame.downloads && activeGame.downloads[selectedDownloadIndex] 
                ? activeGame.downloads[selectedDownloadIndex].version 
                : activeGame.version;

            const fetchWarperia = async () => {
                setLoadingAddons(true);
                
                // Filter local addons based on the active expansion
                let expansionKey = null;
                let targetVersion = activeGame.version;

                // Determine expansion from ID or Version
                if (activeGameId === 'wotlk' || targetVersion === '3.3.5') {
                    expansionKey = 'wotlk';
                    targetVersion = '3.3.5';
                } else if (activeGameId === 'tbc' || targetVersion === '2.4.3') {
                    expansionKey = 'tbc';
                    targetVersion = '2.4.3';
                } else if (activeGameId === 'vanilla' || targetVersion === '1.12.1') {
                    expansionKey = 'classic';
                    targetVersion = '1.12.1';
                } else if (targetVersion === '4.3.4') {
                     expansionKey = 'cata';
                } else if (targetVersion === '5.4.8') {
                     expansionKey = 'mop';
                }

                const localForExpansion = localAddons
                    .filter(a => a.downloads && a.downloads[expansionKey])
                    .map(a => ({
                        ...a,
                        downloadUrl: a.downloads[expansionKey], // Override with expansion specific link
                        gameVersion: targetVersion
                    }));

                // Use local data as primary source now (since we have full database)
                setAllWarperiaAddons(localForExpansion);
                setLoadingAddons(false);
                
                // We disable the remote fetch for now as we are transitioning to local/GitHub mirror
                /*
                try {
                    // Optimistic update: Show local cache while fetching remote data
                    if (activeGameId === 'wotlk' && allWarperiaAddons.length === 0) {
                        setAllWarperiaAddons(wotlkLocal);
                    }
                    
                    const addons = await ipcRenderer.invoke('fetch-warperia-addons', activeGameId);
                    if (addons && addons.length > 0) {
                        setAllWarperiaAddons(addons);
                    } else if (activeGameId === 'wotlk') {
                        setAllWarperiaAddons(wotlkLocal);
                    } else {
                        setAllWarperiaAddons([]);
                    }
                } catch (error) {
                    console.error("Error fetching Warperia addons:", error);
                    if (activeGameId === 'wotlk') {
                        setAllWarperiaAddons(wotlkLocal);
                    } else {
                        setAllWarperiaAddons([]);
                    }
                } finally {
                    setLoadingAddons(false);
                }
                */
            };
            
            fetchWarperia();
        }
    }, [activeView, activeGameId, selectedDownloadIndex, activeGame]);

    // Effect: Filter and sort browse list
    useEffect(() => {
        if (activeView === 'addons' && activeAddonTab === 'browse') {
            const wotlkLocal = localAddons.map(a => ({ ...a, gameVersion: '3.3.5' }));
            const source = allWarperiaAddons.length > 0 ? allWarperiaAddons : (activeGameId === 'wotlk' ? wotlkLocal : []);
            
            let filtered = source.filter(addon => 
                addon.title.toLowerCase().includes(addonSearch.toLowerCase()) || 
                addon.description.toLowerCase().includes(addonSearch.toLowerCase())
            );
            
            // Sorting Logic
            if (addonSort === 'a-z') {
                filtered.sort((a, b) => a.title.localeCompare(b.title));
            } else if (addonSort === 'z-a') {
                filtered.sort((a, b) => b.title.localeCompare(a.title));
            } else if (addonSort === 'newest') {
                filtered.sort((a, b) => {
                    const dateA = a.uploadDate ? new Date(a.uploadDate).getTime() : 0;
                    const dateB = b.uploadDate ? new Date(b.uploadDate).getTime() : 0;
                    return dateB - dateA;
                });
            } else if (addonSort === 'updated') {
                filtered.sort((a, b) => {
                    const dateA = a.lastUpdate ? new Date(a.lastUpdate).getTime() : 0;
                    const dateB = b.lastUpdate ? new Date(b.lastUpdate).getTime() : 0;
                    return dateB - dateA;
                });
            } else if (addonSort === 'popular') {
                filtered.sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0));
            }
            
            setFilteredAddonCount(filtered.length);
            
            const start = (addonPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            setBrowseAddonsList(filtered.slice(start, end));
        }
    }, [activeView, activeAddonTab, addonSearch, addonSort, addonPage, allWarperiaAddons, activeGameId]);

    const handleInstallWarperiaAddon = async (addon) => {
        if (installingAddon) return;
        
        const path = gamePaths[activeGameId];
        if (!path) {
            showModal('Missing Game Path', "Please locate your World of Warcraft game folder first using the 'Locate Installed Game' button.", <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
            return;
        }

        setInstallingAddon(addon.title);
        
        // Determine expansion for installation logic
        let installExpansion = activeGameId;
        const targetVersion = activeGame ? activeGame.version : null;

        if (activeGameId === 'wotlk' || targetVersion === '3.3.5') {
            installExpansion = 'wotlk';
        } else if (activeGameId === 'tbc' || targetVersion === '2.4.3') {
            installExpansion = 'tbc';
        } else if (activeGameId === 'vanilla' || targetVersion === '1.12.1') {
            installExpansion = 'classic';
        } else if (targetVersion === '4.3.4') {
             installExpansion = 'cata';
        } else if (targetVersion === '5.4.8') {
             installExpansion = 'mop';
        }
        
        try {
            const promise = ipcRenderer.invoke('install-warperia-addon', { 
                gamePath: path, 
                detailUrl: addon.detailUrl,
                downloadUrl: addon.downloadUrl,
                expansion: installExpansion
            });
            
            const timeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Installation timed out. Please check your internet connection.")), 60000)
            );

            const result = await Promise.race([promise, timeout]);
            
            if (result.success) {
                showModal('Success', `Successfully installed ${addon.title}!`, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
                // Refresh installed list
                const raw = await ipcRenderer.invoke('get-addons', path);
                const grouped = groupAddons(raw || []);
                const display = processAddonsForDisplay(grouped);
                setAddonsList(display);
            } else {
                showModal('Installation Failed', `Failed to install ${addon.title}: ${result.message}`, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
            }
        } catch (error) {
            showModal('Error', `Error installing ${addon.title}: ${error.message}`, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
        } finally {
            setInstallingAddon(null);
        }
    };

    const handleDeleteAddon = async (foldersToDelete) => {
        const path = gamePaths[activeGameId];
        if (!path) return;

        try {
            const result = await ipcRenderer.invoke('delete-addon', {
                gamePath: path,
                addonNames: foldersToDelete
            });

            if (result.success) {
                // Refresh installed list
                const raw = await ipcRenderer.invoke('get-addons', path);
                const grouped = groupAddons(raw || []);
                const display = processAddonsForDisplay(grouped);
                setAddonsList(display);
                showModal('Success', 'Addon uninstalled successfully!', <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
            } else {
                showModal('Error', `Failed to uninstall addon: ${result.message}`, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
            }
        } catch (error) {
            showModal('Error', `Error uninstalling addon: ${error.message}`, <button className="modal-btn-primary" onClick={closeModal}>OK</button>);
        }
    };

    return {
        addonsList,
        setAddonsList,
        browseAddonsList,
        activeAddonTab,
        setActiveAddonTab,
        installingAddon,
        loadingAddons,
        addonSearch,
        setAddonSearch,
        addonSort,
        setAddonSort,
        addonPage,
        setAddonPage,
        filteredAddonCount,
        handleInstallWarperiaAddon,
        handleDeleteAddon,
        itemsPerPage
    };
};
