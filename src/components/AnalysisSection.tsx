
import React from "react";
import { Separator } from "@/components/ui/separator";

interface AnalysisSectionProps {
  title: string;
  content: React.ReactNode;
}

export const AnalysisSection: React.FC<AnalysisSectionProps> = ({ title, content }) => {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-medium">{title}</h2>
      <Separator className="bg-gray-100" />
      <div className="py-2">{content}</div>
    </section>
  );
};
