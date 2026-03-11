import React from "react";

const MainLayout = ({ children }) => {
  return (
    // pt-20 = clears the fixed header; ChatBot uses fixed positioning so it
    // must NOT be inside a transformed/overflow-hidden ancestor
    <div className="container mx-auto pt-24 pb-10">
      {children}
    </div>
  );
};

export default MainLayout;