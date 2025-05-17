/**
 * Example usage of the command executor in a real application
 * This file demonstrates how to use the command executor in various scenarios
 */

const { executeCommand } = require("./commandExecutor");

/**
 * Installs a npm package
 * @param {string} packageName - Name of the package to install
 * @param {boolean} isDev - Whether to install as a dev dependency
 */
async function installPackage(packageName, isDev = false) {
  const devFlag = isDev ? "--save-dev" : "--save";
  const result = await executeCommand(`npm install ${devFlag} ${packageName}`);

  if (result.success) {
    console.log(`Package ${packageName} installed successfully.`);
  } else {
    console.error(`Failed to install package ${packageName}.`);
  }

  return result;
}

/**
 * Checks if a directory exists
 * @param {string} dirPath - Path to check
 * @returns {Promise<boolean>} - Whether the directory exists
 */
async function checkDirectoryExists(dirPath) {
  const result = await executeCommand(
    `[ -d "${dirPath}" ] && echo "exists" || echo "not exists"`
  );
  return result.stdout.trim() === "exists";
}

/**
 * Creates a backup of a file
 * @param {string} filePath - Path to the file
 */
async function backupFile(filePath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${filePath}.${timestamp}.bak`;

  const result = await executeCommand(`cp "${filePath}" "${backupPath}"`);

  if (result.success) {
    console.log(`Backup created at ${backupPath}`);
  } else {
    console.error(`Failed to create backup of ${filePath}`);
  }

  return result;
}

// Example of how to use these utility functions
async function runUtilityExamples() {
  console.log("===== Utility Examples =====");

  // Check if the current directory exists (it should)
  const currentDirExists = await checkDirectoryExists(".");
  console.log(`Current directory exists: ${currentDirExists}`);

  // Create a test file to backup
  await executeCommand('echo "Test content" > test-file.txt');

  // Backup the test file
  await backupFile("test-file.txt");

  // List all files to verify backup was created
  await executeCommand("ls -la *.txt*");

  console.log("===== Utility Examples Completed =====");
}

// Uncomment to run the examples
// runUtilityExamples().catch(error => {
//   console.error('Error in utility examples:', error);
// });

module.exports = {
  installPackage,
  checkDirectoryExists,
  backupFile,
};
