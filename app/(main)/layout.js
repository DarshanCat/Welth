import React from "react";
import ChatBot from "@/components/ChatBot";

const MainLayout = ({ children }) => {
  return (
    <div
      style={{ background: "#060b17", minHeight: "100vh" }}
      className="pt-16"
    >
      <div className="container mx-auto px-4 md:px-6 pb-12">
        {children}
      </div>
      <ChatBot />
    </div>
  );
};

export default MainLayout;