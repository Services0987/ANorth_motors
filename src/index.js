import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Diagnostic hook to catch undefined components in production
const originalCreateElement = React.createElement;
React.createElement = function(type, ...args) {
  if (type === undefined) {
    console.error("React.createElement called with undefined type! Props:", args[0]);
    // Try to provide a placeholder so it doesn't crash the entire app
    return originalCreateElement("div", { ...args[0], "data-error": "undefined-component" }, "Error: Undefined Component");
  }
  return originalCreateElement(type, ...args);
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

