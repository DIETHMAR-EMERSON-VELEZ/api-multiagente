/**
 * Sistema de logging estructurado para la API
 */

const config = require('../config/constants');

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

const LEVEL_PRIORITY = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const getCurrentLevel = () => {
  return LEVEL_PRIORITY[config.LOGGING.LEVEL.toUpperCase()] || LEVEL_PRIORITY.INFO;
};

const formatLog = (level, message, data = {}, context = {}) => {
  const timestamp = new Date().toISOString();
  
  if (config.LOGGING.FORMAT === 'json') {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...data,
      context: {
        userId: context.userId || null,
        clientIp: context.clientIp || null,
        endpoint: context.endpoint || null,
        requestId: context.requestId || null,
        ...context
      }
    });
  }

  // Formato simple para desarrollo
  return `[${timestamp}] [${level}] ${message} ${Object.keys(data).length > 0 ? JSON.stringify(data) : ''}`;
};

const logger = {
  error: (message, data = {}, context = {}) => {
    if (LEVEL_PRIORITY.ERROR <= getCurrentLevel()) {
      console.error(`❌ ${formatLog(LOG_LEVELS.ERROR, message, data, context)}`);
    }
  },

  warn: (message, data = {}, context = {}) => {
    if (LEVEL_PRIORITY.WARN <= getCurrentLevel()) {
      console.warn(`⚠️ ${formatLog(LOG_LEVELS.WARN, message, data, context)}`);
    }
  },

  info: (message, data = {}, context = {}) => {
    if (LEVEL_PRIORITY.INFO <= getCurrentLevel()) {
      console.log(`ℹ️ ${formatLog(LOG_LEVELS.INFO, message, data, context)}`);
    }
  },

  debug: (message, data = {}, context = {}) => {
    if (LEVEL_PRIORITY.DEBUG <= getCurrentLevel()) {
      console.log(`🐛 ${formatLog(LOG_LEVELS.DEBUG, message, data, context)}`);
    }
  },

  // Logs específicos de API
  authSuccess: (username, clientIp, requestId) => {
    logger.info('Autenticación exitosa', 
      { username },
      { clientIp, requestId, endpoint: 'POST /api/v1/auth/login' }
    );
  },

  authFailed: (reason, clientIp, requestId) => {
    logger.warn('Intento de autenticación fallido', 
      { reason },
      { clientIp, requestId, endpoint: 'POST /api/v1/auth/login' }
    );
  },

  apiRequest: (method, endpoint, userId, clientIp, params = {}) => {
    logger.info('Solicitud API', 
      { method, endpoint, params },
      { userId, clientIp, endpoint: `${method} ${endpoint}` }
    );
  },

  apiError: (method, endpoint, error, userId, clientIp) => {
    logger.error('Error en solicitud API',
      { method, endpoint, error: error.message },
      { userId, clientIp, endpoint: `${method} ${endpoint}` }
    );
  },

  databaseQuery: (collection, operation, duration, recordCount = 0) => {
    logger.debug('Consulta Firestore',
      { collection, operation, duration: `${duration}ms`, recordCount }
    );
  }
};

module.exports = logger;
