/**
 * shell-command-executor.test.js
 *
 * Unit tests for the shell command executor module
 * @jest-environment node
 */

// Import the module to test
const executeShellCommand = require("./shell-command-executor");

// We need to mock the child_process module
jest.mock("child_process", () => {
  // Create mock objects with the same structure as the real ones
  const mockEventEmitter = function () {
    this.listeners = {};

    this.on = jest.fn((event, callback) => {
      this.listeners[event] = callback;
      return this;
    });

    this.emit = function (event, ...args) {
      if (this.listeners[event]) {
        this.listeners[event](...args);
      }
    };
  };

  // Mock stdout and stderr streams
  const mockStream = function () {
    mockEventEmitter.call(this);
  };
  mockStream.prototype = Object.create(mockEventEmitter.prototype);

  // Create a mock spawn function
  const mockSpawn = jest.fn((command, args, options) => {
    const process = {
      stdout: new mockStream(),
      stderr: new mockStream(),
      on: jest.fn((event, callback) => {
        process.listeners = process.listeners || {};
        process.listeners[event] = callback;
        return process;
      }),
      emit: function (event, ...args) {
        if (process.listeners && process.listeners[event]) {
          process.listeners[event](...args);
        }
      },
    };

    // Store the command for assertions
    mockSpawn.mockProcess = process;
    mockSpawn.mockCommand = command;
    mockSpawn.mockArgs = args;
    mockSpawn.mockOptions = options;

    return process;
  });

  return { spawn: mockSpawn };
});

// Import child_process to access the mock
const { spawn } = require("child_process");

// Spy on console.log and console.error
beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.clearAllMocks();
  console.log.mockRestore();
  console.error.mockRestore();
});

