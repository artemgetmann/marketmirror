
import React from "react";
import { Separator } from "@/components/ui/separator";
import ReactMarkdown from "react-markdown";
import { MarkdownTable, MarkdownTableRow } from "./MarkdownTable";

interface AnalysisSectionProps {
  title: string;
  content: React.ReactNode;
}

export const AnalysisSection: React.FC<AnalysisSectionProps> = ({ title, content }) => {
  // If content is a string, we need to parse it as markdown
  const renderContent = () => {
    if (typeof content === "string") {
      return (
        <div className="prose max-w-none">
          <ReactMarkdown
            components={{
              table: ({ node, ...props }) => <MarkdownTable {...props} />,
              thead: ({ node, ...props }) => <>{props.children}</>,
              tbody: ({ node, ...props }) => <>{props.children}</>,
              tr: ({ node, isHeader, ...props }) => (
                <MarkdownTableRow isHeader={Boolean(isHeader)} {...props} />
              ),
              th: ({ node, ...props }) => <>{props.children}</>,
              td: ({ node, ...props }) => <>{props.children}</>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      );
    }
    return content;
  };

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-medium">{title}</h2>
      <Separator className="bg-gray-100" />
      <div className="py-2">{renderContent()}</div>
    </section>
  );
};
