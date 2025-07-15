import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";

import { config, validateConfig } from "@/utils/config";
import { logger } from "@/utils/logger";
import { errorHandler, notFoundHandler } from "@/middleware/errorHandler";
import { getHealth, getStatus } from "@/controllers/healthController";
import { GeminiHandler } from "@/socket/geminiHandler";
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "@/types";

class Server {
  private app: express.Application;
  private server: any;
  private io!: SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >;
  private geminiHandler: GeminiHandler;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.setupSocketIO();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.geminiHandler = new GeminiHandler();
    this.setupSocketHandlers();
  }

  private setupSocketIO(): void {
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.SOCKET_CORS_ORIGIN,
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());

    // Compression
    this.app.use(compression());

    // CORS
    this.app.use(
      cors({
        origin: config.FRONTEND_URL,
        credentials: true,
      })
    );

    // Body parsing
    this.app.use(express.json({ limit: "50mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "50mb" }));

    // Logging
    if (config.NODE_ENV !== "test") {
      this.app.use(morgan("combined"));
    }
  }

  private setupRoutes(): void {
    // Health check routes
    this.app.get("/health", getHealth);
    this.app.get("/api/status", getStatus);

    // API routes
    this.app.get("/api/v1/health", getHealth);

    // Root route
    this.app.get("/", (req, res) => {
      res.json({
        message: "Gemini Live Backend API",
        version: "1.0.0",
        endpoints: {
          health: "/health",
          status: "/api/status",
          socket: "/socket.io/",
        },
      });
    });
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  private setupSocketHandlers(): void {
    this.io.on("connection", (socket) => {
      this.geminiHandler.handleConnection(socket);
    });
  }

  public start(): void {
    // Validate configuration
    validateConfig();

    this.server.listen(config.PORT, config.HOST, () => {
      logger.info(`🚀 Server running on http://${config.HOST}:${config.PORT}`);
      logger.info(`🔌 Socket.IO server ready`);
      logger.info(`🌍 Environment: ${config.NODE_ENV}`);
      logger.info(`🤖 Gemini Model: ${config.GEMINI_MODEL}`);

      if (
        !config.GEMINI_API_KEY ||
        config.GEMINI_API_KEY === "your_api_key_here"
      ) {
        logger.warn("⚠️  Remember to update GEMINI_API_KEY in .env file!");
      }
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      logger.info("🛑 SIGTERM received, shutting down gracefully");
      this.server.close(() => {
        logger.info("✅ Server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      logger.info("🛑 SIGINT received, shutting down gracefully");
      this.server.close(() => {
        logger.info("✅ Server closed");
        process.exit(0);
      });
    });
  }
}

// Start server
const server = new Server();
server.start();
