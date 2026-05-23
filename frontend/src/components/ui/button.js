import React from "react";

export const Button = ({ children, className = "", ...props }) => (
  <button
    className={`px-4 py-2 rounded bg-emerald-500 text-white ${className}`}
    {...props}
  >
    {children}
  </button>
);