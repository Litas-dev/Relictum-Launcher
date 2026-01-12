// Public Stub for ExtensionStore
// Rename this file to ExtensionStore.js to run the application without the proprietary extension engine.

class ExtensionStore {
    constructor() {
        this.menuItems = [];
        this.extensions = [];
        this.listeners = [];
        this.settingsWidgets = {
            general: [],
            appearance: [],
            system: []
        };
        this.sidebarVisible = true;
    }

    subscribe(listener) { 
        return () => {}; 
    }
    
    notify() {}
    
    getExtensions() { return []; }
    getMenuItems() { return []; }
    getGameActions() { return []; }
    getCustomGames() { return []; }
    getGameDetailsWidgets() { return []; }
    getAboutWidgets() { return []; }
    getSettingsWidgets(tab) { return []; }
    getGameImages(gameId) { return {}; }
    getGameGlow(gameId) { return null; }
    getMusic() { return null; }
    getPage(id) { return null; }
    
    getSidebarVisible() { return this.sidebarVisible; }
    setSidebarVisible(visible) { this.sidebarVisible = visible; }
    
    getDefaultView() { return null; }
    getNavigationRequest() { return null; }
}

export default new ExtensionStore();
