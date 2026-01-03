const fs = require('fs');
const https = require('https');
const path = require('path');

const downloadFile = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const request = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://www.google.com/'
            }
        }, (response) => {
            // Handle redirects
            if (response.statusCode === 301 || response.statusCode === 302) {
                downloadFile(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: Status Code ${response.statusCode}`));
                return;
            }

            response.pipe(file);
            file.on('finish', () => {
                file.close(() => resolve(dest));
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
};

const assets = [
    {
        url: 'https://images4.alphacoders.com/269/26937.jpg',
        dest: path.join(__dirname, 'public', 'bg.jpg'),
        fallbacks: [
            'https://c4.wallpaperflare.com/wallpaper/520/1013/366/world-of-warcraft-wrath-of-the-lich-king-arthas-menethil-video-games-wallpaper-preview.jpg',
            'https://images.unsplash.com/photo-1518182170546-0766ce6fec93?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80'
        ]
    },
    {
        url: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/World_of_Warcraft_Wrath_of_the_Lich_King_logo.png',
        dest: path.join(__dirname, 'public', 'wotlk_logo.png'),
        fallbacks: [
            'https://freepngimg.com/thumb/world_of_warcraft/2-2-world-of-warcraft-logo-png-file.png'
        ]
    },
    {
        url: 'https://www.warmane.com/assets/img/logo.png',
        dest: path.join(__dirname, 'public', 'warmane_logo.png'),
        fallbacks: []
    }
];

// Ensure public dir exists
if (!fs.existsSync(path.join(__dirname, 'public'))) {
    fs.mkdirSync(path.join(__dirname, 'public'));
}

(async () => {
    console.log('Starting downloads...');
    for (const asset of assets) {
        let success = false;
        const urls = [asset.url, ...(asset.fallbacks || [])];
        
        for (const url of urls) {
            try {
                console.log(`Downloading ${url}...`);
                await downloadFile(url, asset.dest);
                console.log(`Saved to ${asset.dest}`);
                success = true;
                break; // Stop trying fallbacks if successful
            } catch (error) {
                console.error(`Error downloading ${url}:`, error.message);
            }
        }
        
        if (!success) {
            console.error(`Failed to download asset for ${asset.dest}`);
        }
    }
    console.log('All done.');
})();
