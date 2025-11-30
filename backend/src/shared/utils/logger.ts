import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { configManager } from '../config/config';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

const createLogger = () => {
    const config = configManager.getLogsConfig();

    const transports: winston.transport[] = [
        // Console transport (development)
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.printf(
                    ({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`
                )
            ),
        }),
    ];

    // File transports (production)
    if (process.env.NODE_ENV === 'production') {
        transports.push(
            new DailyRotateFile({
                filename: path.join(logsDir, 'error-%DATE%.log'),
                datePattern: 'YYYY-MM-DD',
                level: 'error',
                maxSize: config.maxFileSize,
                maxFiles: config.maxFiles,
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.json()
                ),
            }),
            new DailyRotateFile({
                filename: path.join(logsDir, 'combined-%DATE%.log'),
                datePattern: 'YYYY-MM-DD',
                maxSize: config.maxFileSize,
                maxFiles: config.maxFiles,
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.json()
                ),
            })
        );
    }

    return winston.createLogger({
        level: config.level,
        transports,
    });
};

export const logger = createLogger();
