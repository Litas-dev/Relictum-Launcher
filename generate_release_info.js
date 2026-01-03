const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const version = "2.0.0";
// We must hash the ACTUAL executable that runs, not the installer!
const filePath = path.join(__dirname, 'dist_v2.0.0_fix', 'win-unpacked', 'Warmane Launcher.exe');
const outputJsonPath = path.join(__dirname, 'security_update.json');

try {
    if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found at ${filePath}`);
        process.exit(1);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const hex = hashSum.digest('hex');

    console.log(`Hash for version ${version}: ${hex}`);

    const jsonContent = {
        [version]: hex
    };

    fs.writeFileSync(outputJsonPath, JSON.stringify(jsonContent, null, 4));
    console.log(`Successfully created ${outputJsonPath}`);

} catch (error) {
    console.error("Error generating hash:", error);
}
