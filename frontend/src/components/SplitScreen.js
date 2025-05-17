import React, { useState } from "react";
import styled from "styled-components";
import axios from "axios";
import Terminal from "./Terminal";
import List from "./List";

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
`;

const LeftPanel = styled.div`
  flex: 1;
  height: 100%;
  border-right: 1px solid #ccc;
`;

const RightPanel = styled.div`
  flex: 1;
  height: 100%;
  overflow-y: auto;
`;

const SplitScreen = () => {
  const [commandResults, setCommandResults] = useState([]);
  const [error, setError] = useState(null);

  const handleListItemClick = (item) => {
    console.log("List item clicked:", item);
    // Extract command from item title (e.g., "Terminal Command: ls" -> "ls")
    const commandMatch = item.title.match(/Terminal Command: (.+)/);
    if (commandMatch && commandMatch[1]) {
      const command = commandMatch[1];
      executeCommand(command);
    }
  };

  const executeCommand = async (command) => {
    try {
      setError(null);
      const response = await axios.post(
        "http://localhost:5001/api/execute-command",
        {
          command,
        }
      );

      // Add the new result to the beginning of the array
      setCommandResults((prevResults) => [
        {
          id: Date.now(),
          command,
          result: response.data,
          timestamp: new Date().toLocaleString(),
        },
        ...prevResults,
      ]);
    } catch (err) {
      console.error("Error executing command:", err);
      setError(err.message || "Failed to execute command");

      // Add the error to results as well
      setCommandResults((prevResults) => [
        {
          id: Date.now(),
          command,
          error: err.message || "Failed to execute command",
          timestamp: new Date().toLocaleString(),
        },
        ...prevResults,
      ]);
    }
  };

  const handleTerminalCommand = (command) => {
    executeCommand(command);
  };

  return (
    <AppContainer>
      <LeftPanel>
        <Terminal onExecuteCommand={handleTerminalCommand} />
      </LeftPanel>
      <RightPanel>
        <List
          onItemClick={handleListItemClick}
          commandResults={commandResults}
          error={error}
        />
      </RightPanel>
    </AppContainer>
  );
};

export default SplitScreen;
