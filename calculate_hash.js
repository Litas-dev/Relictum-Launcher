const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const exePath = path.join(__dirname, 'dist_v3.0.0_final', 'win-unpacked', 'Azeroth Legacy Launcher.exe');
const asarPath = path.join(__dirname, 'dist_v3.0.0_final', 'win-unpacked', 'resources', 'app.asar');

function getHash(filePath) {
    try {
        const fileBuffer = fs.readFileSync(filePath);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        return hashSum.digest('hex');
    } catch (err) {
        return 'File not found';
    }
}

console.log(`EXE Hash: ${getHash(exePath)}`);
console.log(`ASAR Hash: ${getHash(asarPath)}`);
