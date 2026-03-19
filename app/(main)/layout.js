import React from "react";
import ChatBot from "@/components/ChatBot";

const MainLayout = ({ children }) => {
  return (
    // pt-20 = clears the fixed header; ChatBot uses fixed positioning so it
    // must NOT be inside a transformed/overflow-hidden ancestor
    <div className="container mx-auto pt-32 pb-10 px-4 md:px-0">
      {children}
      <ChatBot />
    </div>
  );
};

export default MainLayout;