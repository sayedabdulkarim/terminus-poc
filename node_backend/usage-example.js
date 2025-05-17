/**
 * usage-example.js
 *
 * This file demonstrates practical uses of the executeShellCommand function
 * in a typical Node.js backend application.
 */

const executeShellCommand = require("./shell-command-executor");

/**
 * Example application using the shell command executor for various tasks
 */
class BackendService {
  /**
   * Checks if a required system dependency is installed
   * @param {string} command - Command to check (e.g., 'git', 'docker', 'ffmpeg')
   * @returns {Promise<boolean>} - True if dependency is available
   */
  async checkDependency(command) {
    try {
      const result = await executeShellCommand(`which ${command}`, {
        silent: true,
      });
      return result.success;
    } catch (error) {
      console.error(`Error checking dependency ${command}:`, error);
      return false;
    }
  }

  /**
   * Gets system information
   * @returns {Promise<Object>} - Object containing system info
   */
  async getSystemInfo() {
    const info = {};

    try {
      // Get Node.js version
      const nodeResult = await executeShellCommand("node --version", {
        silent: true,
      });
      info.nodeVersion = nodeResult.stdout.trim();

      // Get OS information
      const osResult = await executeShellCommand("uname -a", { silent: true });
      info.osInfo = osResult.stdout.trim();

      // Get available disk space
      const diskResult = await executeShellCommand(
        "df -h / | tail -1 | awk '{print $4}'",
        { silent: true }
      );
      info.availableDiskSpace = diskResult.stdout.trim();

      // Get available memory
      const memResult = await executeShellCommand(
        'free -h 2>/dev/null || vm_stat | grep "Pages free"',
        { silent: true }
      );
      info.memoryInfo = memResult.stdout.trim();

      return info;
    } catch (error) {
      console.error("Error getting system info:", error);
      return info;
    }
  }

  /**
   * Deploys a simple application
   * @param {string} appPath - Path to the application
   * @returns {Promise<boolean>} - True if deployment succeeded
   */
  async deployApplication(appPath) {
    console.log(`Deploying application from ${appPath}...`);

    try {
      // Step 1: Check if git is installed
      if (!(await this.checkDependency("git"))) {
        console.error("Git is required for deployment");
        return false;
      }

      // Step 2: Pull latest changes
      console.log("Pulling latest changes...");
      const pullResult = await executeShellCommand(`cd ${appPath} && git pull`);

      if (!pullResult.success) {
        console.error("Failed to pull latest changes");
        return false;
      }

      // Step 3: Install dependencies
      console.log("Installing dependencies...");
      const installResult = await executeShellCommand(
        `cd ${appPath} && npm install`
      );

      if (!installResult.success) {
        console.error("Failed to install dependencies");
        return false;
      }

      // Step 4: Build the application
      console.log("Building application...");
      const buildResult = await executeShellCommand(
        `cd ${appPath} && npm run build`
      );

      if (!buildResult.success) {
        console.error("Failed to build the application");
        return false;
      }

      // Step 5: Run tests
      console.log("Running tests...");
      const testResult = await executeShellCommand(`cd ${appPath} && npm test`);

      if (!testResult.success) {
        console.error("Tests failed, aborting deployment");
        return false;
      }

      console.log("Application deployment completed successfully!");
      return true;
    } catch (error) {
      console.error("Deployment error:", error);
      return false;
    }
  }

  /**
   * Creates a backup of a database
   * @param {string} dbName - Database name
   * @returns {Promise<string>} - Path to backup file or empty string on failure
   */
  async backupDatabase(dbName) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = `/tmp/${dbName}-backup-${timestamp}.sql`;

      console.log(`Creating database backup for ${dbName}...`);

      const result = await executeShellCommand(
        `mysqldump --user=$DB_USER --password=$DB_PASS ${dbName} > ${backupPath}`,
        {
          env: {
            DB_USER: process.env.DB_USER || "root",
            DB_PASS: process.env.DB_PASSWORD || "",
          },
        }
      );

      if (result.success) {
        console.log(`Database backup created at ${backupPath}`);
        return backupPath;
      } else {
        console.error("Database backup failed:", result.stderr);
        return "";
      }
    } catch (error) {
      console.error("Backup error:", error);
      return "";
    }
  }
}

// Run a demo if this file is executed directly
if (require.main === module) {
  async function runDemo() {
    console.log("===== Backend Service Demo =====");
    const service = new BackendService();

    // Check for some common dependencies
    const dependencies = ["git", "node", "npm"];
    for (const dep of dependencies) {
      const available = await service.checkDependency(dep);
      console.log(`${dep} available: ${available ? "Yes" : "No"}`);
    }

    // Get system info
    console.log("\nSystem information:");
    const sysInfo = await service.getSystemInfo();
    console.log(JSON.stringify(sysInfo, null, 2));

    console.log("\n===== Demo Completed =====");
  }

  runDemo().catch(console.error);
}

module.exports = BackendService;
