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

const Terminal = () => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);

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
    xtermRef.current.write("\r\n$ ");

    // Sample handler for user input
    xtermRef.current.onKey(({ key, domEvent }) => {
      const printable =
        !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

      if (domEvent.keyCode === 13) {
        // Enter key
        const line = xtermRef.current._core.buffer.active
          .getLine(xtermRef.current._core.buffer.active.cursorY)
          .translateToString();

        const command = line.substring(line.lastIndexOf("$") + 1).trim();

        // Process the command
        if (command === "clear") {
          xtermRef.current.clear();
        } else if (command === "help") {
          xtermRef.current.writeln("");
          xtermRef.current.writeln("Available commands:");
          xtermRef.current.writeln("  help    - Show this help message");
          xtermRef.current.writeln("  clear   - Clear the terminal");
          xtermRef.current.writeln("  date    - Show current date and time");
        } else if (command === "date") {
          xtermRef.current.writeln("");
          xtermRef.current.writeln(new Date().toString());
        } else if (command !== "") {
          xtermRef.current.writeln("");
          xtermRef.current.writeln(`Command not found: ${command}`);
        }

        xtermRef.current.writeln("");
        xtermRef.current.write("$ ");
      } else if (domEvent.keyCode === 8) {
        // Backspace
        // Do not delete the prompt
        if (xtermRef.current._core.buffer.active.cursorX > 2) {
          xtermRef.current.write("\b \b");
        }
      } else if (printable) {
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
  }, []);

  return <TerminalContainer ref={terminalRef} />;
};

export default Terminal;
