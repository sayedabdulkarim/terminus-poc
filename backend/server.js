const express = require("express");
const http = require("http");
const cors = require("cors");
const bodyParser = require("body-parser");
const socketIo = require("socket.io");
const os = require("os");
const pty = require("node-pty");

// Map to track active terminals by client ID
const terminals = new Map();
// Map to track terminals by session ID (for reconnection)
const sessionTerminals = new Map();

// Special exit code marker - we'll look for this in terminal output
const EXIT_CODE_MARKER = "TERMINAL_EXIT_CODE:";

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 30000,
  pingInterval: 10000,
  transports: ["websocket"],
  allowUpgrades: false,
  cookie: false,
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// REST API endpoint to execute commands (mainly for compatibility)
app.post("/api/execute", (req, res) => {
  const { command } = req.body;

  if (!command) {
    return res.status(400).json({ error: "Command is required" });
  }

  try {
    // For simplicity, REST API calls don't maintain session state
    // Use Socket.io for a persistent terminal session
    const { execSync } = require("child_process");
    const output = execSync(command, { encoding: "utf-8" });

    // Return successful output to the client
    res.json({ output });
  } catch (error) {
    // Log the error to the backend console
    console.error("Command execution error:", error.message);

    // Return empty output to the client instead of the error
    res.json({ output: "" });
  }
});

// Create shell initialization command based on operating system
const getShellInitCommand = () => {
  if (process.platform === "win32") {
    // PowerShell approach - more robust implementation
    return `
# PowerShell setup to capture exit codes
function global:prompt {
  # Get the last exit code
  $lastExitCode = $LASTEXITCODE
  
  # Convert $? to numeric exit code (0 for success, 1 for failure)
  $exitCode = if ($?) { 0 } else { 1 }
  
  # Use $lastExitCode if available, otherwise use the converted $?
  $finalExitCode = if ($null -ne $lastExitCode -and $lastExitCode -ne 0) { $lastExitCode } else { $exitCode }
  
  # Output the marker with exit code
  Write-Host "${EXIT_CODE_MARKER}$finalExitCode" -NoNewline
  
  # Return a simple prompt
  return "PS > "
}

# Clear the screen to start fresh
Clear-Host
`;
  } else if (process.platform === "darwin") {
    // macOS (zsh) approach
    return `
# macOS zsh setup to capture exit codes
# Define a preexec function that runs before each command
preexec() { }

# Define a precmd function that runs before each prompt
precmd() {
  echo "${EXIT_CODE_MARKER}$?"
}

# Set a simple prompt
PS1='$ '

# Clear the screen to start fresh
clear
`;
  } else {
    // Linux/other Unix shell (bash) approach
    return `
# Unix shell setup to capture exit codes
# Use PROMPT_COMMAND to echo the exit code of the last command before each prompt
PROMPT_COMMAND='echo "${EXIT_CODE_MARKER}$?"'

# Ensure we have a simple and reliable prompt
PS1='$ '

# Disable line editing features that might interfere with our terminal handling
stty -echo

# Clear the screen to start fresh
clear

# Re-enable terminal echo
stty echo
`;
  }
};

