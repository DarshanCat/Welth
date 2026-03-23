import React from "react";
import ChatBot from "@/components/ChatBot";

const MainLayout = ({ children }) => {
  return (
    // Full-width dark wrapper — no container constraint so bg fills edge to edge
    // pt-16 = exactly the header height (single row now)
    <div
      style={{ background: "#060b17", minHeight: "100vh" }}
      className="pt-16"
    >
      {/* Content container — constrained width with padding */}
      <div className="container mx-auto px-4 md:px-6 pb-12">
        {children}
      </div>
      <ChatBot />
    </div>
  );
};

export default MainLayout;