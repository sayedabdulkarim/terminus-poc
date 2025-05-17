/**
 * A simplified command executor for demonstration
 */
const { spawn } = require("child_process");

/**
 * Execute a shell command and return the results
 * @param {string} command - The command to execute
 * @returns {Promise<object>} - Object with command results
 */
const runCommand = (command) => {
  return new Promise((resolve) => {
    console.log(`Executing: ${command}`);

    const childProcess = spawn("sh", ["-c", command]);

    let stdout = "";
    let stderr = "";

    childProcess.stdout.on("data", (data) => {
      const output = data.toString();
      stdout += output;
      console.log(`STDOUT: ${output.trim()}`);
    });

    childProcess.stderr.on("data", (data) => {
      const output = data.toString();
      stderr += output;
      console.log(`STDERR: ${output.trim()}`);
    });

    childProcess.on("close", (code) => {
      console.log(`Exit code: ${code}`);
      const success = code === 0;
      console.log(`Command ${success ? "succeeded" : "failed"}`);

      resolve({
        command,
        stdout,
        stderr,
        exitCode: code,
        success,
      });
    });

    childProcess.on("error", (err) => {
      console.error(`Process error: ${err.message}`);
      resolve({
        command,
        stdout,
        stderr: err.message,
        exitCode: 1,
        success: false,
      });
    });
  });
};

// Export the function
exports.runCommand = runCommand;

// If this file is run directly, run a test command
if (require.main === module) {
  console.log("Running test command...");
  runCommand('echo "Hello from test command" && ls -la')
    .then((result) => {
      console.log("Final result:", JSON.stringify(result, null, 2));
    })
    .catch((err) => {
      console.error("Unexpected error:", err);
    });
}
