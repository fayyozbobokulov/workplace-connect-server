import { Request, Response, NextFunction } from 'express';

/**
 * Extended Request interface to include start time for response time calculation
 */
interface RequestWithStartTime extends Request {
  startTime?: number;
}

/**
 * Get client IP address from request, handling various proxy scenarios
 */
const getClientIP = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'] as string;
  const realIP = req.headers['x-real-ip'] as string;
  const cfConnectingIP = req.headers['cf-connecting-ip'] as string; // Cloudflare
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, get the first one
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback to socket remote address
  return req.socket?.remoteAddress || 
         (req.socket as any)?.socket?.remoteAddress || 
         'unknown';
};

/**
 * Get user agent information
 */
const getUserAgent = (req: Request): string => {
  return req.headers['user-agent'] || 'unknown';
};

/**
 * Get request size in bytes
 */
const getRequestSize = (req: Request): number => {
  const contentLength = req.headers['content-length'];
  return contentLength ? parseInt(contentLength, 10) : 0;
};

/**
 * Format log message with colors for console output
 */
const formatLogMessage = (
  method: string,
  url: string,
  statusCode: number,
  responseTime: number,
  ip: string,
  userAgent: string,
  requestSize: number,
  timestamp: string
): string => {
  // Color codes for different HTTP methods
  const methodColors: { [key: string]: string } = {
    GET: '\x1b[32m',     // Green
    POST: '\x1b[33m',    // Yellow
    PUT: '\x1b[34m',     // Blue
    DELETE: '\x1b[31m',  // Red
    PATCH: '\x1b[35m',   // Magenta
  };

  // Color codes for different status codes
  const getStatusColor = (status: number): string => {
    if (status >= 200 && status < 300) return '\x1b[32m'; // Green
    if (status >= 300 && status < 400) return '\x1b[36m'; // Cyan
    if (status >= 400 && status < 500) return '\x1b[33m'; // Yellow
    if (status >= 500) return '\x1b[31m'; // Red
    return '\x1b[37m'; // White
  };

  const reset = '\x1b[0m';
  const methodColor = methodColors[method] || '\x1b[37m';
  const statusColor = getStatusColor(statusCode);

  return `${timestamp} | ${methodColor}${method.padEnd(6)}${reset} | ${statusColor}${statusCode}${reset} | ${responseTime.toString().padStart(6)}ms | ${ip.padEnd(15)} | ${url} | ${requestSize}B | ${userAgent.substring(0, 50)}${userAgent.length > 50 ? '...' : ''}`;
};

/**
 * Request logging middleware
 * Logs comprehensive information about each HTTP request
 */
export const requestLogger = (req: RequestWithStartTime, res: Response, next: NextFunction): void => {
  // Record start time
  req.startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Get request information
  const method = req.method;
  const url = req.originalUrl || req.url;
  const ip = getClientIP(req);
  const userAgent = getUserAgent(req);
  const requestSize = getRequestSize(req);
  const referer = req.headers.referer || '-';
  const authorization = req.headers.authorization ? 'Bearer ***' : '-';

  // Log request start (optional - can be disabled for less verbose logging)
  if (process.env.LOG_REQUESTS_START === 'true') {
    console.log(`📥 ${timestamp} | ${method} ${url} | IP: ${ip} | UA: ${userAgent.substring(0, 30)}...`);
  }

  // Override res.end to capture response information
  const originalEnd = res.end;
  res.end = function(this: Response, chunk?: any, encoding?: any, callback?: any): Response {
    // Calculate response time
    const responseTime = req.startTime ? Date.now() - req.startTime : 0;
    const statusCode = res.statusCode;

    // Log the complete request information
    const logMessage = formatLogMessage(
      method,
      url,
      statusCode,
      responseTime,
      ip,
      userAgent,
      requestSize,
      timestamp
    );

    console.log(logMessage);

    // Log additional details for errors or if detailed logging is enabled
    if (statusCode >= 400 || process.env.LOG_DETAILED === 'true') {
      console.log(`  📋 Details: Referer: ${referer} | Auth: ${authorization} | Content-Type: ${req.headers['content-type'] || '-'}`);
      
      if (statusCode >= 500) {
        console.log(`  🚨 Server Error: ${method} ${url} from ${ip}`);
      }
    }

    // Call original end method and return its result
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
};

/**
 * Error logging middleware
 * Logs detailed error information
 */
export const errorLogger = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  const timestamp = new Date().toISOString();
  const ip = getClientIP(req);
  const method = req.method;
  const url = req.originalUrl || req.url;
  const userAgent = getUserAgent(req);

  console.error(`🔥 ${timestamp} | ERROR | ${method} ${url} | IP: ${ip}`);
  console.error(`  📋 User-Agent: ${userAgent}`);
  console.error(`  💥 Error: ${error.message}`);
  console.error(`  📚 Stack: ${error.stack}`);

  next(error);
};

/**
 * Security logging middleware
 * Logs potential security concerns
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction): void => {
  const ip = getClientIP(req);
  const userAgent = getUserAgent(req);
  const timestamp = new Date().toISOString();

  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\./,           // Directory traversal
    /script/i,        // Potential XSS
    /union.*select/i, // SQL injection
    /drop.*table/i,   // SQL injection
  ];

  const url = req.originalUrl || req.url;
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(url));

  if (isSuspicious) {
    console.warn(`🛡️  ${timestamp} | SECURITY | Suspicious request from ${ip}: ${req.method} ${url}`);
    console.warn(`  📋 User-Agent: ${userAgent}`);
  }

  // Log failed authentication attempts
  if (req.path.includes('/auth/') && req.method === 'POST') {
    res.on('finish', () => {
      if (res.statusCode === 401) {
        console.warn(`🔐 ${timestamp} | AUTH FAILED | ${ip} | ${userAgent.substring(0, 50)}`);
      }
    });
  }

  next();
};

export default requestLogger;
