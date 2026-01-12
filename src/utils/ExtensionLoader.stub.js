// Public Stub for ExtensionLoader
// Rename this file to ExtensionLoader.js to run the application without the proprietary extension engine.

class ExtensionLoader {
    constructor() {
        this.extensions = [];
    }

    async init() {
        console.log("Extension system is disabled in this build.");
    }

    async reload() {
        console.log("Extension system is disabled in this build.");
    }

    async toggleExtension(name, enabled) {
        console.log("Extension system is disabled in this build.");
    }
}

export default new ExtensionLoader();
