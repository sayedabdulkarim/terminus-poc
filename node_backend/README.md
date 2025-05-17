# Node.js Shell Command Executor

A robust utility for executing shell commands in Node.js using `child_process.spawn`, designed to:

1. Run any shell command, including built-ins like `cd` or `node --version`
2. Log stdout and stderr separately
3. Log exit codes
4. Clearly indicate command success or failure

## Key Features

- Uses `sh -c` to support shell built-ins and environment variables
- Provides detailed command execution logs
- Returns comprehensive results via Promises
- Supports environment variable injection
- Silent mode for background operations
- Proper error handling

## Installation

```bash
npm install --save shell-command-executor
```

## Basic Usage

```javascript
const executeShellCommand = require("./shell-command-executor");

// Simple example
executeShellCommand('echo "Hello World"')
  .then((result) => {
    console.log("Command succeeded:", result.success);
    console.log("Output:", result.stdout);
  })
  .catch((err) => {
    console.error("Error:", err);
  });

// Async/await example
async function runCommands() {
  // Running shell built-ins
  const cdResult = await executeShellCommand("cd /tmp && pwd");
  console.log("Current directory:", cdResult.stdout.trim());

  // Using environment variables
  const envResult = await executeShellCommand(
    "echo $USER is using Node.js version: $(node --version)"
  );
  console.log("Environment info:", envResult.stdout.trim());

  // Silent mode (no console logs)
  const silentResult = await executeShellCommand("ls -la", { silent: true });
  // Process the result without console output
}
```

## Advanced Usage

```javascript
// Set custom environment variables
const result = await executeShellCommand("echo $GREETING, $NAME!", {
  env: {
    GREETING: "Hello",
    NAME: "World",
  },
});

// Handle command failure
const result = await executeShellCommand("non-existent-command");
if (!result.success) {
  console.error(`Command failed with exit code ${result.exitCode}`);
  console.error(`Error: ${result.stderr}`);
}

// Chain multiple commands
const result = await executeShellCommand(
  'mkdir -p ./temp && cd ./temp && echo "Hello" > test.txt && cat test.txt'
);
```

## Response Object

The function returns a Promise that resolves to an object with these properties:

- `command`: The original command that was executed
- `stdout`: Standard output as a string
- `stderr`: Standard error as a string
- `exitCode`: The numeric exit code (0 = success)
- `success`: Boolean indicating if the command succeeded (exit code 0)

## Practical Applications

- Running git commands from a Node.js application
- Managing file systems operations
- Executing build and deployment processes
- System health monitoring
- Database backup and restoration
- Runtime environment validation

See `usage-example.js` for more comprehensive examples.

## Implementation Details

The executor uses Node.js `child_process.spawn` with the following configuration:

- Uses `sh -c` syntax to ensure full shell compatibility
- Sets up proper event handlers for process output and completion
- Formats console output for readability with color-coded logs
- Implements proper error handling for process spawn failures

## License

MIT
