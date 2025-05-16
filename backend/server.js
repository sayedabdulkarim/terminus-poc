const express = require("express");
const http = require("http");
const cors = require("cors");
const bodyParser = require("body-parser");
const socketIo = require("socket.io");
const { execSync } = require("child_process");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// REST API endpoint to execute commands
app.post("/api/execute", (req, res) => {
  const { command } = req.body;

  if (!command) {
    return res.status(400).json({ error: "Command is required" });
  }

  try {
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
  console.log("Client connected");

  socket.on("execute-command", (command) => {
    try {
      const output = execSync(command, { encoding: "utf-8" });
      socket.emit("command-output", { output });
    } catch (error) {
      // Only log the error to the backend console
      console.error("Command execution error:", error.message);
      socket.emit("command-error", { error: "Command execution failed" });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
