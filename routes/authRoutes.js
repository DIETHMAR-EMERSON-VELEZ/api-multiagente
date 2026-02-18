/**
 * Rutas de autenticación
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const config = require('../config/constants');
const logger = require('../utils/logger');
const { verifyToken } = require('../middleware/auth');

/**
 * LOGIN - Obtener JWT token para acceso a la API
 * POST /api/v1/auth/login
 * Body: { username: string, password: string }
 */
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    // Generar ID de solicitud
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                     req.socket.remoteAddress ||
                     '0.0.0.0';

    // Validar que lleguen credenciales
    if (!username || !password) {
      logger.authFailed('Credenciales faltantes', clientIp, requestId);
      return res.status(400).json({
        success: false,
        error: 'Usuario y contraseña son requeridos',
        code: 'MISSING_CREDENTIALS',
        requestId
      });
    }

    // ============================================
    // IMPORTANTE: En producción, validar contra BD
    // ============================================
    // Aquí deberías:
    // 1. Buscar usuario en Firestore collection "usuarios"
    // 2. Verificar contraseña (hashed con bcrypt)
    // 3. Validar que esté activo
    // 4. Obtener sus permisos

    // Por ahora, ejemplo simplificado para testing
    const validUsers = {
      'central_audit': {
        password: 'admin123',
        role: 'auditor',
        permissions: ['read:transactions', 'read:summary', 'read:cash_movements', 'read:closures', 'read:adjustments']
      },
      'supervisor_1': {
        password: 'pass123',
        role: 'supervisor',
        permissions: ['read:transactions', 'read:summary', 'read:closures']
      }
    };

    // Buscar usuario
    const user = validUsers[username];

    if (!user) {
      logger.authFailed(`Usuario no encontrado: ${username}`, clientIp, requestId);
      // No revelar si el usuario existe o no (por seguridad)
      return res.status(401).json({
        success: false,
        error: 'Usuario o contraseña inválidos',
        code: 'INVALID_CREDENTIALS',
        requestId
      });
    }

    // Verificar contraseña
    if (user.password !== password) {
      logger.authFailed(`Contraseña incorrecta para: ${username}`, clientIp, requestId);
      return res.status(401).json({
        success: false,
        error: 'Usuario o contraseña inválidos',
        code: 'INVALID_CREDENTIALS',
        requestId
      });
    }

    // Generar JWT
    const token = jwt.sign(
      {
        id: username,
        username: username,
        role: user.role,
        permissions: user.permissions,
        iat: Math.floor(Date.now() / 1000)
      },
      config.JWT.SECRET,
      { expiresIn: config.JWT.EXPIRATION }
    );

    // Registrar login exitoso
    logger.authSuccess(username, clientIp, requestId);

    return res.json({
      success: true,
      token: token,
      token_type: 'Bearer',
      expires_in: config.JWT.EXPIRATION,
      user: {
        id: username,
        username: username,
        role: user.role
      },
      requestId
    });

  } catch (error) {
    logger.error('Error en endpoint de login', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Error interno en servidor',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * VALIDATE TOKEN - Validar si un token es válido
 * POST /api/v1/auth/validate-token
 * Header: Authorization: Bearer TOKEN
 */
router.post('/validate-token', verifyToken, (req, res) => {
  return res.json({
    success: true,
    message: 'Token válido',
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    },
    client_ip: req.clientIp,
    requestId: req.requestId
  });
});

/**
 * REFRESH TOKEN - Obtener nuevo token antes que expire (opcional)
 * POST /api/v1/auth/refresh-token
 * Header: Authorization: Bearer TOKEN
 */
router.post('/refresh-token', verifyToken, (req, res) => {
  try {
    // Generar nuevo token con misma información
    const newToken = jwt.sign(
      {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role,
        permissions: req.user.permissions
      },
      config.JWT.SECRET,
      { expiresIn: config.JWT.EXPIRATION }
    );

    logger.info('Token renovado',
      { username: req.user.username },
      { userId: req.user.id, clientIp: req.clientIp, requestId: req.requestId }
    );

    return res.json({
      success: true,
      token: newToken,
      token_type: 'Bearer',
      expires_in: config.JWT.EXPIRATION
    });

  } catch (error) {
    logger.error('Error renovando token', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Error renovando token',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;
