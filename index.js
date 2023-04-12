const core = require('@actions/core');
const { exec } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    const token = core.getInput('token');
    
    const versionFilePath = path.join(__dirname, 'version.json');
    let version;
    
    if (core.getInput('version')) {
      version = core.getInput('version');
      console.log(`Using version from input: ${version}`);
    } else {
      try {
        const versionJson = fs.readFileSync(versionFilePath, 'utf8');
        const defaultVersion = JSON.parse(versionJson).latest;
        version = defaultVersion;
        console.log(`Using default version from ${versionFilePath}: ${version}`);
      } catch (err) {
        console.error(`Error reading version file ${versionFilePath}: ${err.message}`);
        process.exit(1);
      }
    }
    
    const url = `https://github.com/typst/typst/releases/download/${version}/typst-x86_64-pc-windows-msvc.zip`;
    const downloadPath = `${process.env.RUNNER_TEMP}/typst.zip`;
    
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(downloadPath);
      https.get(url, { headers: { Authorization: `token ${token}` }, encoding: 'binary' }, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(downloadPath, () => {});
        console.error(err);
      });
    });
    
    await new Promise((resolve, reject) => {
      exec(`7z x ${downloadPath} -o${process.env.RUNNER_TEMP}/typst`, (err) => {
        if (err) {
          console.error(err);
        } else {
          resolve();
        }
      });
    });
    
    const exePath = `${process.env.RUNNER_TEMP}/typst/typst.exe`;
    core.setOutput('path', exePath);
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();
