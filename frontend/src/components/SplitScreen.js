import React from "react";
import styled from "styled-components";
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
  const handleListItemClick = (item) => {
    console.log("List item clicked:", item);
    // You can add additional functionality here, such as:
    // - Sending the command to the terminal
    // - Showing more details about the command
    // - Etc.
  };

  return (
    <AppContainer>
      <LeftPanel>
        <Terminal />
      </LeftPanel>
      <RightPanel>
        <List onItemClick={handleListItemClick} />
      </RightPanel>
    </AppContainer>
  );
};

export default SplitScreen;
