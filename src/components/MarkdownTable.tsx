
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
  [key: string]: any; // Allow additional props
}

export const MarkdownTable = ({ children, className, ...props }: MarkdownTableProps) => {
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
      <Table className={cn("financial-table", className)} {...props}>
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
  [key: string]: any; // Allow additional props
}

export const MarkdownTableRow = ({ children, isHeader, className, ...props }: MarkdownTableRowProps) => {
  return (
    <TableRow className={cn(isHeader ? "bg-muted" : undefined, className)} {...props}>
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
