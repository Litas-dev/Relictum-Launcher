# ⚔️ Relictum Launcher

<div align="center">

![Relictum Launcher](public/logo-new-white.png)

**The Next-Generation Universal Game Client Manager.**
*Unified Management for Legacy 1.12.1 • 2.4.3 • 3.3.5a Clients*

[Download Latest Release](https://github.com/Litas-dev/Relictum-Launcher/releases) • [Report Bug](https://github.com/Litas-dev/Relictum-Launcher/issues) • ![Downloads](https://img.shields.io/github/downloads/Litas-dev/Relictum-Launcher/total?label=Downloads&logo=github&color=blue) • [![Virus Scan](https://github.com/Litas-dev/Relictum-Launcher/actions/workflows/virus_scan.yml/badge.svg)](https://github.com/Litas-dev/Relictum-Launcher/actions/workflows/virus_scan.yml) • [![Build Linux Release](https://github.com/Litas-dev/Relictum-Launcher/actions/workflows/linux-release.yml/badge.svg)](https://github.com/Litas-dev/Relictum-Launcher/actions/workflows/linux-release.yml)

</div>

---

## 📖 Overview

**Relictum Launcher** is a sophisticated, open-source platform designed to modernize how you interact with legacy game clients. Built with security and modularity at its core, it serves as a central hub for managing multiple game versions, ensuring client integrity, and extending functionality through a powerful extension ecosystem.

It sets a new standard for client management with **Advanced Integrity Verification**, ensuring your game environment remains authentic and unmodified.

## ✨ Core Features

### 🔌 Advanced Extension Engine (New)
*   **Modular Architecture**: Extend the launcher's capabilities without modifying the core.
*   **Community Extensions**: Install extensions to add new features, tools, or UI enhancements.
*   **Custom Game Support**: Extensions can register and manage additional game versions or custom projects beyond the default supported clients.
*   **Sandboxed Execution**: Third-party code runs in a secure, isolated environment.

### 🛡️ Integrity & Security
*   **Deep Code Verification**: Utilizes SHA-256 cryptographic hashing to verify the internal structure of the application (`app.asar`), going beyond simple executable checks.
*   **Real-Time Status**: A dedicated security dashboard provides instant feedback on the launcher's integrity.
*   **Active Monitoring**: Visual alerts notify you immediately of any unauthorized modifications.

### 🌍 Global Localization
*   **Multi-Language Interface**: Fully localized experience available in **English**, **Spanish**, **German**, **Portuguese**, and **Russian**.
*   **Dynamic Switching**: Instantly switch languages without restarting the application.

### 🧩 Intelligent Addon Management
*   **Unified Browser**: Discover and install addons directly from the launcher.
*   **One-Click Deployment**: Automated installation handles file placement and versioning.
*   **Smart Organization**: Automatically groups complex, multi-module addons into clean, single entries.

### ⚡ Client Management
*   **Multi-Version Support**: Native handling for **1.12.1**, **2.4.3**, and **3.3.5a** clients.
*   **Auto-Discovery**: Intelligently locates and validates existing installations on your system.

### 🎨 Modern UX
*   **Immersive Design**: A refined interface featuring glass-morphism effects and classic aesthetics.
*   **Integrated Media**: Built-in ambient music player for an immersive browsing experience.

## 📸 Interface Preview

<div align="center">
  <img src="src/assets/1.12.png" width="30%" alt="Classic Interface" />
  <img src="src/assets/2.4.3.png" width="30%" alt="TBC Interface" />
  <img src="src/assets/3.3.5.png" width="30%" alt="WotLK Interface" />
</div>

## 🛠 Tech Stack

*   **Core**: [Electron](https://www.electronjs.org/) (v28)
*   **Frontend**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
*   **Localization**: [i18next](https://www.i18next.com/)
*   **Security**: SHA-256 Integrity Verification
*   **Styling**: CSS Modules + Modern CSS3
*   **Icons**: [Lucide React](https://lucide.dev/)

## 🚀 Getting Started

1.  Navigate to the [Releases](https://github.com/Litas-dev/Relictum-Launcher/releases/latest) page.
2.  Download the latest installer (`Relictum.Launcher.Setup.exe`).
3.  Run the installer. The application will perform a self-integrity check on the first launch.
