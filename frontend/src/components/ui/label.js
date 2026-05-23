import React from "react";

export const Label = ({ children, ...props }) => (
  <label className="block mb-1 font-medium" {...props}>
    {children}
  </label>
);