/**
 * Rutas de la API REST para la Central Gerencial
 * Todas son READ ONLY (GET) para auditoría
 */

const express = require('express');
const router = express.Router();

const { verifyToken, checkPermission } = require('../middleware/auth');
const financialController = require('../controllers/financialController');

/**
 * TRANSACCIONES - Obtener todas las transacciones en un rango de fechas
 * GET /api/v1/agent/transactions?from=2026-02-01&to=2026-02-28&page=1&size=50
 */
router.get('/agent/transactions', 
  verifyToken,
  checkPermission('read:transactions'),
  financialController.getTransactions
);

/**
 * RESUMEN DIARIO - Consolidación de movimientos por usuario de caja
 * GET /api/v1/agent/daily-summary?date=2026-02-18
 */
router.get('/agent/daily-summary',
  verifyToken,
  checkPermission('read:summary'),
  financialController.getDailySummary
);

/**
 * MOVIMIENTOS DE CAJA - Aperturas, cierres, retiros, ingresos
 * GET /api/v1/agent/cash-movements?from=2026-02-01&to=2026-02-28&page=1&size=50
 */
router.get('/agent/cash-movements',
  verifyToken,
  checkPermission('read:cash_movements'),
  financialController.getCashMovements
);

/**
 * CIERRES DE CAJA - Balances y detección de descuadres
 * GET /api/v1/agent/closures?from=2026-02-01&to=2026-02-28&page=1&size=50
 */
router.get('/agent/closures',
  verifyToken,
  checkPermission('read:closures'),
  financialController.getClosures
);

/**
 * AJUSTES MANUALES - Ajustes de saldo realizados
 * GET /api/v1/agent/manual-adjustments?from=2026-02-01&to=2026-02-28&page=1&size=50
 */
router.get('/agent/manual-adjustments',
  verifyToken,
  checkPermission('read:adjustments'),
  financialController.getManualAdjustments
);

module.exports = router;
