# ⚔️ Azeroth Legacy Launcher

<div align="center">

![Azeroth Legacy Launcher](https://github.com/Litas-dev/Unofficial-warmane-launcher/blob/main/public/azeroth_legacy_logo.png?raw=true)

**The ultimate, secure, and modern launcher for World of Warcraft private servers.**
*Supports 1.12.1 • 2.4.3 • 2.5.2 • 3.3.5a*

[Download Latest Release](https://github.com/Litas-dev/Azeroth-Legacy-Launcher/releases) • [Report Bug](https://github.com/Litas-dev/Azeroth-Legacy-Launcher/issues)

</div>

---

## 📖 About

The **Azeroth Legacy Launcher** is a powerful, open-source universal launcher designed to modernize your World of Warcraft experience across multiple expansions. Whether you play on **Vanilla (1.12.1)**, **The Burning Crusade (2.4.3 / 2.5.2)**, or **Wrath of the Lich King (3.3.5a)**, this launcher provides unparalleled security, automated game management, and a seamless addon ecosystem.

It is the first private server launcher to feature **"Deep Core" Integrity Verification**, ensuring that your client code is authentic, safe, and unmodified from the developer's official release.

## ✨ Key Features

### 🛡️ Deep Core Security (New in v3.0)
*   **ASAR Code Verification**: Unlike standard launchers that only check the `.exe`, we verify the cryptographic hash of the internal `app.asar` code archive.
*   **Real-Time Dashboard**: A dedicated security status card in the "About" section provides instant feedback (Secure/Warning/Danger).
*   **Active Threat Monitoring**: Immediate visual alerts on the sidebar if any integrity mismatch is detected.

### 🧩 Next-Gen Addon Manager
*   **Universal Browser**: Browse and install addons directly from the Warperia database.
*   **One-Click Install**: No more unzipping or manual folder management. Just click "Install".
*   **Smart Grouping**: Automatically groups multi-module addons into single, clean entries.
*   **Local Management**: Easily update or delete your existing addons.

### 🎥 Immersive Experience
*   **Integrated Music Player**: Enjoy the iconic soundtracks while you browse.
*   **Cinematic Backgrounds**: Dynamic, high-quality video backgrounds that bring the launcher to life.
*   **Classic Layout**: A refined user interface that pays homage to the original WoW launcher while using modern glass-morphism effects.

### ⚡ Smart Game Installation
*   **Multi-Version Support**: Built-in support for downloading and managing **1.12.1**, **2.4.3**, **2.5.2**, and **3.3.5a** clients.
*   **Torrent Integration**: Built-in WebTorrent client for easy client downloads.
*   **Auto-Locate**: Intelligently finds and verifies existing game installations for any supported version.
*   **Realm Status**: Built-in monitoring for popular realms with support for custom server configuration.

## 🛠 Tech Stack

*   **Core**: [Electron](https://www.electronjs.org/) (v28)
*   **Frontend**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
*   **Security**: SHA-256 Deep Packet Inspection
*   **Styling**: CSS Modules + Modern CSS3
*   **Icons**: [Lucide React](https://lucide.dev/)

## 🚀 Getting Started

### For Users
1.  Go to the [Releases](https://github.com/Litas-dev/Azeroth-Legacy-Launcher/releases) page.
2.  Download `Azeroth.Legacy.Launcher.Setup.exe`.
3.  Run the installer. The launcher will automatically verify its own integrity on first launch.

### For Developers

**Prerequisites**
*   Node.js (v18 or higher)
*   npm (v9 or higher)

**Installation**

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Litas-dev/Azeroth-Legacy-Launcher.git
    cd Azeroth-Legacy-Launcher
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run in development mode**
    ```bash
    npm run dev
    ```

4.  **Build for production**
    ```bash
    npm run build
    ```
    The output executable will be in the `dist_v3.0.0_final/` directory.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## ⚠️ Disclaimer

This project is an unofficial fan creation and is not affiliated with, endorsed, sponsored, or specifically approved by Warmane or Blizzard Entertainment. World of Warcraft is a trademark of Blizzard Entertainment.

## 📄 License

Distributed under the MIT License. See LICENSE for more information.4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## ⚠️ Disclaimer

This project is an unofficial fan creation and is not affiliated with, endorsed, sponsored, or specifically approved by Warmane or Blizzard Entertainment. World of Warcraft is a trademark of Blizzard Entertainment.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
