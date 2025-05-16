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
    res.json({ output });
  } catch (error) {
    // Log the error to the backend console
    console.error("Command execution error:", error.message);
    // Send a generic error message to the client
    res.status(500).json({ error: "Command execution failed" });
  }
});

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
        if (connectionActive && socket.connected) {
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
            term.write(data);

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
