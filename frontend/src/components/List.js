import React from "react";
import styled from "styled-components";

const ListContainer = styled.div`
  height: 100%;
  width: 100%;
  overflow-y: auto;
  background-color: #f5f5f5;
  padding: 16px;
`;

const ListItem = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  cursor: pointer;
  transition: background-color 0.2s;

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

const List = ({ onItemClick }) => {
  return (
    <ListContainer>
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
