/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import "./index.css";
import { socketService } from "./socketService";
import { store } from "./store";
import { Message, ConnectionState } from "./types";

console.log("👋 Gemini Live Chat Renderer Started");

class ChatApp {
  private messageInput: HTMLInputElement;
  private sendButton: HTMLButtonElement;
  private chatMessages: HTMLElement;
  private statusIndicator: HTMLElement;
  private statusText: HTMLElement;

  constructor() {
    this.messageInput = document.getElementById(
      "message-input"
    ) as HTMLInputElement;
    this.sendButton = document.getElementById(
      "send-button"
    ) as HTMLButtonElement;
    this.chatMessages = document.getElementById("chat-messages") as HTMLElement;
    this.statusIndicator = document.getElementById(
      "status-indicator"
    ) as HTMLElement;
    this.statusText = document.getElementById("status-text") as HTMLElement;

    this.init();
  }

  private init() {
    console.log("🔍 ChatApp initializing...");

    // Setup event listeners
    this.setupEventListeners();

    // Setup store subscriptions
    this.setupStoreSubscriptions();

    // Setup socket subscriptions
    this.setupSocketSubscriptions();

    // Connect to server
    socketService.connect();
  }

  private setupEventListeners() {
    // Send button click
    this.sendButton.addEventListener("click", () => {
      this.sendMessage();
    });

    // Enter key in input
    this.messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }

  private setupStoreSubscriptions() {
    // Listen for messages changes
    store.onMessagesChanged((messages) => {
      console.log("🔍 Messages updated:", messages);
      this.renderMessages(messages);
    });

    // Listen for current AI message changes
    store.onCurrentAiMessageChanged((message) => {
      console.log("🔍 Current AI message updated:", message);
      this.renderCurrentAiMessage(message);
    });

    // Listen for connection state changes
    store.onConnectionStateChanged((state) => {
      console.log("🔍 Connection state updated:", state);
      this.updateConnectionStatus(state);
    });
  }

  private setupSocketSubscriptions() {
    // Connection state changes
    socketService.onConnectionStateChanged((state) => {
      store.updateConnectionState(state);
    });

    // Text chunks from AI
    socketService.onTextChunk((text) => {
      store.updateCurrentAiMessage(text);
    });

    // Turn complete
    socketService.onTurnCompleted(() => {
      store.completeAiMessage();
    });
  }

  private sendMessage() {
    const text = this.messageInput.value.trim();
    if (!text) return;

    console.log("🔍 Sending message:", text);

    // Add to store
    store.addUserMessage(text);

    // Send to server
    socketService.sendMessage(text);

    // Clear input
    this.messageInput.value = "";
  }

  private renderMessages(messages: Message[]) {
    this.chatMessages.innerHTML = "";

    messages.forEach((message) => {
      const messageEl = this.createMessageElement(message);
      this.chatMessages.appendChild(messageEl);
    });

    // Scroll to bottom
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  private renderCurrentAiMessage(text: string) {
    // Remove existing current AI message
    const existingCurrent = this.chatMessages.querySelector(
      ".current-ai-message"
    );
    if (existingCurrent) {
      existingCurrent.remove();
    }

    if (text.trim()) {
      const messageEl = this.createCurrentAiMessageElement(text);
      this.chatMessages.appendChild(messageEl);
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
  }

  private createMessageElement(message: Message): HTMLElement {
    const div = document.createElement("div");
    div.className = `flex ${
      message.type === "user" ? "justify-end" : "justify-start"
    }`;

    const messageContent = document.createElement("div");
    messageContent.className = `max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
      message.type === "user"
        ? "bg-blue-600 text-white"
        : "bg-gray-200 text-gray-800"
    }`;
    messageContent.textContent = message.content;

    div.appendChild(messageContent);
    return div;
  }

  private createCurrentAiMessageElement(text: string): HTMLElement {
    const div = document.createElement("div");
    div.className = "flex justify-start current-ai-message";

    const messageContent = document.createElement("div");
    messageContent.className =
      "max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-200 text-gray-800 border-l-4 border-blue-500";
    messageContent.textContent = text;

    div.appendChild(messageContent);
    return div;
  }

  private updateConnectionStatus(state: ConnectionState) {
    if (state.isConnecting) {
      this.statusIndicator.className = "w-3 h-3 rounded-full bg-yellow-500";
      this.statusText.textContent = "Đang kết nối...";
      this.messageInput.disabled = true;
      this.sendButton.disabled = true;
    } else if (state.isConnected) {
      this.statusIndicator.className = "w-3 h-3 rounded-full bg-green-500";
      this.statusText.textContent = "Đã kết nối";
      this.messageInput.disabled = false;
      this.sendButton.disabled = false;
    } else {
      this.statusIndicator.className = "w-3 h-3 rounded-full bg-red-500";
      this.statusText.textContent = state.error || "Mất kết nối";
      this.messageInput.disabled = true;
      this.sendButton.disabled = true;
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new ChatApp();
});
