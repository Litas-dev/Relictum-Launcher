# ⚔️ Warmane Launcher - Ascension Edition

<div align="center">

![Warmane Launcher](image.png)

**The next-generation launcher for the Warmane World of Warcraft private server.**
Modern, fast, and feature-rich. Built with Electron and React.

[Download Latest Release](https://github.com/Litas-dev/warmane-launcher/releases) • [Report Bug](https://github.com/Litas-dev/warmane-launcher/issues)

</div>

---

## 📖 About

The **Warmane Launcher** is a fan-made, open-source replacement for the standard WoW client launcher. It brings the Warmane experience into the modern era with a sleek, high-tech interface, integrated addon management, and automated game installation.

Designed to be immersive, it features a dynamic video background, real-time server status tracking, and seamless integration with the Wrath of the Lich King (3.3.5a) client.

## ✨ Key Features

*   **🎥 Cinematic Experience**
    *   Fully animated video background.
    *   Glass-morphism UI design with smooth transitions.
    *   Custom frameless window with native OS integration.

*   **🧩 Integrated Addon Manager**
    *   **One-Click Install**: Install addons directly from ZIP files.
    *   **Management**: View, delete, and manage your installed addons without leaving the launcher.
    *   **Smart Detection**: Automatically finds your Interface/AddOns folder.

*   **⚡ Smart Game Installation**
    *   **Torrent Integration**: Built-in WebTorrent client to download the full WotLK 3.3.5a client.
    *   **Auto-Locate**: Already have the game? The launcher will find and verify it instantly.
    *   **Status Tracking**: Real-time download speed, progress, and peer stats.

*   **📊 Live Server Status**
    *   Monitor population and uptime for **Icecrown**, **Lordaeron**, **Blackrock**, and **Onyxia**.
    *   See total online players at a glance.

*   **📰 News & Community**
    *   Fetch the latest Warmane news and changelogs directly in the dashboard.
    *   Quick links to forums and community resources.

## 🛠 Tech Stack

*   **Core**: [Electron](https://www.electronjs.org/) (v28)
*   **Frontend**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
*   **Styling**: CSS Modules + Modern CSS3 (Grid/Flexbox)
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **P2P**: [WebTorrent](https://webtorrent.io/)

## 🚀 Getting Started

### For Users
1.  Go to the [Releases](https://github.com/Litas-dev/warmane-launcher/releases) page.
2.  Download `Warmane.Launcher.Setup.exe`.
3.  Run the installer and follow the on-screen instructions.

### For Developers

**Prerequisites**
*   Node.js (v18 or higher)
*   npm (v9 or higher)

**Installation**

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Litas-dev/warmane-launcher.git
    cd warmane-launcher
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run in development mode**
    ```bash
    npm run dev
    ```
    *This runs Vite and Electron concurrently.*

4.  **Build for production**
    *Note: Run your terminal as Administrator on Windows to allow symlink creation.*
    ```bash
    npm run build
    ```
    The output executable will be in the `dist/` directory.

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

Distributed under the MIT License. See `LICENSE` for more information.
