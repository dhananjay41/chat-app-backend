import winston from 'winston';

/**
 * Leveled logger using Winston — replaces all direct console.log usage per §4.
 * Levels: error, warn, info, http, debug.
 * In production, only info and above are logged; in development, debug is included.
 */
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'chatapp-server' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${String(timestamp)} [${String(service)}] ${level}: ${String(message)}${metaStr}`;
        }),
      ),
    }),
  ],
});

export default logger;
