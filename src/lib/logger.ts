// Structured logging utility with JSON output
// In development, formats nicely. In production, outputs JSON lines.

interface LogMetadata {
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "audit";
  message: string;
  metadata?: LogMetadata;
}

const isDevelopment = process.env.NODE_ENV === "development";

function formatJsonLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function formatDevelopmentLog(entry: LogEntry): string {
  const timestamp = new Date(entry.timestamp).toLocaleTimeString();
  const level = entry.level.toUpperCase();
  const meta = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : "";
  return `[${timestamp}] ${level}: ${entry.message}${meta}`;
}

function log(level: "info" | "warn" | "error" | "audit", message: string, metadata?: LogMetadata): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(metadata && { metadata }),
  };

  const formatted = isDevelopment ? formatDevelopmentLog(entry) : formatJsonLog(entry);

  if (level === "error") {
    console.error(formatted);
  } else if (level === "warn") {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

export const logger = {
  /**
   * Log general informational messages
   */
  info(message: string, metadata?: LogMetadata): void {
    log("info", message, metadata);
  },

  /**
   * Log warning messages
   */
  warn(message: string, metadata?: LogMetadata): void {
    log("warn", message, metadata);
  },

  /**
   * Log error messages
   */
  error(message: string, metadata?: LogMetadata): void {
    log("error", message, metadata);
  },

  /**
   * Log audit events (user actions)
   * For tracking who did what, when
   */
  audit(
    action: string,
    metadata: {
      userId?: string;
      email?: string;
      [key: string]: any;
    }
  ): void {
    const auditMetadata = {
      action,
      timestamp: new Date().toISOString(),
      ...metadata,
    };
    log("audit", `AUDIT: ${action}`, auditMetadata);
  },
};
