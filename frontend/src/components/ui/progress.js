import React from "react";

export const Progress = ({ value }) => (
  <div className="w-full bg-gray-200 rounded h-2">
    <div
      className="bg-emerald-500 h-2 rounded"
      style={{ width: `${value}%` }}
    />
  </div>
);