
import React from "react";
import { Separator } from "@/components/ui/separator";

interface AnalysisSectionProps {
  title: string;
  content: React.ReactNode;
}

export const AnalysisSection: React.FC<AnalysisSectionProps> = ({ title, content }) => {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-medium">{title}</h2>
      <Separator className="bg-gray-100" />
      <div className="py-4">
        <style jsx="true">{`
          .analysis-content table {
            width: 100%;
            margin: 1.5rem 0;
            border-collapse: collapse;
          }
          .analysis-content th, .analysis-content td {
            padding: 0.5rem 0.75rem;
            text-align: left;
          }
          .analysis-content th {
            background-color: #f9fafb;
            font-weight: 600;
            border-bottom: 1px solid #e5e7eb;
          }
          .analysis-content td {
            border-bottom: 1px solid #f3f4f6;
          }
        `}</style>
        {content}
      </div>
    </section>
  );
};
