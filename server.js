/**
 * FINANCIAL SUPERVISION API
 * API REST profesional para Central Gerencial de Supervisión Financiera
 * Solo lectura, auditada, con autenticación JWT
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const admin = require('firebase-admin');

const config = require('./config/constants');
const logger = require('./utils/logger');

// Rutas
const authRoutes = require('./routes/authRoutes');
const financialRoutes = require('./routes/financialApi');

// ====================================
// INICIALIZACIÓN
// ====================================

const app = express();

// Inicializar Firebase Admin (desde archivo o desde variable de entorno en AWS)
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} else {
  serviceAccount = require('./serviceAccountKey.json');
}
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// ====================================
// MIDDLEWARE DE SEGURIDAD
// ====================================

// Helmet - Headers de seguridad
app.use(helmet());

// CORS
app.use(cors({
  origin: config.CORS_ORIGIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ====================================
// MIDDLEWARE DE LOGGING
// ====================================

app.use((req, res, next) => {
  // Generar ID único para la solicitud
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Registrar antes de procesar
  const start = Date.now();
  
  // Interceptar respuesta
  const originalJson = res.json;
  res.json = function(body) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    
    logger.debug(`Respuesta ${statusCode}`, 
      { method: req.method, path: req.path, duration: `${duration}ms` },
      { requestId: req.requestId }
    );
    
    return originalJson.call(this, body);
  };
  
  next();
});

// ====================================
// RUTAS DE LA API
// ====================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    service: config.API.NAME,
    version: config.API.VERSION,
    timestamp: new Date().toISOString()
  });
});

// Autenticación
app.use(`${config.API.BASE_PATH}/auth`, authRoutes);

// API Financiera
app.use(`${config.API.BASE_PATH}`, financialRoutes);

// ====================================
// DOCUMENTACIÓN / INFORMACIÓN
// ====================================

app.get(`${config.API.BASE_PATH}/info`, (req, res) => {
  res.json({
    success: true,
    api: {
      name: config.API.NAME,
      version: config.API.VERSION,
      description: 'API REST de lectura para auditoría financiera y supervisión centralizada',
      type: 'READ ONLY'
    },
    endpoints: {
      auth: {
        login: 'POST /api/v1/auth/login',
        validate: 'POST /api/v1/auth/validate-token',
        refresh: 'POST /api/v1/auth/refresh-token'
      },
      financial: {
        transactions: 'GET /api/v1/agent/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&size=50',
        dailySummary: 'GET /api/v1/agent/daily-summary?date=YYYY-MM-DD',
        cashMovements: 'GET /api/v1/agent/cash-movements?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&size=50',
        closures: 'GET /api/v1/agent/closures?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&size=50',
        adjustments: 'GET /api/v1/agent/manual-adjustments?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&size=50'
      }
    },
    features: [
      'Autenticación JWT con expiración',
      'Registro de IP de todas las consultas',
      'Logs estructurados',
      'Paginación de resultados',
      'Validación completa de parámetros',
      'Respuestas JSON estandarizadas',
      'Solo lectura - sin POST/PUT/DELETE'
    ],
    documentation: 'https://docs.example.com/financial-api'
  });
});

// ====================================
// MANEJO DE ERRORES
// ====================================

// Ruta 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado',
    code: 'NOT_FOUND',
    path: req.path,
    method: req.method,
    requestId: req.requestId
  });
});

// Error global
app.use((err, req, res, next) => {
  const requestId = req.requestId || `err_${Date.now()}`;
  
  logger.error('Error no manejado',
    { error: err.message, stack: err.stack },
    { requestId }
  );

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Error interno del servidor',
    code: err.code || 'INTERNAL_ERROR',
    requestId
  });
});

// ====================================
// INICIAR SERVIDOR
// ====================================

const PORT = config.PORT;

app.listen(PORT, () => {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║       FINANCIAL SUPERVISION API INICIADA               ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  🚀 Puerto: ${PORT}                                        ║`);
  console.log(`║  📍 Entorno: ${config.NODE_ENV}                             ║`);
  console.log(`║  🔐 JWT: ${config.JWT.EXPIRATION}                                   ║`);
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log('║ 📡 ENDPOINTS DISPONIBLES                              ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log('║                                                        ║');
  console.log('║  🔑 AUTENTICACIÓN:                                    ║');
  console.log('║     POST   /api/v1/auth/login                         ║');
  console.log('║     POST   /api/v1/auth/validate-token                ║');
  console.log('║     POST   /api/v1/auth/refresh-token                 ║');
  console.log('║                                                        ║');
  console.log('║  📊 DATOS FINANCIEROS (SOLO LECTURA):                 ║');
  console.log('║     GET    /api/v1/agent/transactions                 ║');
  console.log('║     GET    /api/v1/agent/daily-summary                ║');
  console.log('║     GET    /api/v1/agent/cash-movements               ║');
  console.log('║     GET    /api/v1/agent/closures                     ║');
  console.log('║     GET    /api/v1/agent/manual-adjustments           ║');
  console.log('║                                                        ║');
  console.log('║  ℹ️  INFORMACIÓN:                                      ║');
  console.log('║     GET    /health                                    ║');
  console.log('║     GET    /api/v1/info                               ║');
  console.log('║                                                        ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('\n');

  logger.info('API iniciada correctamente',
    { port: PORT, environment: config.NODE_ENV }
  );
});

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('Excepción no manejada', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesa rechazada no manejada', { reason });
});

module.exports = app;
