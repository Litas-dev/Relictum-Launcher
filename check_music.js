const https = require('https');

const itemId = "Blizzard_World_of_Warcraft_Wrath_Of_The_Lich_King_Audio_CD_Soundtrack";
const metadataUrl = `https://archive.org/metadata/${itemId}`;

console.log(`Fetching metadata from ${metadataUrl}...`);

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
};

https.get(metadataUrl, options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const metadata = JSON.parse(data);
            if (!metadata.files) {
                console.log("No files found");
                return;
            }
            console.log(`Found ${metadata.files.length} files.`);
            // List first 20 files to inspect
            metadata.files.slice(0, 20).forEach(f => {
                console.log(`- Name: ${f.name}, Format: ${f.format}`);
            });
        } catch (e) {
            console.error("Error:", e);
        }
    });
}).on('error', (e) => {
    console.error("Request error:", e);
});
