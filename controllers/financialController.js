/**
 * Controlador de lógica financiera
 * Maneja todas las operaciones de lectura para auditoría
 */

const admin = require('firebase-admin');
const config = require('../config/constants');
const logger = require('../utils/logger');
const { 
  validateDateRange, 
  validatePagination, 
  parseDate, 
  parseDateEndOfDay 
} = require('../utils/validators');

// Firestore se obtiene dinámicamente
const getDb = () => admin.firestore();

/**
 * Obtener transacciones con filtros
 */
const getTransactions = async (req, res) => {
  try {
    const { from, to, page, size } = req.query;

    // Validar rango de fechas
    const dateValidation = validateDateRange(from, to);
    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        error: dateValidation.error,
        code: 'INVALID_DATE_RANGE',
        requestId: req.requestId
      });
    }

    // Validar paginación
    const paginationValidation = validatePagination(page, size);
    if (!paginationValidation.valid) {
      return res.status(400).json({
        success: false,
        error: paginationValidation.error,
        code: 'INVALID_PAGINATION',
        requestId: req.requestId
      });
    }

    const { fromDate, toDate } = dateValidation;
    const { page: pageNum, size: pageSize, offset } = paginationValidation;

    // Registrar solicitud
    logger.apiRequest('GET', '/api/v1/agent/transactions', req.user.id, req.clientIp, 
      { from, to, page: pageNum, size: pageSize }
    );

    const startTime = Date.now();

    // Consultar Firestore
    const db = getDb();
    const query = db.collection(config.FIRESTORE.TRANSACTIONS)
      .where('fecha', '>=', fromDate)
      .where('fecha', '<=', toDate)
      .orderBy('fecha', 'desc');

    const snapshot = await query.get();
    const allDocs = snapshot.docs;

    logger.databaseQuery(config.FIRESTORE.TRANSACTIONS, 'where+orderBy', Date.now() - startTime, allDocs.length);

    // Aplicar paginación manualmente
    const paginatedDocs = allDocs.slice(offset, offset + pageSize);

    // Transformar documentos
    const transactions = paginatedDocs.map(doc => {
      const data = doc.data();
      const monto = parseFloat(data.monto) || 0;
      const comision = parseFloat(data.comision) || 0;

      return {
        id_transaccion: doc.id,
        fecha: data.fecha?.toDate?.()?.toISOString() || data.fecha,
        tipo_operacion: data.tipo || 'desconocido',
        monto: monto,
        comision: comision,
        monto_neto: monto - comision,
        usuario_caja: data.usuarioCaja || data.usuario || 'desconocido',
        estado: data.estado || config.TRANSACTION_STATES.COMPLETED,
        referencia_externa: data.referenciaExterna || data.referencia || '',
        created_at: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      };
    });

    const totalRecords = allDocs.length;
    const totalPages = Math.ceil(totalRecords / pageSize);

    logger.info('Transacciones obtenidas exitosamente',
      { count: transactions.length, totalRecords, totalPages },
      { userId: req.user.id, clientIp: req.clientIp, requestId: req.requestId }
    );

    res.json({
      success: true,
      api_version: config.API.VERSION,
      data: transactions,
      pagination: {
        current_page: pageNum,
        page_size: pageSize,
        total_records: totalRecords,
        total_pages: totalPages,
        has_more: pageNum < totalPages
      },
      meta: {
        query_date_range: { from, to },
        query_timestamp: new Date().toISOString(),
        days_in_range: dateValidation.daysDifference
      }
    });

  } catch (error) {
    logger.apiError('GET', '/api/v1/agent/transactions', error, req.user?.id, req.clientIp);
    res.status(500).json({
      success: false,
      error: 'Error al obtener transacciones',
      code: 'DB_ERROR',
      requestId: req.requestId,
      details: config.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtener resumen diario consolidado
 */
const getDailySummary = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro "date" requerido (formato: YYYY-MM-DD)',
        code: 'MISSING_DATE',
        requestId: req.requestId
      });
    }

    // Validar fecha
    const dateValidation = validateDateRange(date, date);
    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        error: dateValidation.error,
        code: 'INVALID_DATE',
        requestId: req.requestId
      });
    }

    const { fromDate } = dateValidation;
    const toDate = new Date(fromDate);
    toDate.setDate(toDate.getDate() + 1);

    logger.apiRequest('GET', '/api/v1/agent/daily-summary', req.user.id, req.clientIp, { date });

    const startTime = Date.now();
    const db = getDb();

    // Obtener todas las transacciones del día
    const snapshot = await db.collection(config.FIRESTORE.TRANSACTIONS)
      .where('fecha', '>=', fromDate)
      .where('fecha', '<', toDate)
      .get();

    logger.databaseQuery(config.FIRESTORE.TRANSACTIONS, 'where', Date.now() - startTime, snapshot.size);

    const summaries = {};

    // Consolidar datos por usuario de caja
    snapshot.forEach(doc => {
      const data = doc.data();
      const usuario = data.usuarioCaja || data.usuario || 'sin_usuario';

      if (!summaries[usuario]) {
        summaries[usuario] = {
          usuario_caja: usuario,
          saldo_inicial: 0,
          total_recargas: 0,
          total_pagos: 0,
          total_retiros: 0,
          total_depositos: 0,
          total_comisiones: 0,
          saldo_teorico: 0,
          saldo_reportado: 0,
          diferencia: 0,
          fecha_cierre: date
        };
      }

      const tipo = (data.tipo || '').toLowerCase();
      const monto = parseFloat(data.monto) || 0;
      const comision = parseFloat(data.comision) || 0;

      // Clasificar por tipo de operación
      if (tipo.includes('recarga')) {
        summaries[usuario].total_recargas += monto;
      } else if (tipo.includes('pago')) {
        summaries[usuario].total_pagos += monto;
      } else if (tipo.includes('retiro')) {
        summaries[usuario].total_retiros += monto;
      } else if (tipo.includes('deposito')) {
        summaries[usuario].total_depositos += monto;
      }

      summaries[usuario].total_comisiones += comision;
    });

    // Convertir a array y calcular saldos teóricos
    const results = Object.values(summaries).map(summary => ({
      ...summary,
      saldo_teorico: summary.total_recargas + summary.total_depositos 
        - summary.total_pagos - summary.total_retiros - summary.total_comisiones,
      total_transacciones: Math.round(
        (summary.total_recargas > 0 ? 1 : 0) +
        (summary.total_pagos > 0 ? 1 : 0) +
        (summary.total_retiros > 0 ? 1 : 0) +
        (summary.total_depositos > 0 ? 1 : 0)
      )
    }));

    logger.info('Resumen diario obtenido',
      { date, usuarios: results.length },
      { userId: req.user.id, clientIp: req.clientIp, requestId: req.requestId }
    );

    res.json({
      success: true,
      api_version: config.API.VERSION,
      date: date,
      data: results,
      meta: {
        total_usuarios_caja: results.length,
        total_recargas: results.reduce((sum, r) => sum + r.total_recargas, 0),
        total_pagos: results.reduce((sum, r) => sum + r.total_pagos, 0),
        total_comisiones: results.reduce((sum, r) => sum + r.total_comisiones, 0),
        query_timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.apiError('GET', '/api/v1/agent/daily-summary', error, req.user?.id, req.clientIp);
    res.status(500).json({
      success: false,
      error: 'Error al obtener resumen diario',
      code: 'DB_ERROR',
      requestId: req.requestId,
      details: config.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtener movimientos de caja
 */
const getCashMovements = async (req, res) => {
  try {
    const { from, to, page, size } = req.query;

    const dateValidation = validateDateRange(from, to);
    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        error: dateValidation.error,
        code: 'INVALID_DATE_RANGE',
        requestId: req.requestId
      });
    }

    const paginationValidation = validatePagination(page, size);
    if (!paginationValidation.valid) {
      return res.status(400).json({
        success: false,
        error: paginationValidation.error,
        code: 'INVALID_PAGINATION',
        requestId: req.requestId
      });
    }

    const { fromDate, toDate } = dateValidation;
    const { page: pageNum, size: pageSize, offset } = paginationValidation;

    logger.apiRequest('GET', '/api/v1/agent/cash-movements', req.user.id, req.clientIp,
      { from, to, page: pageNum, size: pageSize }
    );

    const startTime = Date.now();
    const db = getDb();

    const query = db.collection(config.FIRESTORE.CASH_MOVEMENTS)
      .where('fecha', '>=', fromDate)
      .where('fecha', '<=', toDate)
      .orderBy('fecha', 'desc');

    const snapshot = await query.get();
    const allDocs = snapshot.docs;

    logger.databaseQuery(config.FIRESTORE.CASH_MOVEMENTS, 'where+orderBy', Date.now() - startTime, allDocs.length);

    const paginatedDocs = allDocs.slice(offset, offset + pageSize);

    const movements = paginatedDocs.map(doc => {
      const data = doc.data();
      return {
        id_movimiento: doc.id,
        tipo: data.tipo || 'desconocido',
        monto: parseFloat(data.monto) || 0,
        usuario: data.usuario || 'desconocido',
        fecha: data.fecha?.toDate?.()?.toISOString() || data.fecha,
        observacion: data.observacion || ''
      };
    });

    const totalRecords = allDocs.length;
    const totalPages = Math.ceil(totalRecords / pageSize);

    res.json({
      success: true,
      api_version: config.API.VERSION,
      data: movements,
      pagination: {
        current_page: pageNum,
        page_size: pageSize,
        total_records: totalRecords,
        total_pages: totalPages,
        has_more: pageNum < totalPages
      }
    });

  } catch (error) {
    logger.apiError('GET', '/api/v1/agent/cash-movements', error, req.user?.id, req.clientIp);
    res.status(500).json({
      success: false,
      error: 'Error al obtener movimientos de caja',
      code: 'DB_ERROR',
      requestId: req.requestId,
      details: config.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtener cierres de caja
 */
const getClosures = async (req, res) => {
  try {
    const { from, to, page, size } = req.query;

    const dateValidation = validateDateRange(from, to);
    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        error: dateValidation.error,
        code: 'INVALID_DATE_RANGE',
        requestId: req.requestId
      });
    }

    const paginationValidation = validatePagination(page, size);
    if (!paginationValidation.valid) {
      return res.status(400).json({
        success: false,
        error: paginationValidation.error,
        code: 'INVALID_PAGINATION',
        requestId: req.requestId
      });
    }

    const { fromDate, toDate } = dateValidation;
    const { page: pageNum, size: pageSize, offset } = paginationValidation;

    logger.apiRequest('GET', '/api/v1/agent/closures', req.user.id, req.clientIp,
      { from, to, page: pageNum, size: pageSize }
    );

    const startTime = Date.now();
    const db = getDb();

    const query = db.collection(config.FIRESTORE.CLOSURES)
      .where('fecha', '>=', fromDate)
      .where('fecha', '<=', toDate)
      .orderBy('fecha', 'desc');

    const snapshot = await query.get();
    const allDocs = snapshot.docs;

    logger.databaseQuery(config.FIRESTORE.CLOSURES, 'where+orderBy', Date.now() - startTime, allDocs.length);

    const paginatedDocs = allDocs.slice(offset, offset + pageSize);

    const closures = paginatedDocs.map(doc => {
      const data = doc.data();
      const saldoSistema = parseFloat(data.saldoSistema) || 0;
      const saldoFisico = parseFloat(data.saldoFisico) || 0;
      const diferencia = saldoSistema - saldoFisico;

      return {
        fecha: data.fecha?.toDate?.()?.toISOString() || data.fecha,
        usuario: data.usuario || data.usuarioCaja || 'desconocido',
        saldo_sistema: saldoSistema,
        saldo_fisico: saldoFisico,
        diferencia_detectada: diferencia,
        estado: diferencia === 0 ? config.CLOSURE_STATES.BALANCED : config.CLOSURE_STATES.VARIANCE,
        observaciones: data.observaciones || ''
      };
    });

    const totalRecords = allDocs.length;
    const totalPages = Math.ceil(totalRecords / pageSize);

    const descuadres = closures.filter(c => c.estado === config.CLOSURE_STATES.VARIANCE).length;

    res.json({
      success: true,
      api_version: config.API.VERSION,
      data: closures,
      pagination: {
        current_page: pageNum,
        page_size: pageSize,
        total_records: totalRecords,
        total_pages: totalPages,
        has_more: pageNum < totalPages
      },
      meta: {
        total_cierres: totalRecords,
        cierres_balanceados: totalRecords - descuadres,
        cierres_con_descuadre: descuadres
      }
    });

  } catch (error) {
    logger.apiError('GET', '/api/v1/agent/closures', error, req.user?.id, req.clientIp);
    res.status(500).json({
      success: false,
      error: 'Error al obtener cierres de caja',
      code: 'DB_ERROR',
      requestId: req.requestId,
      details: config.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtener ajustes manuales
 */
const getManualAdjustments = async (req, res) => {
  try {
    const { from, to, page, size } = req.query;

    const dateValidation = validateDateRange(from, to);
    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        error: dateValidation.error,
        code: 'INVALID_DATE_RANGE',
        requestId: req.requestId
      });
    }

    const paginationValidation = validatePagination(page, size);
    if (!paginationValidation.valid) {
      return res.status(400).json({
        success: false,
        error: paginationValidation.error,
        code: 'INVALID_PAGINATION',
        requestId: req.requestId
      });
    }

    const { fromDate, toDate } = dateValidation;
    const { page: pageNum, size: pageSize, offset } = paginationValidation;

    logger.apiRequest('GET', '/api/v1/agent/manual-adjustments', req.user.id, req.clientIp,
      { from, to, page: pageNum, size: pageSize }
    );

    const startTime = Date.now();
    const db = getDb();

    const query = db.collection(config.FIRESTORE.ADJUSTMENTS)
      .where('fecha', '>=', fromDate)
      .where('fecha', '<=', toDate)
      .orderBy('fecha', 'desc');

    const snapshot = await query.get();
    const allDocs = snapshot.docs;

    logger.databaseQuery(config.FIRESTORE.ADJUSTMENTS, 'where+orderBy', Date.now() - startTime, allDocs.length);

    const paginatedDocs = allDocs.slice(offset, offset + pageSize);

    const adjustments = paginatedDocs.map(doc => {
      const data = doc.data();
      const monto = parseFloat(data.monto) || 0;
      const esDebito = data.tipo === config.ADJUSTMENT_TYPES.DEBIT || monto < 0;

      return {
        id_ajuste: doc.id,
        fecha: data.fecha?.toDate?.()?.toISOString() || data.fecha,
        usuario: data.usuario || 'desconocido',
        motivo: data.motivo || '',
        monto: Math.abs(monto),
        tipo: esDebito ? config.ADJUSTMENT_TYPES.DEBIT : config.ADJUSTMENT_TYPES.CREDIT
      };
    });

    const totalRecords = allDocs.length;
    const totalPages = Math.ceil(totalRecords / pageSize);

    const totalCreditos = adjustments.filter(a => a.tipo === 'credito').reduce((s, a) => s + a.monto, 0);
    const totalDebitos = adjustments.filter(a => a.tipo === 'debito').reduce((s, a) => s + a.monto, 0);

    res.json({
      success: true,
      api_version: config.API.VERSION,
      data: adjustments,
      pagination: {
        current_page: pageNum,
        page_size: pageSize,
        total_records: totalRecords,
        total_pages: totalPages,
        has_more: pageNum < totalPages
      },
      meta: {
        total_ajustes: totalRecords,
        total_creditos: totalCreditos,
        total_debitos: totalDebitos,
        neto: totalCreditos - totalDebitos
      }
    });

  } catch (error) {
    logger.apiError('GET', '/api/v1/agent/manual-adjustments', error, req.user?.id, req.clientIp);
    res.status(500).json({
      success: false,
      error: 'Error al obtener ajustes manuales',
      code: 'DB_ERROR',
      requestId: req.requestId,
      details: config.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getTransactions,
  getDailySummary,
  getCashMovements,
  getClosures,
  getManualAdjustments
};
