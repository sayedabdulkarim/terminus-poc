/**
 * Main application file
 * Demonstrates usage of the command executor
 */

const { executeCommand } = require("./commandExecutor");

async function runDemo() {
  console.log("===== Command Executor Demo =====");

  // Example 1: Running a simple shell command
  await executeCommand('echo "Hello from the shell"');

  // Example 2: Running a command with environment variables
  await executeCommand('GREETING="Hello World" && echo $GREETING');

  // Example 3: Running a Node.js version check (shows how to run programs)
  await executeCommand("node --version");

  // Example 4: Running a directory listing
  await executeCommand("ls -la");

  // Example 5: Running a command that will fail
  await executeCommand("nonexistent-command");

  // Example 6: Chaining commands with && and ||
  await executeCommand('echo "This will succeed" && echo "This runs too"');
  await executeCommand('false || echo "This runs after failure"');

  // Example 7: Using cd (shell built-in)
  await executeCommand("cd / && pwd");

  console.log("===== Demo Completed =====");
}

// Run the demo
runDemo().catch((error) => {
  console.error("Unexpected error during demo:", error);
});

// Export the executeCommand function for use in other modules
module.exports = {
  executeCommand,
};
