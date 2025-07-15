import "./index.css";
import { App } from "./components/App";

console.log("👋 Gemini Live Chat Renderer Started");

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  try {
    new App("app");
    console.log("✅ App initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize app:", error);
  }
});
