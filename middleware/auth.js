/**
 * Middleware de autenticación con JWT
 */

const jwt = require('jsonwebtoken');
const config = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Middleware para validar JWT y registrar IP
 */
const verifyToken = (req, res, next) => {
  try {
    // Generar ID de solicitud para trazabilidad
    req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Obtener IP del cliente
    req.clientIp = req.headers['x-forwarded-for'] || 
                   req.socket.remoteAddress || 
                   req.connection.remoteAddress ||
                   '0.0.0.0';
    
    // Limpiar múltiples IPs
    if (req.clientIp.includes(',')) {
      req.clientIp = req.clientIp.split(',')[0].trim();
    }

    // Obtener token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      logger.authFailed('Token no proporcionado', req.clientIp, req.requestId);
      return res.status(401).json({
        success: false,
        error: 'Token no proporcionado',
        code: 'MISSING_TOKEN',
        requestId: req.requestId
      });
    }

    // Verificar formato: Bearer TOKEN
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      logger.authFailed('Formato de token inválido', req.clientIp, req.requestId);
      return res.status(401).json({
        success: false,
        error: 'Formato de token inválido. Use: Bearer TOKEN',
        code: 'INVALID_TOKEN_FORMAT',
        requestId: req.requestId
      });
    }

    const token = parts[1];

    // Verificar y decodificar JWT
    const decoded = jwt.verify(token, config.JWT.SECRET);
    
    // Adjuntar información del usuario al request
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      permissions: decoded.permissions || []
    };

    // Registrar autenticación exitosa
    logger.authSuccess(req.user.username, req.clientIp, req.requestId);

    next();

  } catch (error) {
    // Manejar diferentes tipos de errores JWT
    let errorCode = 'INVALID_TOKEN';
    let statusCode = 403;
    let message = 'Token inválido';

    if (error.name === 'TokenExpiredError') {
      errorCode = 'TOKEN_EXPIRED';
      statusCode = 401;
      message = 'Token expirado';
      logger.authFailed('Token expirado', req.clientIp, req.requestId);
    } else if (error.name === 'JsonWebTokenError') {
      logger.authFailed(`Token inválido: ${error.message}`, req.clientIp, req.requestId);
    } else {
      logger.authFailed('Error desconocido en autenticación', req.clientIp, req.requestId);
    }

    return res.status(statusCode).json({
      success: false,
      error: message,
      code: errorCode,
      requestId: req.requestId
    });
  }
};

/**
 * Middleware para validar permisos de usuario
 */
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado',
        code: 'NOT_AUTHENTICATED',
        requestId: req.requestId
      });
    }

    if (req.user.role === 'admin') {
      // Admin tiene acceso a todo
      return next();
    }

    if (!req.user.permissions || !req.user.permissions.includes(requiredPermission)) {
      logger.warn('Acceso denegado por permisos insuficientes',
        { requiredPermission, userRole: req.user.role },
        { userId: req.user.id, clientIp: req.clientIp, requestId: req.requestId }
      );

      return res.status(403).json({
        success: false,
        error: 'Permisos insuficientes',
        code: 'INSUFFICIENT_PERMISSIONS',
        requestId: req.requestId
      });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  checkPermission
};
