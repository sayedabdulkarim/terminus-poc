import React, { useEffect, useRef } from "react";
import { Terminal as Xterm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import styled from "styled-components";

const TerminalContainer = styled.div`
  height: 100%;
  width: 100%;
  background-color: #1e1e1e;
`;

const Terminal = ({ onExecuteCommand }) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  // Track command input separately from the terminal
  const commandBufferRef = useRef("");

  useEffect(() => {
    // Initialize xterm.js
    xtermRef.current = new Xterm({
      cursorBlink: true,
      fontFamily: "monospace",
      fontSize: 14,
      theme: {
        background: "#1e1e1e",
        foreground: "#f0f0f0",
        cursor: "#ffffff",
      },
    });

    // Initialize fit addon
    fitAddonRef.current = new FitAddon();
    xtermRef.current.loadAddon(fitAddonRef.current);

    // Open the terminal
    xtermRef.current.open(terminalRef.current);
    fitAddonRef.current.fit();

    // Write a welcome message
    xtermRef.current.writeln("Welcome to the terminal!");
    xtermRef.current.writeln('Type "help" to see available commands.');
    xtermRef.current.write("$ ");

    // Sample handler for user input
    xtermRef.current.onKey(({ key, domEvent }) => {
      const printable =
        !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

      if (domEvent.keyCode === 13) {
        // Enter key
        // Get command from our buffer instead of terminal buffer
        const command = commandBufferRef.current.trim();

        // Process the command
        xtermRef.current.writeln(""); // New line after command input

        if (command === "clear") {
          xtermRef.current.clear();
        } else if (command === "help") {
          xtermRef.current.writeln("Available commands:");
          xtermRef.current.writeln("  help    - Show this help message");
          xtermRef.current.writeln("  clear   - Clear the terminal");
          xtermRef.current.writeln("  date    - Show current date and time");
          xtermRef.current.writeln("  Any valid shell command (ls, pwd, etc.)");
        } else if (command === "date") {
          xtermRef.current.writeln(new Date().toString());
        } else if (command !== "") {
          // Execute the command via the API
          if (onExecuteCommand) {
            onExecuteCommand(command);
            xtermRef.current.writeln(`Executing command: ${command}`);
            xtermRef.current.writeln("Check the right panel for results.");
          } else {
            xtermRef.current.writeln(`Command not found: ${command}`);
          }
        }

        // Reset command buffer
        commandBufferRef.current = "";

        // Display prompt for next command
        xtermRef.current.write("$ ");
      } else if (domEvent.keyCode === 8) {
        // Backspace
        // Only delete if there are characters in our buffer
        if (commandBufferRef.current.length > 0) {
          commandBufferRef.current = commandBufferRef.current.slice(0, -1);
          xtermRef.current.write("\b \b");
        }
      } else if (printable) {
        commandBufferRef.current += key;
        xtermRef.current.write(key);
      }
    });

    // Handle window resize
    const handleResize = () => {
      fitAddonRef.current.fit();
    };

    window.addEventListener("resize", handleResize);

    // Clean up
    return () => {
      window.removeEventListener("resize", handleResize);
      if (xtermRef.current) {
        xtermRef.current.dispose();
      }
    };
  }, [onExecuteCommand]);

  return <TerminalContainer ref={terminalRef} />;
};

export default Terminal;
