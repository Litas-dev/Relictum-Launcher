// Public Stub for PluginLoader
// Rename this file to PluginLoader.js to run the application without the proprietary plugin engine.

class PluginLoader {
    constructor() {
        this.plugins = [];
    }

    async init() {
        console.log("Plugin system is disabled in this build.");
    }

    async reload() {
        console.log("Plugin system is disabled in this build.");
    }

    async togglePlugin(name, enabled) {
        console.log("Plugin system is disabled in this build.");
    }
}

export default new PluginLoader();
