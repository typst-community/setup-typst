const core = require('@actions/core');
const { exec } = require('child_process');
const fetch = require('node-fetch');
const fs = require('fs');
const https = require('https');
const path = require('path');
const unzipper = require('unzipper');

async function main() {
  try {
    const token = core.getInput('token');

    const versionFilePath = path.join(__dirname, 'typst_version.json');
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
    const downloadPath = `typst.zip`;

    const options = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'node.js'
      },
      agent: new https.Agent({ rejectUnauthorized: false })
    };

    fetch(url, options)
      .then(res => {
        const dest = fs.createWriteStream('typst.zip');
        res.body.pipe(dest);
        dest.on('finish', () => {
          console.log('Typst downloaded successfully.');
        });
      })
      .catch(err => {
        console.error(err);
      });

    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(downloadPath);
      https.get(url, { headers: { Authorization: `token ${token}` }, encoding: 'binary' }, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(downloadPath, () => { });
        console.error(err);
      });
    });

    const extract = unzipper.Extract({ path: './typst' });

    fs.createReadStream('typst.zip')
      .pipe(extract)
      .on('close', () => {
        console.log('Typst extracted successfully.');
      });

    const exePath = `typst/typst.exe`;
    core.setOutput('path', exePath);
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();
