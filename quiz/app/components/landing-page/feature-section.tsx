import React from "react";
import { Card } from "../ui/card";

interface FeatureSectionProps {
  imageAlt?: string;
}

const FeatureSection: React.FC<FeatureSectionProps> = ({
  imageAlt = "Dashboard Preview",
}) => {
  return (
    <div className="w-full h-full max-w-4xl mx-auto p-4 relative py-12 mt-36 md:mt-0">
      {/* Background gradient for enhanced glass effect */}
      <div className="absolute  inset-0 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 blur-3xl -z-10" />

      <Card className="overflow-hidden rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg transition-all duration-300 hover:shadow-2xl relative">
        {/* Glassmorphic inner glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/20 to-white/10" />

        {/* Main content */}
        <div className="relative p-3">
          <div className="overflow-hidden rounded-lg bg-gradient-to-b from-white/5 to-transparent">
            <img
              src="/dashboard.png"
              alt={imageAlt}
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default FeatureSection;
