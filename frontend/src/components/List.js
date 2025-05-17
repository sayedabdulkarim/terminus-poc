import React from "react";
import styled from "styled-components";

const ListContainer = styled.div`
  height: 100%;
  width: 100%;
  overflow-y: auto;
  background-color: #f5f5f5;
  padding: 16px;
  display: flex;
  flex-direction: column;
`;

const ListHeader = styled.div`
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e0e0e0;
`;

const ListItem = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 8px;

  &:hover {
    background-color: #eeeeee;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const ItemTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #333;
`;

const ItemDescription = styled.p`
  margin: 0;
  font-size: 14px;
  color: #666;
`;

const ResultContainer = styled.div`
  margin-top: 10px;
  padding: 10px;
  background-color: ${(props) => (props.isError ? "#ffebee" : "#e8f5e9")};
  border-radius: 4px;
  border-left: 4px solid ${(props) => (props.isError ? "#f44336" : "#4caf50")};
`;

const ResultTitle = styled.div`
  font-weight: bold;
  margin-bottom: 5px;
`;

const ResultContent = styled.pre`
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
  background-color: ${(props) =>
    props.isError ? "rgba(244, 67, 54, 0.1)" : "rgba(76, 175, 80, 0.1)"};
  padding: 8px;
  border-radius: 2px;
`;

const CommandSection = styled.div`
  margin-bottom: 20px;
`;

const Timestamp = styled.div`
  font-size: 12px;
  color: #888;
  margin-top: 5px;
  text-align: right;
`;

// Sample data for the list
const sampleListItems = [
  {
    id: 1,
    title: "Terminal Command: ls",
    description: "List directory contents",
  },
  {
    id: 2,
    title: "Terminal Command: cd",
    description: "Change the current directory",
  },
  {
    id: 3,
    title: "Terminal Command: mkdir",
    description: "Create a new directory",
  },
  {
    id: 4,
    title: "Terminal Command: touch",
    description: "Create a new file",
  },
  {
    id: 5,
    title: "Terminal Command: rm",
    description: "Remove files or directories",
  },
  {
    id: 6,
    title: "Terminal Command: cp",
    description: "Copy files or directories",
  },
  {
    id: 7,
    title: "Terminal Command: mv",
    description: "Move or rename files or directories",
  },
  {
    id: 8,
    title: "Terminal Command: cat",
    description: "Display file contents",
  },
  {
    id: 9,
    title: "Terminal Command: grep",
    description: "Search for patterns in files",
  },
  {
    id: 10,
    title: "Terminal Command: find",
    description: "Search for files in a directory hierarchy",
  },
  {
    id: 11,
    title: "Terminal Command: chmod",
    description: "Change file permissions",
  },
  {
    id: 12,
    title: "Terminal Command: chown",
    description: "Change file owner and group",
  },
];

const List = ({ onItemClick, commandResults = [], error = null }) => {
  return (
    <ListContainer>
      {commandResults.length > 0 && (
        <CommandSection>
          <ListHeader>Command Execution Results</ListHeader>
          {commandResults.map((result) => (
            <ResultContainer key={result.id} isError={!!result.error}>
              <ResultTitle>$ {result.command}</ResultTitle>
              {result.error ? (
                <ResultContent isError={true}>
                  Error: {result.error}
                </ResultContent>
              ) : (
                <>
                  {result.result.success ? (
                    <ResultContent>
                      {result.result.stdout ||
                        "Command executed successfully with no output."}
                    </ResultContent>
                  ) : (
                    <ResultContent isError={true}>
                      Exit Code: {result.result.exitCode}
                      {result.result.stderr && `\n${result.result.stderr}`}
                    </ResultContent>
                  )}
                </>
              )}
              <Timestamp>{result.timestamp}</Timestamp>
            </ResultContainer>
          ))}
        </CommandSection>
      )}

      <ListHeader>Available Commands</ListHeader>
      {sampleListItems.map((item) => (
        <ListItem
          key={item.id}
          onClick={() => onItemClick && onItemClick(item)}
        >
          <ItemTitle>{item.title}</ItemTitle>
          <ItemDescription>{item.description}</ItemDescription>
        </ListItem>
      ))}
    </ListContainer>
  );
};

export default List;
