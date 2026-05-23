import React, { useState } from "react";

export const Tabs = ({ children }) => <div>{children}</div>;
export const TabsList = ({ children }) => <div className="flex gap-2">{children}</div>;
export const TabsTrigger = ({ children, ...props }) => (
  <button className="px-3 py-1 bg-gray-200 rounded" {...props}>
    {children}
  </button>
);
export const TabsContent = ({ children }) => <div className="mt-4">{children}</div>;