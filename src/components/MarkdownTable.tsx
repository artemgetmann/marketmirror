
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface MarkdownTableProps {
  children: React.ReactNode;
}

export const MarkdownTable = ({ children }: MarkdownTableProps) => {
  // Process the children to find the table data
  const childrenArray = React.Children.toArray(children);
  
  // Extract header and body elements
  const headerRow = childrenArray.find(
    (child) => React.isValidElement(child) && child.props?.node?.type === 'tableHead'
  );
  
  const bodyRows = childrenArray.filter(
    (child) => React.isValidElement(child) && child.props?.node?.type === 'tableBody'
  );

  return (
    <div className="overflow-x-auto my-4">
      <Table className="financial-table">
        {headerRow && (
          <TableHeader>
            {React.cloneElement(headerRow as React.ReactElement)}
          </TableHeader>
        )}
        <TableBody>
          {bodyRows.map((row, index) => (
            React.cloneElement(row as React.ReactElement, { key: index })
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export const MarkdownTableRow = ({ children, isHeader }: { children: React.ReactNode, isHeader?: boolean }) => {
  return (
    <TableRow className={isHeader ? "bg-muted" : undefined}>
      {React.Children.map(children, (cell, index) => {
        if (!React.isValidElement(cell)) return null;
        
        // Determine if content is likely numeric for alignment
        const cellText = cell.props?.children?.[0]?.props?.children || "";
        const isNumeric = !isNaN(parseFloat(cellText)) && isFinite(cellText as any);
        
        return isHeader ? (
          <TableHead 
            key={index} 
            className={cn("font-semibold", isNumeric ? "text-right" : "text-left")}
          >
            {cell}
          </TableHead>
        ) : (
          <TableCell 
            key={index} 
            className={isNumeric ? "text-right" : "text-left"}
          >
            {cell}
          </TableCell>
        );
      })}
    </TableRow>
  );
};
