// update-imports.js
const fs = require('fs');
const path = require('path');

// Paths to search for imports that need updating
const directories = [
  './commands',
  './events'
];

// Old imports to search for and their replacements
const importReplacements = [
  {
    oldImport: './fetch/cfAPI.js',
    newImport: '../services/codeforces.js'
  },
  {
    oldImport: '../fetch/cfAPI.js',
    newImport: '../../services/codeforces.js'
  },
  {
    oldImport: './database/data.js',
    newImport: '../services/database.js'
  },
  {
    oldImport: '../database/data.js',
    newImport: '../../services/database.js'
  }
];

// Function to recursively find files in directories
function findJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fileList = findJsFiles(filePath, fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Find all JS files in the directories
const jsFiles = [];
directories.forEach(dir => {
  const filesInDir = findJsFiles(dir);
  jsFiles.push(...filesInDir);
});

console.log(`Found ${jsFiles.length} JS files to check`);

// Check each file for imports that need updating
jsFiles.forEach(filePath => {
  let fileContent = fs.readFileSync(filePath, 'utf8');
  let fileUpdated = false;
  
  importReplacements.forEach(({ oldImport, newImport }) => {
    // Check for require statements with the old import
    const requireRegex = new RegExp(`require\\(['"]${oldImport.replace('.', '\\.')}['"]\\)`, 'g');
    
    if (requireRegex.test(fileContent)) {
      fileContent = fileContent.replace(requireRegex, `require('${newImport}')`);
      fileUpdated = true;
      console.log(`Updated import in ${filePath}: ${oldImport} -> ${newImport}`);
    }
  });
  
  // Write the updated file back if changes were made
  if (fileUpdated) {
    fs.writeFileSync(filePath, fileContent, 'utf8');
    console.log(`File updated: ${filePath}`);
  }
});

console.log('Import paths update complete');