const fs = require('fs');
const path = require('path');
const parseTorrent = require('parse-torrent');

const torrentPath = path.join(__dirname, 'electron', 'torrents', 'tbc-2.4.3.torrent');
console.log('Checking torrent at:', torrentPath);

try {
    if (fs.existsSync(torrentPath)) {
        console.log('File exists.');
        const buf = fs.readFileSync(torrentPath);
        console.log('File read. Size:', buf.length);
        
        try {
            const parsed = parseTorrent(buf);
            console.log('Torrent parsed successfully!');
            console.log('Info Hash:', parsed.infoHash);
            console.log('Name:', parsed.name);
        } catch (e) {
            console.error('Error parsing torrent buffer:', e);
        }

    } else {
        console.error('File does NOT exist.');
    }
} catch (e) {
    console.error('System error:', e);
}
