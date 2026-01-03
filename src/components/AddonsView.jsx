import React, { useState } from 'react';
import { Plus, Puzzle, Search, Trash2, X, Info, Download, Check, Loader2 } from 'lucide-react';

const AddonsView = ({
    activeGame,
    activeAddonTab,
    setActiveAddonTab,
    groupedAddons = [],
    loadingAddons,
    addonSearch,
    setAddonSearch,
    addonSort,
    setAddonSort,
    browseAddonsList = [],
    installingAddon,
    handleInstallAddon,
    handleInstallWarperiaAddon,
    handleDeleteAddon,
    selectedVersion,
    gameInstalled = false
}) => {
    const [selectedAddon, setSelectedAddon] = useState(null);

    if (!activeGame) return <div className="addons-view">Error: Game data not found.</div>;

    const openDetails = (addon) => {
        setSelectedAddon(addon);
    };

    const closeDetails = () => {
        setSelectedAddon(null);
    };

    const isAddonInstalled = (browseAddon) => {
        if (!groupedAddons || groupedAddons.length === 0) return false;
        return groupedAddons.some(installed => 
            installed.title.toLowerCase() === browseAddon.title.toLowerCase() ||
            (installed.detailUrl && installed.detailUrl === browseAddon.detailUrl)
        );
    };

    return (
        <div className="addons-view">
            <div className="view-header">
                <h2>Addons Manager - {activeGame.shortName}</h2>
                {gameInstalled && (
                    <div className="addon-tabs">
                        <button 
                            className={`tab-btn ${activeAddonTab === 'installed' ? 'active' : ''}`} 
                            onClick={() => setActiveAddonTab('installed')}
                        >
                            Installed
                        </button>
                        <button 
                            className={`tab-btn ${activeAddonTab === 'browse' ? 'active' : ''}`} 
                            onClick={() => setActiveAddonTab('browse')}
                        >
                            Browse
                        </button>
                    </div>
                )}
            </div>

            {!gameInstalled ? (
                <div className="empty-state-container" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'var(--text-secondary)',
                    gap: '20px',
                    paddingBottom: '60px'
                }}>
                    <div style={{
                        background: 'rgba(251, 113, 133, 0.1)',
                        padding: '20px',
                        borderRadius: '50%',
                        border: '1px solid rgba(251, 113, 133, 0.2)'
                    }}>
                        <Info size={48} color="#fb7185" />
                    </div>
                    <div style={{textAlign: 'center'}}>
                        <h3 style={{color: '#fff', marginBottom: '10px', fontSize: '18px'}}>Client Not Found</h3>
                        <p style={{maxWidth: '400px', margin: '0 auto', lineHeight: '1.5'}}>
                            Please install or locate the <span style={{color: 'var(--primary-gold)'}}>{activeGame.name}</span> client to view and manage addons.
                        </p>
                    </div>
                </div>
            ) : activeAddonTab === 'installed' ? (
                <div className="addons-content">
                    <div className="addons-toolbar">
                        <button 
                            className="primary-btn" 
                            onClick={handleInstallAddon}
                            disabled={!gameInstalled}
                            style={{opacity: !gameInstalled ? 0.5 : 1, cursor: !gameInstalled ? 'not-allowed' : 'pointer'}}
                        >
                            <Plus size={16} /> Install from ZIP
                        </button>
                        <span className="addon-count">{(groupedAddons || []).length} Addons</span>
                    </div>
                    <div className="addons-list-container">
                        {loadingAddons ? (
                            <div className="loading-state">Loading addons...</div>
                        ) : (groupedAddons || []).length > 0 ? (
                            (groupedAddons || []).map((addon, idx) => (
                                <div key={idx} className="addon-row" onClick={() => openDetails(addon)}>
                                    <div className="addon-header">
                                        {addon.image ? (
                                            <img src={addon.image} alt={addon.title} className="addon-icon" />
                                        ) : (
                                            <div className="addon-icon-placeholder">
                                                <Puzzle size={24} />
                                            </div>
                                        )}
                                        <div className="addon-info">
                                            <div className="addon-name">{addon.title}</div>
                                            {addon.author ? (
                                                 <div className="addon-author">by {addon.author}</div>
                                            ) : (
                                                 <div className="addon-status">Installed</div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {addon.modules && addon.modules.length > 0 && (
                                        <div className="addon-modules-badge">
                                            + {addon.modules.length} modules
                                        </div>
                                    )}
                                    
                                    <div className="addon-actions">
                                        <button className="view-btn-small" onClick={(e) => {
                                            e.stopPropagation();
                                            openDetails(addon);
                                        }}>
                                            <Info size={14} /> Details
                                        </button>
                                        <button className="delete-btn-small" onClick={(e) => {
                                            e.stopPropagation();
                                            const toDelete = [addon.folderName, ...(addon.modules || []).map(m => m.folderName)];
                                            handleDeleteAddon(toDelete);
                                        }}>
                                            Uninstall
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">No addons found.</div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="addons-content">
                     <div className="addons-toolbar">
                        <div className="search-input-wrapper" style={{flex: 1}}>
                            <Search size={16} className="search-icon" />
                            <input 
                                type="text" 
                                className="search-input"
                                placeholder="Search addons..." 
                                value={addonSearch}
                                onChange={(e) => setAddonSearch(e.target.value)}
                            />
                        </div>
                        <select 
                            className="sort-select"
                            value={addonSort}
                            onChange={(e) => setAddonSort(e.target.value)}
                        >
                            <option value="popular">Popular</option>
                            <option value="newest">Newest</option>
                            <option value="a-z">Name (A-Z)</option>
                            <option value="z-a">Name (Z-A)</option>
                        </select>
                    </div>
                    <div className="addons-list-container">
                        {loadingAddons ? (
                            <div className="loading-state">Loading addons...</div>
                        ) : (browseAddonsList || []).length > 0 ? (
                            (browseAddonsList || []).map((addon, idx) => (
                                <div key={idx} className="addon-row" onClick={() => openDetails(addon)}>
                                    <div className="addon-header">
                                        {addon.image ? (
                                            <img src={addon.image} alt={addon.title} className="addon-icon" />
                                        ) : (
                                            <div className="addon-icon-placeholder">
                                                <Puzzle size={24} />
                                            </div>
                                        )}
                                        <div className="addon-info">
                                            <div className="addon-name">
                                                {addon.title}
                                                {addon.gameVersion && (
                                                    <span className="version-badge" style={{
                                                        fontSize: '10px',
                                                        background: 'rgba(255, 255, 255, 0.1)',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        marginLeft: '8px',
                                                        color: '#aaa',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                                    }}>
                                                        {addon.gameVersion}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="addon-author">by {addon.author}</div>
                                        </div>
                                    </div>
                                    <div className="addon-actions">
                                        <button className="view-btn-small" onClick={(e) => {
                                            e.stopPropagation();
                                            openDetails(addon);
                                        }}>
                                            <Info size={14} /> Details
                                        </button>
                                        {isAddonInstalled(addon) ? (
                                            <button 
                                                className="install-btn-small installed"
                                                disabled
                                            >
                                                <Check size={14} />
                                                Installed
                                            </button>
                                        ) : (
                                            <button 
                                                className="install-btn-small"
                                                disabled={!!installingAddon || !gameInstalled}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (gameInstalled) handleInstallWarperiaAddon(addon);
                                                }}
                                            >
                                                {installingAddon === addon.title ? (
                                                    <>
                                                        <Loader2 size={14} className="spin-icon" />
                                                        Installing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download size={14} />
                                                        Install
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">
                                {activeGame.id === 'tbc' && selectedVersion === '2.5.2' && !addonSearch ? 
                                    'No addons available for 2.5.2 at the moment.' : 
                                    (addonSearch ? `No addons found matching "${addonSearch}"` : 'No addons available.')
                                }
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Addon Details Modal */}
            {selectedAddon && (
                <div className="addon-modal-overlay" onClick={closeDetails}>
                    <div className="addon-modal" onClick={e => e.stopPropagation()}>
                        <div className="addon-modal-header">
                            <div className="addon-modal-title">
                                <h3>
                                    {selectedAddon.title}
                                    {selectedAddon.gameVersion && (
                                        <span className="version-badge" style={{
                                            fontSize: '12px',
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            marginLeft: '10px',
                                            color: '#aaa',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            fontWeight: 'normal',
                                            verticalAlign: 'middle'
                                        }}>
                                            {selectedAddon.gameVersion}
                                        </span>
                                    )}
                                </h3>
                                {selectedAddon.author && <span className="addon-author">by {selectedAddon.author}</span>}
                            </div>
                            <button className="addon-modal-close" onClick={closeDetails}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="addon-modal-content">
                            {selectedAddon.image && (
                                <img src={selectedAddon.image} alt={selectedAddon.title} className="addon-modal-image" />
                            )}
                            
                            {selectedAddon.description && (
                                <div className="addon-modal-desc">
                                    {selectedAddon.description}
                                </div>
                            )}

                            {selectedAddon.modules && selectedAddon.modules.length > 0 && (
                                <div className="addon-modal-modules">
                                    <h4>Included Modules ({selectedAddon.modules.length})</h4>
                                    <div className="modules-list">
                                        {selectedAddon.modules.map((mod, i) => (
                                            <span key={i} className="module-tag">{mod.title || mod.folderName}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="addon-modal-actions" style={{marginTop: '20px', display: 'flex', justifyContent: 'flex-end'}}>
                                {activeAddonTab === 'installed' ? (
                                    <button className="delete-btn-small" style={{padding: '10px 20px'}} onClick={() => {
                                        const toDelete = [selectedAddon.folderName, ...(selectedAddon.modules || []).map(m => m.folderName)];
                                        handleDeleteAddon(toDelete);
                                        closeDetails();
                                    }}>
                                        Uninstall Addon
                                    </button>
                                ) : isAddonInstalled(selectedAddon) ? (
                                    <button 
                                        className="install-btn-small installed"
                                        disabled
                                        style={{padding: '8px 16px', fontSize: '13px'}}
                                    >
                                        <Check size={16} />
                                        Already Installed
                                    </button>
                                ) : (
                                    <button 
                                        className="install-btn-small"
                                        style={{padding: '8px 16px', fontSize: '13px'}}
                                        disabled={!!installingAddon || !gameInstalled}
                                        onClick={() => {
                                            if (gameInstalled) {
                                                handleInstallWarperiaAddon(selectedAddon);
                                                closeDetails();
                                            }
                                        }}
                                    >
                                        {installingAddon === selectedAddon.title ? (
                                            <>
                                                <Loader2 size={16} className="spin-icon" />
                                                Installing...
                                            </>
                                        ) : (
                                            <>
                                                <Download size={16} />
                                                Install Addon
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddonsView;
