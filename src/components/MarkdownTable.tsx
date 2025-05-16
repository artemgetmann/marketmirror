
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

export interface MarkdownTableProps {
  children: React.ReactNode;
  className?: string;
}

export const MarkdownTable: React.FC<MarkdownTableProps> = ({ children, className }) => {
  // Process the children to find the table data
  const childrenArray = React.Children.toArray(children);
  
  // Extract header and body elements
  const headerRow = childrenArray.find(
    (child) => React.isValidElement(child) && (child as React.ReactElement).props?.node?.parentNode?.tagName === 'THEAD'
  );
  
  const bodyRows = childrenArray.filter(
    (child) => React.isValidElement(child) && (child as React.ReactElement).props?.node?.parentNode?.tagName !== 'THEAD'
  );

  return (
    <div className="overflow-x-auto my-4">
      <Table className={cn("financial-table", className)}>
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

export interface MarkdownTableRowProps {
  children: React.ReactNode;
  isHeader?: boolean;
  className?: string;
}

export const MarkdownTableRow: React.FC<MarkdownTableRowProps> = ({ children, isHeader, className }) => {
  return (
    <TableRow className={cn(isHeader ? "bg-muted" : undefined, className)}>
      {React.Children.map(children, (cell, index) => {
        if (!React.isValidElement(cell)) return null;
        
        // Determine if content is likely numeric for alignment
        const cellText = cell.props?.children?.[0]?.props?.children || "";
        const isNumeric = !isNaN(parseFloat(cellText as string)) && isFinite(cellText as any);
        
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
