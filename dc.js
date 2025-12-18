const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Constants
const IMG_FOLDER = './img';
const SYSTEM_JSON_PATH = './data/System.json';
const DEFAULT_HEADER_LENGTH = 16;
const DEFAULT_SIGNATURE = "5250474d56000000";
const DEFAULT_VERSION = "000301";
const DEFAULT_REMAIN = "0000000000";

// Readline for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Decrypter class implementation
class Decrypter {
  constructor(encryptionKey) {
    this.encryptCode = encryptionKey;
    this.ignoreFakeHeader = false;
    this.headerLen = DEFAULT_HEADER_LENGTH;
    this.signature = DEFAULT_SIGNATURE;
    this.version = DEFAULT_VERSION;
    this.remain = DEFAULT_REMAIN;
    this.pngHeaderLen = null;

    this.encryptionCodeArray = this.splitEncryptionCode();
  }

  splitEncryptionCode() {
    if (!this.encryptCode) return [];
    return this.encryptCode.split(/(.{2})/).filter(Boolean);
  }

  verifyFakeHeader(fileHeader) {
    const fakeHeader = this.buildFakeHeader();
    for (let i = 0; i < this.getHeaderLen(); i++) {
      if (fileHeader[i] !== fakeHeader[i]) return false;
    }
    return true;
  }

  buildFakeHeader() {
    const fakeHeader = new Uint8Array(this.getHeaderLen());
    const headerStructure = this.getSignature() + this.getVersion() + this.getRemain();
    for (let i = 0; i < this.getHeaderLen(); i++) {
      fakeHeader[i] = parseInt('0x' + headerStructure.substr(i * 2, 2), 16);
    }
    return fakeHeader;
  }

  getHeaderLen() {
    return this.headerLen;
  }

  getSignature() {
    return this.signature;
  }

  getVersion() {
    return this.version;
  }

  getRemain() {
    return this.remain;
  }

  restorePngHeader(arrayBuffer) {
    if (!arrayBuffer) throw new Error('File is empty or cannot be read.');
    const headerLen = this.pngHeaderLen || this.getHeaderLen();
    const pngStartHeader = this.constructor.getNormalPNGHeader(headerLen);
    const tmpInt8Arr = new Uint8Array(arrayBuffer.byteLength + headerLen);
    tmpInt8Arr.set(pngStartHeader, 0);
    tmpInt8Arr.set(new Uint8Array(arrayBuffer), headerLen);
    return tmpInt8Arr.buffer;
  }

  decrypt(arrayBuffer) {
    if (!arrayBuffer) throw new Error('File is empty or cannot be read.');
    if (!this.ignoreFakeHeader) {
      const header = new Uint8Array(arrayBuffer, 0, this.getHeaderLen());
      if (!this.verifyFakeHeader(header)) throw new Error('Fake header does not match.');
    }
    arrayBuffer = arrayBuffer.slice(this.getHeaderLen(), arrayBuffer.byteLength);
    return this.xOrBytes(arrayBuffer);
  }

  xOrBytes(arrayBuffer){
    const view = new DataView(arrayBuffer);
    const byteArray = new Uint8Array(arrayBuffer);
    for (let i = 0; i < this.getHeaderLen(); i++) {
      byteArray[i] ^= parseInt(this.encryptionCodeArray[i], 16);
      view.setUint8(i, byteArray[i]);
    }
    return arrayBuffer;
  }

  static getNormalPNGHeader(headerLen) {
    return Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10].concat(Array(headerLen - 8).fill(0)));
  }

  /**
   * Detect the Encryption-Code from a RPGFile
   *
   * @param {string} filePath - Path to the RPGFile
   * @param {int} headerLen - Header-Length
   * @returns {string|null} - Detected encryption key or null if not found
   */
  static detectEncryptionCode(filePath, headerLen) {
    const fileContent = fs.readFileSync(filePath);
    let key = null;

    try {
      // Try to parse as JSON
      const contentAsText = fileContent.toString('utf8');
      const fileContentAsJSON = JSON.parse(contentAsText);
      key = fileContentAsJSON.encryptionKey || null;
    } catch (e) {
      // If not JSON, attempt LZ-string decompression
        console.error("Failed to detect encryption key:", e.message);
    }

    return key;
  }
}

// Helper functions
function readEncryptionKey() {
  try {
    const data = JSON.parse(fs.readFileSync(SYSTEM_JSON_PATH, 'utf8'));
    return data.encryptionKey;
  } catch (error) {
    console.error("Error reading System.json:", error);
    process.exit(1);
  }
}

function processFile(decrypter, filePath) {
  const buf = fs.readFileSync(filePath);         // Node Buffer
  // Create a proper ArrayBuffer containing exactly the file bytes
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

  const pngPath = filePath.replace('.rpgmvp', '.png');

  if (fs.existsSync(pngPath)) {
    rl.question(`File ${pngPath} already exists. Overwrite? (y/n): `, (answer) => {
      if (answer.toLowerCase() === 'y') {
        decryptAndSave(decrypter, arrayBuffer, pngPath);
      } else {
        console.log(`Skipped: ${pngPath}`);
      }
    });
  } else {
    decryptAndSave(decrypter, arrayBuffer, pngPath);
  }
}

function decryptAndSave(decrypter, fileBuffer, outputPath) {
  try {
    const decryptedBuffer = decrypter.decrypt(fileBuffer); // expects an ArrayBuffer
    fs.writeFileSync(outputPath, Buffer.from(decryptedBuffer));
    console.log(`Decrypted: ${outputPath}`);
  } catch (error) {
    console.error(`Error decrypting file ${outputPath}:`, error.message);
  }
}

function scanDirectory(decrypter, directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(decrypter, fullPath);
    } else if (path.extname(file).toLowerCase() === '.rpgmvp') {
      processFile(decrypter, fullPath);
    }
  }
}

// Main function
function start() {
  if (!fs.existsSync(SYSTEM_JSON_PATH) || !fs.existsSync(IMG_FOLDER)) {
    console.error("System.json or img folder is missing.");
    process.exit(1);
  }

  const encryptionKey = readEncryptionKey();
  const decrypter = new Decrypter(encryptionKey);

  console.log("Starting decryption...");
  scanDirectory(decrypter, IMG_FOLDER);

  rl.close();
}

start();