describe("Shell Command Executor", () => {
  describe("Basic functionality", () => {
    test("should execute a command with sh -c", async () => {
      // Arrange
      const command = 'echo "Hello World"';
      const expectedExitCode = 0;

      // Act
      const promise = executeShellCommand(command);

      // Simulate successful command execution
      spawn.mockProcess.stdout.emit("data", Buffer.from("Hello World\n"));
      spawn.mockProcess.emit("close", expectedExitCode);

      const result = await promise;

      // Assert
      expect(spawn).toHaveBeenCalledWith(
        "sh",
        ["-c", command],
        expect.any(Object)
      );
      expect(result).toEqual({
        command,
        stdout: "Hello World\n",
        stderr: "",
        exitCode: expectedExitCode,
        success: true,
      });
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Command executed successfully")
      );
    });

    test("should handle command execution errors", async () => {
      // Arrange
      const command = "invalid-command";
      const expectedExitCode = 127; // Command not found
      const errorMessage = "command not found: invalid-command";

      // Act
      const promise = executeShellCommand(command);

      // Simulate command execution with error
      spawn.mockProcess.stderr.emit("data", Buffer.from(errorMessage));
      spawn.mockProcess.emit("close", expectedExitCode);

      const result = await promise;

      // Assert
      expect(spawn).toHaveBeenCalledWith(
        "sh",
        ["-c", command],
        expect.any(Object)
      );
      expect(result).toEqual({
        command,
        stdout: "",
        stderr: errorMessage,
        exitCode: expectedExitCode,
        success: false,
      });
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Command execution failed")
      );
    });

    test("should handle process spawn errors", async () => {
      // Arrange
      const command = "some-command";
      const errorMessage = "Error spawning process";

      // Act
      const promise = executeShellCommand(command);

      // Simulate an error in spawning the process
      spawn.mockProcess.emit("error", new Error(errorMessage));

      const result = await promise;

      // Assert
      expect(result).toEqual({
        command,
        stdout: "",
        stderr: errorMessage,
        exitCode: 1,
        success: false,
      });
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to start command")
      );
    });
  });

  describe("Silent mode", () => {
    test("should not log output in silent mode", async () => {
      // Arrange
      const command = 'echo "Silent output"';

      // Act
      const promise = executeShellCommand(command, { silent: true });

      // Simulate command execution
      spawn.mockProcess.stdout.emit("data", Buffer.from("Silent output\n"));
      spawn.mockProcess.emit("close", 0);

      const result = await promise;

      // Assert
      expect(result.stdout).toBe("Silent output\n");
      expect(result.success).toBe(true);

      // Check that console.log wasn't called with output messages
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining("STDOUT")
      );
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining("Command executed successfully")
      );
    });
  });

  describe("Environment variables", () => {
    test("should pass environment variables to the command", async () => {
      // Arrange
      const command = "echo $CUSTOM_VAR";
      const customEnv = { CUSTOM_VAR: "Custom Value" };

      // Act
      const promise = executeShellCommand(command, { env: customEnv });

      // Simulate command execution
      spawn.mockProcess.stdout.emit("data", Buffer.from("Custom Value\n"));
      spawn.mockProcess.emit("close", 0);

      await promise;

      // Assert
      expect(spawn).toHaveBeenCalledWith("sh", ["-c", command], {
        env: expect.objectContaining(customEnv),
        shell: false,
      });
    });

    test("should merge custom env vars with process.env", async () => {
      // Arrange
      const command = "echo $PATH";
      const customEnv = { CUSTOM_VAR: "Custom Value" };

      // Act
      const promise = executeShellCommand(command, { env: customEnv });

      // Simulate command execution
      spawn.mockProcess.stdout.emit(
        "data",
        Buffer.from("/usr/bin:/usr/local/bin\n")
      );
      spawn.mockProcess.emit("close", 0);

      await promise;

      // Assert
      expect(spawn.mockOptions.env).toEqual({
        ...process.env,
        ...customEnv,
      });
    });
  });

  describe("Complex commands", () => {
    test("should handle commands with pipes", async () => {
      // Arrange
      const command = "ls -la | grep .js";

      // Act
      const promise = executeShellCommand(command);

      // Simulate command execution with piped output
      spawn.mockProcess.stdout.emit(
        "data",
        Buffer.from("file1.js\nfile2.js\n")
      );
      spawn.mockProcess.emit("close", 0);

      const result = await promise;

      // Assert
      expect(spawn).toHaveBeenCalledWith(
        "sh",
        ["-c", command],
        expect.any(Object)
      );
      expect(result.stdout).toBe("file1.js\nfile2.js\n");
      expect(result.success).toBe(true);
    });

    test("should handle commands with multiple statements", async () => {
      // Arrange
      const command = 'cd /tmp && echo "Current dir" && ls -la';

      // Act
      const promise = executeShellCommand(command);

      // Simulate command execution with multiple statements
      spawn.mockProcess.stdout.emit(
        "data",
        Buffer.from("Current dir\nfile1\nfile2\n")
      );
      spawn.mockProcess.emit("close", 0);

      const result = await promise;

      // Assert
      expect(spawn).toHaveBeenCalledWith(
        "sh",
        ["-c", command],
        expect.any(Object)
      );
      expect(result.stdout).toBe("Current dir\nfile1\nfile2\n");
      expect(result.success).toBe(true);
    });

    test("should handle commands with environment variables and quotes", async () => {
      // Arrange
      const command = 'USER="John Doe" && echo "Hello $USER"';

      // Act
      const promise = executeShellCommand(command);

      // Simulate command execution with environment variables
      spawn.mockProcess.stdout.emit("data", Buffer.from("Hello John Doe\n"));
      spawn.mockProcess.emit("close", 0);

      const result = await promise;

      // Assert
      expect(spawn).toHaveBeenCalledWith(
        "sh",
        ["-c", command],
        expect.any(Object)
      );
      expect(result.stdout).toBe("Hello John Doe\n");
      expect(result.success).toBe(true);
    });
  });

  describe("Output collection", () => {
    test("should accumulate multiple chunks of stdout and stderr", async () => {
      // Arrange
      const command = "some-command-with-lots-of-output";

      // Act
      const promise = executeShellCommand(command);

      // Simulate command execution with multiple stdout and stderr chunks
      spawn.mockProcess.stdout.emit("data", Buffer.from("First chunk\n"));
      spawn.mockProcess.stderr.emit("data", Buffer.from("Warning 1\n"));
      spawn.mockProcess.stdout.emit("data", Buffer.from("Second chunk\n"));
      spawn.mockProcess.stderr.emit("data", Buffer.from("Warning 2\n"));
      spawn.mockProcess.emit("close", 0);

      const result = await promise;

      // Assert
      expect(result.stdout).toBe("First chunk\nSecond chunk\n");
      expect(result.stderr).toBe("Warning 1\nWarning 2\n");
      expect(result.success).toBe(true);
    });

    test("should handle binary output correctly", async () => {
      // Arrange
      const command = "cat binary-file";
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]);

      // Act
      const promise = executeShellCommand(command);

      // Simulate binary data output
      spawn.mockProcess.stdout.emit("data", binaryData);
      spawn.mockProcess.emit("close", 0);

      const result = await promise;

      // Assert
      expect(result.stdout).toBe(binaryData.toString());
      expect(result.success).toBe(true);
    });
  });
  describe("Edge cases", () => {
    test("should handle empty command", async () => {
      // Arrange
      const command = "";

      // Act
      const promise = executeShellCommand(command);

      // Simulate command execution
      spawn.mockProcess.emit("close", 0);

      const result = await promise;

      // Assert
      expect(result).toEqual({
        command,
        stdout: "",
        stderr: "",
        exitCode: 0,
        success: true,
      });
    });

    test("should handle commands with special characters", async () => {
      // Arrange
      const command = "echo 'Special chars: !@#$%^&*()'";

      // Act
      const promise = executeShellCommand(command);

      // Simulate command execution
      spawn.mockProcess.stdout.emit(
        "data",
        Buffer.from("Special chars: !@#$%^&*()\n")
      );
      spawn.mockProcess.emit("close", 0);

      const result = await promise;

      // Assert
      expect(result.stdout).toBe("Special chars: !@#$%^&*()\n");
      expect(result.success).toBe(true);
    });

    test("should handle commands with large output", async () => {
      // Arrange
      const command = "yes | head -n 1000";

      // Act
      const promise = executeShellCommand(command);

      // Simulate large output
      const largeOutput = "y\n".repeat(1000);
      spawn.mockProcess.stdout.emit("data", Buffer.from(largeOutput));
      spawn.mockProcess.emit("close", 0);

      const result = await promise;

      // Assert
      expect(result.stdout).toBe(largeOutput);
      expect(result.success).toBe(true);
    });

    test("should handle commands with no stdout or stderr", async () => {
      // Arrange
      const command = "true"; // A command that produces no output

      // Act
      const promise = executeShellCommand(command);

      // Simulate command execution
      spawn.mockProcess.emit("close", 0);

      const result = await promise;

      // Assert
      expect(result).toEqual({
        command,
        stdout: "",
        stderr: "",
        exitCode: 0,
        success: true,
      });
    });

    test("should handle commands that fail without stderr", async () => {
      // Arrange
      const command = "false"; // A command that fails but produces no stderr

      // Act
      const promise = executeShellCommand(command);

      // Simulate command execution
      spawn.mockProcess.emit("close", 1);

      const result = await promise;

      // Assert
      expect(result).toEqual({
        command,
        stdout: "",
        stderr: "",
        exitCode: 1,
        success: false,
      });
    });
  });
});
