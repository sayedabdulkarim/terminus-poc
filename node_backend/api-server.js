/**
 * api-server.js
 *
 * Express server that provides an API endpoint to execute shell commands
 * using our executeShellCommand utility.
 */

const express = require("express");
const bodyParser = require("body-parser");
const executeShellCommand = require("./shell-command-executor");

// Create an Express application
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware to parse JSON request bodies
app.use(bodyParser.json());

/**
 * POST /api/execute-command
 *
 * Executes a shell command provided in the request body.
 *
 * Request Body:
 * {
 *   "command": "echo 'Hello World'"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "stdout": "Hello World\n",
 *   "stderr": "",
 *   "exitCode": 0
 * }
 */
app.post("/api/execute-command", async (req, res) => {
  try {
    const { command } = req.body;

    // Validate that a command was provided
    if (!command) {
      return res.status(400).json({
        success: false,
        error: "Command is required",
      });
    }

    // Execute the command
    const result = await executeShellCommand(command);

    // Return the result
    return res.json({
      success: result.success,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    });
  } catch (error) {
    console.error("Error executing command:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`POST /api/execute-command - Execute shell commands`);
});

module.exports = app; // Export for testing