// Socket.io connection
io.on("connection", (socket) => {
  const clientId = socket.id;
  console.log(`Client connected (ID: ${clientId})`);

  // Handle session ID for reconnection
  socket.on("terminal-init", ({ sessionId }) => {
    console.log(`Terminal init with session ID: ${sessionId || "none"}`);

    let terminalData = null;
    let term = null;
    let connectionActive = true;
    // Buffer to accumulate terminal output
    let outputBuffer = "";
    // Flag to indicate we're in the middle of sending filtered output
    let isProcessingCommand = false;
    // Temporary buffer to hold command output before determining success/failure
    let commandOutput = "";

    // Try to find an existing terminal by session ID first
    if (sessionId && sessionTerminals.has(sessionId)) {
      terminalData = sessionTerminals.get(sessionId);
      console.log(
        `Reusing existing terminal from session ${sessionId} with PID: ${terminalData.pid}`
      );
      term = terminalData.term;
    }
    // Then try by client ID
    else if (terminals.has(clientId)) {
      terminalData = terminals.get(clientId);
      console.log(`Reusing existing terminal with PID: ${terminalData.pid}`);
      term = terminalData.term;
    }
    // Create a new terminal
    else {
      // Generate a new session ID if none was provided
      const newSessionId = sessionId || `session_${Date.now()}`;

      // Determine shell based on operating system
      const shell =
        process.platform === "win32"
          ? "powershell.exe"
          : process.platform === "darwin"
          ? "zsh"
          : "bash";

      // Arguments for shell launch - using login shell to ensure proper initialization
      const shellArgs = process.platform === "win32" ? [] : ["-l"];

      try {
        // Create a pseudoterminal
        term = pty.spawn(shell, shellArgs, {
          name: "xterm-color",
          cols: 80,
          rows: 24,
          cwd: os.homedir(), // Start in user's home directory
          env: process.env,
        });

        console.log(
          `Created new terminal with PID: ${term.pid} for session ${newSessionId}`
        );

        // Create the terminal data object
        terminalData = {
          term,
          pid: term.pid,
          sessionId: newSessionId,
          lastActivity: Date.now(),
        };

        // Store the terminal in both maps
        terminals.set(clientId, terminalData);
        sessionTerminals.set(newSessionId, terminalData);

        // Send the session ID back to the client for storage
        socket.emit("terminal-session", { sessionId: newSessionId });

        // Initialize shell with exit code capture
        term.write(getShellInitCommand());
      } catch (error) {
        console.error("Failed to initialize terminal:", error);
        socket.emit("terminal-error", {
          error: "Failed to initialize terminal",
        });
        return;
      }
    }

    // If the terminal is valid, set up event handlers
    if (term) {
      // Update last activity timestamp
      if (terminals.has(clientId)) {
        terminals.get(clientId).lastActivity = Date.now();
      }

      // Function to handle terminal data
      const handleTermData = (data) => {
        if (!connectionActive || !socket.connected) return;

        // Track the last command for context
        let lastCommand = "";
        if (isProcessingCommand && outputBuffer) {
          const lines = outputBuffer.split("\n");
          if (lines.length > 0) {
            lastCommand = lines[lines.length - 1].trim();
          }
        }

        // Accumulate data to the buffer
        outputBuffer += data;

        // Check if we have an exit code marker
        const markerIndex = outputBuffer.indexOf(EXIT_CODE_MARKER);
        if (markerIndex !== -1) {
          // Found an exit code marker, parse the exit code
          const exitCodeEndIndex = outputBuffer.indexOf("\r", markerIndex);

          // If we don't find \r, look for \n as an alternative
          const endIndex =
            exitCodeEndIndex !== -1
              ? exitCodeEndIndex
              : outputBuffer.indexOf("\n", markerIndex);

          // Extract exit code text, handling potential incomplete data
          const exitCodeText = outputBuffer
            .substring(
              markerIndex + EXIT_CODE_MARKER.length,
              endIndex !== -1 ? endIndex : undefined
            )
            .trim();

          // Parse exit code, defaulting to 1 (error) if parsing fails
          const exitCode = parseInt(exitCodeText, 10) || 1;
          const isCommandSuccessful = exitCode === 0;

          // Log command execution details with more context
          console.log(
            `Command execution completed with exit code: ${exitCode}`
          );
          console.log(`Last command context: ${lastCommand || "(unknown)"}`);

          // Notify the frontend about command status
          socket.emit("command-status", {
            success: isCommandSuccessful,
            exitCode,
            command: lastCommand,
          });

          if (!isCommandSuccessful) {
            console.log(`Command FAILED with exit code: ${exitCode}`);
            console.log(`Error output:`);
            console.log(commandOutput.trim() || "(no output)");

            // Still send the error output to the client for visibility
            socket.emit("terminal-output", commandOutput);
          } else {
            console.log(`Command SUCCEEDED with exit code: ${exitCode}`);

            // Send the successful command output to the client
            if (commandOutput.trim()) {
              socket.emit("terminal-output", commandOutput);
            }
          }

          // Reset buffers and flags
          commandOutput = "";
          isProcessingCommand = false;

          // Send the prompt to the client (everything after the exit code)
          const promptText = outputBuffer.substring(
            endIndex !== -1 ? endIndex : outputBuffer.length
          );
          socket.emit("terminal-output", promptText);

          // Clear the output buffer
          outputBuffer = "";
        } else if (isProcessingCommand) {
          // We're in the middle of a command, accumulate the output
          commandOutput += data;
        } else {
          // If not processing a command and no exit code marker yet, send the output directly
          socket.emit("terminal-output", data);
        }
      };

      // Set up data handler
      term.onData(handleTermData);

      // Send terminal PID to client
      socket.emit("terminal-pid", { pid: term.pid });

      // Handle input from the client and send it to the terminal
      socket.on("terminal-input", (data) => {
        if (term && connectionActive) {
          try {
            // Special handling for different control characters
            if (data === "\r") {
              console.log("Enter key received, executing command");
              isProcessingCommand = true;

              // Store the current command for debugging
              const currentCommand = outputBuffer.split("\n").pop();
              console.log(`Executing command: ${currentCommand.trim()}`);

              // Ensure the command is executed by sending an explicit carriage return
              term.write("\r");
            } else if (data === "\b") {
              // Handle backspace - different terminals might need different codes
              console.log("Backspace key received");

              // Try both common backspace representations
              term.write("\b \b"); // Backspace, space, backspace (to erase character)
            } else {
              // For all other inputs, just write the data
              term.write(data);

              // Debug log for all inputs
              if (data.charCodeAt(0) < 32) {
                console.log(
                  `Terminal input: ASCII ${data.charCodeAt(
                    0
                  )} (special character)`
                );
              } else {
                console.log(`Terminal input: "${data}"`);
              }
            }

            // Update activity timestamp
            if (terminals.has(clientId)) {
              terminals.get(clientId).lastActivity = Date.now();
            }
          } catch (err) {
            console.error(`Error writing to terminal: ${err.message}`);
          }
        }
      });

      // Handle terminal resize
      socket.on("terminal-resize", ({ cols, rows }) => {
        if (term && connectionActive) {
          try {
            term.resize(cols, rows);

            // Update activity timestamp
            if (terminals.has(clientId)) {
              terminals.get(clientId).lastActivity = Date.now();
            }
          } catch (err) {
            console.error(`Error resizing terminal: ${err.message}`);
          }
        }
      });

      // Handle disconnection with improved cleanup
      socket.on("disconnect", (reason) => {
        console.log(`Client ${clientId} disconnected (${reason})`);
        connectionActive = false;

        // Store the terminal for potential reconnection
        if (terminalData) {
          console.log(
            `Preserving terminal ${terminalData.pid} for session ${terminalData.sessionId}`
          );
          // Update the last activity time
          terminalData.lastActivity = Date.now();

          // If it was an abnormal disconnection, prepare for reconnection
          if (reason === "transport close" || reason === "ping timeout") {
            console.log(
              `Setting up for potential reconnection of session ${terminalData.sessionId}`
            );

            // Make sure we keep the session terminal data for reconnection
            sessionTerminals.set(terminalData.sessionId, terminalData);

            // Set a timeout to clean up if no reconnection happens
            setTimeout(() => {
              if (sessionTerminals.has(terminalData.sessionId)) {
                const currentData = sessionTerminals.get(
                  terminalData.sessionId
                );
                // Only cleanup if no activity since disconnect
                if (currentData.lastActivity <= terminalData.lastActivity) {
                  console.log(
                    `No reconnection detected for session ${terminalData.sessionId} after timeout, cleaning up`
                  );
                  try {
                    currentData.term.kill();
                    sessionTerminals.delete(terminalData.sessionId);
                  } catch (err) {
                    console.error(`Error cleaning up terminal: ${err.message}`);
                  }
                }
              }
            }, 5 * 60 * 1000); // 5 minutes timeout
          }
        }
      });
    }
  });
});

// Cleanup inactive terminals regularly
setInterval(() => {
  const now = Date.now();
  const timeout = 5 * 60 * 1000; // 5 minutes (adjust as needed)

  // Check all terminals by session ID
  for (const [sessionId, terminalData] of sessionTerminals.entries()) {
    const inactiveTime = now - terminalData.lastActivity;

    // If terminal has been inactive too long
    if (inactiveTime > timeout) {
      console.log(
        `Cleaning up inactive terminal for session ${sessionId} (PID: ${
          terminalData.pid
        }), inactive for ${inactiveTime / 1000}s`
      );

      try {
        // Kill the terminal
        terminalData.term.kill();
        console.log(
          `Terminated inactive process with PID: ${terminalData.pid}`
        );
      } catch (error) {
        console.error(`Error killing terminal process: ${error.message}`);
      }

      // Remove from our maps
      sessionTerminals.delete(sessionId);

      // Also remove from client terminals if present
      for (const [clientId, data] of terminals.entries()) {
        if (data.sessionId === sessionId) {
          terminals.delete(clientId);
        }
      }
    }
  }
}, 60 * 1000); // Check every minute (adjust as needed)

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
