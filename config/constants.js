/**
 * Configuración y constantes de la API
 */

require('dotenv').config();

const config = {
  // Servidor
  PORT: process.env.PORT || 3003,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // JWT
  JWT: {
    SECRET: process.env.JWT_SECRET,
    EXPIRATION: process.env.JWT_EXPIRATION || '15m',
    REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION || '7d'
  },

  // Firestore
  FIRESTORE: {
    TRANSACTIONS: process.env.FIRESTORE_COLLECTION_TRANSACTIONS || 'operaciones',
    CASH_MOVEMENTS: process.env.FIRESTORE_COLLECTION_CASH_MOVEMENTS || 'movimientos_caja',
    CLOSURES: process.env.FIRESTORE_COLLECTION_CLOSURES || 'cierres_caja',
    ADJUSTMENTS: process.env.FIRESTORE_COLLECTION_ADJUSTMENTS || 'ajustes_manuales',
    USERS: process.env.FIRESTORE_COLLECTION_USERS || 'usuarios'
  },

  // Paginación
  PAGINATION: {
    MAX_PAGE_SIZE: parseInt(process.env.MAX_PAGE_SIZE || '500'),
    DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE || '50'),
    MAX_HISTORICAL_DAYS: parseInt(process.env.MAX_HISTORICAL_DAYS || '365')
  },

  // Logging
  LOGGING: {
    LEVEL: process.env.LOG_LEVEL || 'info',
    FORMAT: process.env.LOG_FORMAT || 'json'
  },

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

  // API Info
  API: {
    VERSION: process.env.API_VERSION || 'v1',
    NAME: process.env.API_NAME || 'Financial Supervision API',
    BASE_PATH: '/api/v1'
  },

  // Tipos de operación válidos
  OPERATION_TYPES: {
    RECHARGE: 'recarga',
    PAYMENT: 'pago',
    WITHDRAWAL: 'retiro',
    DEPOSIT: 'deposito',
    TRANSFER: 'transferencia',
    COMMISSION: 'comision'
  },

  // Tipos de movimiento de caja válidos
  CASH_MOVEMENT_TYPES: {
    OPENING: 'apertura',
    CLOSING: 'cierre',
    WITHDRAWAL: 'retiro',
    INCOME: 'ingreso_manual',
    ADJUSTMENT: 'ajuste'
  },

  // Tipos de ajuste
  ADJUSTMENT_TYPES: {
    CREDIT: 'credito',
    DEBIT: 'debito'
  },

  // Estados de transacción
  TRANSACTION_STATES: {
    COMPLETED: 'completado',
    PENDING: 'pendiente',
    FAILED: 'fallido',
    CANCELLED: 'cancelado',
    REVERSED: 'revertido'
  },

  // Estados de cierre de caja
  CLOSURE_STATES: {
    BALANCED: 'balanceado',
    VARIANCE: 'descuadre',
    PENDING: 'pendiente',
    APPROVED: 'aprobado'
  }
};

// Validar variables críticas en producción (solo advertir, no bloquear arranque)
if (config.NODE_ENV === 'production') {
  if (!config.JWT.SECRET || config.JWT.SECRET.length < 32) {
    console.warn('ADVERTENCIA: JWT_SECRET debe tener al menos 32 caracteres en producción. Usando valor actual.');
  }
}
if (!config.JWT.SECRET) {
  throw new Error('JWT_SECRET es obligatorio');
}

module.exports = config;
