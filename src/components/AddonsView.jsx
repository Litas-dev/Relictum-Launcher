import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Plus, Puzzle, Search, Trash2, X, Info, Download, Check, Loader2, ChevronDown } from 'lucide-react';
import styles from './AddonsView.module.css';

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
    const { t } = useTranslation();
    const [selectedAddon, setSelectedAddon] = useState(null);
    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

    const sortOptions = [
        { value: 'popular', label: t('addons.sort_popular') || 'Most Popular' },
        { value: 'recent', label: t('addons.sort_recent') || 'Recently Added' }
    ];

    const currentSortLabel = sortOptions.find(o => o.value === addonSort)?.label || sortOptions[0].label;

    if (!activeGame) return <div className={styles.addonsView}>Error: Game data not found.</div>;

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
        <div className={styles.addonsView}>
            <div className={styles.viewHeader}>
                <h2>{t('addons.title')} - {activeGame.shortName}</h2>
                {gameInstalled && (
                    <div className={styles.addonTabs}>
                        <button 
                            className={`${styles.tabBtn} ${activeAddonTab === 'installed' ? styles.active : ''}`} 
                            onClick={() => setActiveAddonTab('installed')}
                        >
                            {t('addons.tabs.installed')}
                        </button>
                        <button 
                            className={`${styles.tabBtn} ${activeAddonTab === 'browse' ? styles.active : ''}`} 
                            onClick={() => setActiveAddonTab('browse')}
                        >
                            {t('addons.tabs.browse')}
                        </button>
                    </div>
                )}
            </div>

            {!gameInstalled ? (
                <div className={styles.emptyStateContainer}>
                    <div className={styles.infoIconWrapper}>
                        <Info size={48} color="#fb7185" />
                    </div>
                    <div className={styles.emptyStateContent}>
                        <h3 className={styles.emptyStateTitle}>{t('addons.client_not_found')}</h3>
                        <p className={styles.emptyStateDesc}>
                            <Trans 
                                i18nKey="addons.client_not_found_desc" 
                                values={{ game: activeGame.name }}
                                components={{ 1: <span style={{color: 'var(--primary-gold)'}} /> }}
                            />
                        </p>
                    </div>
                </div>
            ) : activeAddonTab === 'installed' ? (
                <div className={styles.addonsContent}>
                    <div className={styles.addonsToolbar}>
                        <button 
                            className={styles.primaryBtn} 
                            onClick={handleInstallAddon}
                            disabled={!gameInstalled}
                            style={{opacity: !gameInstalled ? 0.5 : 1, cursor: !gameInstalled ? 'not-allowed' : 'pointer'}}
                        >
                            <Plus size={16} /> {t('addons.install_zip')}
                        </button>
                        <span className={styles.addonCount}>{t('addons.count_addons', { count: (groupedAddons || []).length })}</span>
                    </div>
                    <div className={styles.addonsListContainer}>
                        {loadingAddons ? (
                            <div className={styles.loadingState}>{t('addons.loading')}</div>
                        ) : (groupedAddons || []).length > 0 ? (
                            (groupedAddons || []).map((addon, idx) => (
                                <div key={idx} className={styles.addonRow} onClick={() => openDetails(addon)}>
                                    <div className={styles.addonHeader}>
                                        {addon.image ? (
                                            <img src={addon.image} alt={addon.title} className={styles.addonIcon} />
                                        ) : (
                                            <div className={styles.addonIconPlaceholder}>
                                                <Puzzle size={24} />
                                            </div>
                                        )}
                                        <div className={styles.addonInfo}>
                                            <div className={styles.addonName}>{addon.title}</div>
                                            {addon.author ? (
                                                 <div className={styles.addonAuthor}>by {addon.author}</div>
                                            ) : (
                                                 <div className={styles.addonStatus}>{t('addons.tabs.installed')}</div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {addon.modules && addon.modules.length > 0 && (
                                        <div className={styles.addonModulesBadge}>
                                            + {addon.modules.length} modules
                                        </div>
                                    )}
                                    
                                    <div className={styles.addonActions}>
                                        <button className={styles.viewBtnSmall} onClick={(e) => {
                                            e.stopPropagation();
                                            openDetails(addon);
                                        }}>
                                            <Info size={14} /> {t('addons.details')}
                                        </button>
                                        <button className={styles.deleteBtnSmall} onClick={(e) => {
                                            e.stopPropagation();
                                            const toDelete = [addon.folderName, ...(addon.modules || []).map(m => m.folderName)];
                                            handleDeleteAddon(toDelete);
                                        }}>
                                            {t('addons.uninstall')}
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className={styles.emptyState}>{t('addons.no_addons')}</div>
                        )}
                    </div>
                </div>
            ) : (
                <div className={styles.addonsContent}>
                     <div className={styles.addonsToolbar}>
                        <div className={styles.searchInputWrapper}>
                            <Search size={16} className={styles.searchIcon} />
                            <input 
                                type="text" 
                                className={styles.searchInput}
                                placeholder={t('addons.search_placeholder')}
                                value={addonSearch}
                                onChange={(e) => setAddonSearch(e.target.value)}
                            />
                        </div>
                        
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
                                            className={`${styles.sortOption} ${addonSort === option.value ? styles.selected : ''}`}
                                            onClick={() => {
                                                setAddonSort(option.value);
                                                setIsSortDropdownOpen(false);
                                            }}
                                        >
                                            {option.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={styles.addonsListContainer}>
                        {loadingAddons ? (
                            <div className={styles.loadingState}>{t('addons.loading')}</div>
                        ) : (browseAddonsList || []).length > 0 ? (
                            (browseAddonsList || []).map((addon, idx) => (
                                <div key={idx} className={styles.addonRow} onClick={() => openDetails(addon)}>
                                    <div className={styles.addonHeader}>
                                        {addon.image ? (
                                            <img src={addon.image} alt={addon.title} className={styles.addonIcon} />
                                        ) : (
                                            <div className={styles.addonIconPlaceholder}>
                                                <Puzzle size={24} />
                                            </div>
                                        )}
                                        <div className={styles.addonInfo}>
                                            <div className={styles.addonName}>
                                                {addon.title}
                                                {addon.gameVersion && (
                                                    <span className={styles.versionBadge}>
                                                        {addon.gameVersion}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={styles.addonAuthor}>by {addon.author}</div>
                                        </div>
                                    </div>
                                    <div className={styles.addonActions}>
                                        <button className={styles.viewBtnSmall} onClick={(e) => {
                                            e.stopPropagation();
                                            openDetails(addon);
                                        }}>
                                            <Info size={14} /> {t('addons.details')}
                                        </button>
                                        {isAddonInstalled(addon) ? (
                                            <button 
                                                className={`${styles.installBtnSmall} ${styles.installed}`}
                                                disabled
                                            >
                                                <Check size={14} />
                                                {t('addons.already_installed')}
                                            </button>
                                        ) : (
                                            <button 
                                                className={styles.installBtnSmall}
                                                disabled={!!installingAddon || !gameInstalled}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (gameInstalled) handleInstallWarperiaAddon(addon);
                                                }}
                                            >
                                                {installingAddon === addon.title ? (
                                                    <>
                                                        <Loader2 size={14} className={styles.spinIcon} />
                                                        {t('addons.installing')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download size={14} />
                                                        {t('addons.install')}
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className={styles.emptyState}>
                                {activeGame.id === 'tbc' && selectedVersion === '2.5.2' && !addonSearch ? 
                                    t('addons.no_addons_tbc') : 
                                    (addonSearch ? t('addons.no_addons_search', { search: addonSearch }) : t('addons.no_addons_avail'))
                                }
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Addon Details Modal */}
            {selectedAddon && (
                <div className={styles.addonModalOverlay} onClick={closeDetails}>
                    <div className={styles.addonModal} onClick={e => e.stopPropagation()}>
                        <div className={styles.addonModalHeader}>
                            <div className={styles.addonModalTitle}>
                                <h3>
                                    {selectedAddon.title}
                                    {selectedAddon.gameVersion && (
                                        <span className={styles.versionBadge} style={{
                                            fontSize: '12px',
                                            padding: '4px 8px',
                                            marginLeft: '10px',
                                            fontWeight: 'normal',
                                            verticalAlign: 'middle'
                                        }}>
                                            {selectedAddon.gameVersion}
                                        </span>
                                    )}
                                </h3>
                                {selectedAddon.author && <span className={styles.addonAuthor}>by {selectedAddon.author}</span>}
                            </div>
                            <button className={styles.addonModalClose} onClick={closeDetails}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.addonModalContent}>
                            {selectedAddon.image && (
                                <img src={selectedAddon.image} alt={selectedAddon.title} className={styles.addonModalImage} />
                            )}
                            
                            {selectedAddon.description && (
                                <div className={styles.addonModalDesc}>
                                    {selectedAddon.description}
                                </div>
                            )}

                            {selectedAddon.modules && selectedAddon.modules.length > 0 && (
                                <div className={styles.addonModalModules}>
                                    <h4>{t('addons.included_modules', { count: selectedAddon.modules.length })}</h4>
                                    <div className={styles.modulesList}>
                                        {selectedAddon.modules.map((mod, i) => (
                                            <span key={i} className={styles.moduleTag}>{mod.title || mod.folderName}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className={styles.addonModalActions} style={{marginTop: '20px', display: 'flex', justifyContent: 'flex-end'}}>
                                {activeAddonTab === 'installed' ? (
                                    <button className={styles.deleteBtnSmall} style={{padding: '10px 20px'}} onClick={() => {
                                        const toDelete = [selectedAddon.folderName, ...(selectedAddon.modules || []).map(m => m.folderName)];
                                        handleDeleteAddon(toDelete);
                                        closeDetails();
                                    }}>
                                        {t('addons.uninstall_addon')}
                                    </button>
                                ) : isAddonInstalled(selectedAddon) ? (
                                    <button 
                                        className={`${styles.installBtnSmall} ${styles.installed}`}
                                        disabled
                                        style={{padding: '8px 16px', fontSize: '13px'}}
                                    >
                                        <Check size={16} />
                                        {t('addons.already_installed')}
                                    </button>
                                ) : (
                                    <button 
                                        className={styles.installBtnSmall}
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
                                                <Loader2 size={16} className={styles.spinIcon} />
                                                {t('addons.installing')}
                                            </>
                                        ) : (
                                            <>
                                                <Download size={16} />
                                                {t('addons.install_addon')}
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
