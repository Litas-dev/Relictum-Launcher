// Public Stub for PluginStore
// Rename this file to PluginStore.js to run the application without the proprietary plugin engine.

class PluginStore {
    constructor() {
        this.menuItems = [];
        this.plugins = [];
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
    
    getPlugins() { return []; }
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

export default new PluginStore();
