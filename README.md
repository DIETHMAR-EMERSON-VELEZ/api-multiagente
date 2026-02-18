# Financial Supervision API

**API REST profesional y escalable para Central Gerencial de Supervisión Financiera**

API de **solo lectura** (READ ONLY) diseñada para que la Central Gerencial acceda a datos financieros de forma segura, auditada y con control de acceso.

---

## 📋 Características

✅ **Autenticación JWT** - Tokens con expiración  
✅ **Solo Lectura** - Sin POST/PUT/DELETE  
✅ **Registro de IPs** - Auditoría de quién consulta  
✅ **Logs Estructurados** - JSON para análisis  
✅ **Paginación** - Soporta grandes volúmenes  
✅ **Validaciones Completas** - Parámetros y rangos  
✅ **Respuestas Estandarizadas** - Formato JSON consistente  
✅ **Seguridad** - Headers de seguridad con Helmet  
✅ **Escalable** - Arquitectura profesional por capas  

---

## 🚀 Instalación

### Requisitos
- Node.js >= 14.0.0
- npm >= 6.0.0
- Credenciales de Firebase (serviceAccountKey.json)

### Pasos

1. **Instalar dependencias**:
```bash
npm install
```

2. **Configurar variables de entorno**:
   - Copiar `.env` con tus valores
   - Cambiar `JWT_SECRET` por una clave segura

3. **Verificar Firebase**:
   - Asegurar que `serviceAccountKey.json` esté en la raíz

4. **Iniciar servidor**:
```bash
npm start
```

El servidor estará disponible en `http://localhost:3003`

---

## 🔑 Autenticación

### 1. Obtener Token (Login)

```bash
curl -X POST http://localhost:3003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "central_audit",
    "password": "admin123"
  }'
```

**Respuesta exitosa (200)**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": "15m",
  "user": {
    "id": "central_audit",
    "username": "central_audit",
    "role": "auditor"
  }
}
```

### 2. Usar Token en Solicitudes

Todos los endpoints de datos requieren el header `Authorization`:

```bash
curl -X GET "http://localhost:3003/api/v1/agent/transactions?from=2026-02-01&to=2026-02-28" \
  -H "Authorization: Bearer TOKEN_AQUI"
```

### Usuarios de Prueba

| Usuario | Contraseña | Rol | Acceso |
|---------|-----------|-----|--------|
| central_audit | admin123 | auditor | Todo |
| supervisor_1 | pass123 | supervisor | Transacciones, Resumen, Cierres |

**NOTA**: En producción, validar contra Firestore con contraseñas hasheadas.

---

## 📊 Endpoints Disponibles

### 1. TRANSACCIONES

Obtener todas las transacciones en un rango de fechas.

**Endpoint**:
```
GET /api/v1/agent/transactions
```

**Parámetros**:
- `from` (requerido): Fecha inicio (YYYY-MM-DD)
- `to` (requerido): Fecha fin (YYYY-MM-DD)
- `page` (opcional): Número de página (default: 1)
- `size` (opcional): Registros por página (default: 50, máximo: 500)

**Ejemplo**:
```bash
curl -X GET "http://localhost:3003/api/v1/agent/transactions?from=2026-02-01&to=2026-02-28&page=1&size=50" \
  -H "Authorization: Bearer TOKEN"
```

**Respuesta**:
```json
{
  "success": true,
  "api_version": "v1",
  "data": [
    {
      "id_transaccion": "trans_001",
      "fecha": "2026-02-18T15:30:00.000Z",
      "tipo_operacion": "recarga",
      "monto": 1000.00,
      "comision": 50.00,
      "monto_neto": 950.00,
      "usuario_caja": "caja_1",
      "estado": "completado",
      "referencia_externa": "REF123",
      "created_at": "2026-02-18T15:30:00.000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "page_size": 50,
    "total_records": 150,
    "total_pages": 3,
    "has_more": true
  },
  "meta": {
    "query_date_range": { "from": "2026-02-01", "to": "2026-02-28" },
    "query_timestamp": "2026-02-18T15:35:00.000Z",
    "days_in_range": 28
  }
}
```

---

### 2. RESUMEN DIARIO

Consolidación de movimientos por usuario de caja en un día específico.

**Endpoint**:
```
GET /api/v1/agent/daily-summary
```

**Parámetros**:
- `date` (requerido): Fecha (YYYY-MM-DD)

**Ejemplo**:
```bash
curl -X GET "http://localhost:3003/api/v1/agent/daily-summary?date=2026-02-18" \
  -H "Authorization: Bearer TOKEN"
```

**Respuesta**:
```json
{
  "success": true,
  "api_version": "v1",
  "date": "2026-02-18",
  "data": [
    {
      "usuario_caja": "caja_1",
      "saldo_inicial": 5000.00,
      "total_recargas": 10000.00,
      "total_pagos": 3000.00,
      "total_retiros": 2000.00,
      "total_depositos": 1000.00,
      "total_comisiones": 250.00,
      "saldo_teorico": 10750.00,
      "saldo_reportado": 10750.00,
      "diferencia": 0.00,
      "fecha_cierre": "2026-02-18",
      "total_transacciones": 4
    }
  ],
  "meta": {
    "total_usuarios_caja": 1,
    "total_recargas": 10000.00,
    "total_pagos": 3000.00,
    "total_comisiones": 250.00,
    "query_timestamp": "2026-02-18T15:35:00.000Z"
  }
}
```

---

### 3. MOVIMIENTOS DE CAJA

Aperturas, cierres, retiros, ingresos manuales de cajas.

**Endpoint**:
```
GET /api/v1/agent/cash-movements
```

**Parámetros**:
- `from` (requerido): Fecha inicio (YYYY-MM-DD)
- `to` (requerido): Fecha fin (YYYY-MM-DD)
- `page` (opcional): Número de página (default: 1)
- `size` (opcional): Registros por página (default: 50, máximo: 500)

**Ejemplo**:
```bash
curl -X GET "http://localhost:3003/api/v1/agent/cash-movements?from=2026-02-01&to=2026-02-28" \
  -H "Authorization: Bearer TOKEN"
```

**Respuesta**:
```json
{
  "success": true,
  "api_version": "v1",
  "data": [
    {
      "id_movimiento": "mov_001",
      "tipo": "apertura",
      "monto": 5000.00,
      "usuario": "gerente_1",
      "fecha": "2026-02-18T08:00:00.000Z",
      "observacion": "Apertura de caja matutina"
    }
  ],
  "pagination": {
    "current_page": 1,
    "page_size": 50,
    "total_records": 25,
    "total_pages": 1,
    "has_more": false
  }
}
```

---

### 4. CIERRES DE CAJA

Balances finales y detección de descuadres.

**Endpoint**:
```
GET /api/v1/agent/closures
```

**Parámetros**:
- `from` (requerido): Fecha inicio (YYYY-MM-DD)
- `to` (requerido): Fecha fin (YYYY-MM-DD)
- `page` (opcional): Número de página (default: 1)
- `size` (opcional): Registros por página (default: 50, máximo: 500)

**Ejemplo**:
```bash
curl -X GET "http://localhost:3003/api/v1/agent/closures?from=2026-02-01&to=2026-02-28" \
  -H "Authorization: Bearer TOKEN"
```

**Respuesta**:
```json
{
  "success": true,
  "api_version": "v1",
  "data": [
    {
      "fecha": "2026-02-18T20:00:00.000Z",
      "usuario": "caja_1",
      "saldo_sistema": 10750.00,
      "saldo_fisico": 10750.00,
      "diferencia_detectada": 0.00,
      "estado": "balanceado",
      "observaciones": ""
    },
    {
      "fecha": "2026-02-18T20:05:00.000Z",
      "usuario": "caja_2",
      "saldo_sistema": 8500.00,
      "saldo_fisico": 8480.00,
      "diferencia_detectada": -20.00,
      "estado": "descuadre",
      "observaciones": "Faltante en físico"
    }
  ],
  "pagination": {
    "current_page": 1,
    "page_size": 50,
    "total_records": 2,
    "total_pages": 1,
    "has_more": false
  },
  "meta": {
    "total_cierres": 2,
    "cierres_balanceados": 1,
    "cierres_con_descuadre": 1
  }
}
```

---

### 5. AJUSTES MANUALES

Ajustes de saldo realizados por supervisores.

**Endpoint**:
```
GET /api/v1/agent/manual-adjustments
```

**Parámetros**:
- `from` (requerido): Fecha inicio (YYYY-MM-DD)
- `to` (requerido): Fecha fin (YYYY-MM-DD)
- `page` (opcional): Número de página (default: 1)
- `size` (opcional): Registros por página (default: 50, máximo: 500)

**Ejemplo**:
```bash
curl -X GET "http://localhost:3003/api/v1/agent/manual-adjustments?from=2026-02-01&to=2026-02-28" \
  -H "Authorization: Bearer TOKEN"
```

**Respuesta**:
```json
{
  "success": true,
  "api_version": "v1",
  "data": [
    {
      "id_ajuste": "adj_001",
      "fecha": "2026-02-18T20:30:00.000Z",
      "usuario": "supervisor_1",
      "motivo": "Error en conteo físico - reajuste",
      "monto": 20.00,
      "tipo": "credito"
    }
  ],
  "pagination": {
    "current_page": 1,
    "page_size": 50,
    "total_records": 1,
    "total_pages": 1,
    "has_more": false
  },
  "meta": {
    "total_ajustes": 1,
    "total_creditos": 20.00,
    "total_debitos": 0.00,
    "neto": 20.00
  }
}
```

---

## 🛡️ Seguridad

### Headers de Seguridad
- **Helmet**: Headers HTTP de seguridad
- **CORS**: Control de origen de solicitudes
- **JWT**: Tokens con expiración (15 minutos por defecto)

### Validaciones
- Validación de formato de fechas (YYYY-MM-DD)
- Rango máximo de histórico: 365 días
- Límite de registros por página: 500
- ID de solicitud para trazabilidad

### Auditoría
Todas las solicitudes registran:
- Timestamp exacto
- IP del cliente
- Usuario que consulta
- Endpoint accedido
- Parámetros utilizados
- Resultado de la operación

---

## 📝 Estructura de Carpetas

```
firestore-proxy/
├── server.js                 # Servidor principal
├── package.json              # Dependencias
├── .env                      # Variables de entorno
├── serviceAccountKey.json    # Credenciales Firebase
├── README.md                 # Esta documentación
│
├── config/
│   └── constants.js          # Configuración centralizada
│
├── middleware/
│   └── auth.js               # Autenticación JWT
│
├── routes/
│   ├── authRoutes.js         # Rutas de login
│   └── financialApi.js       # Rutas de datos
│
├── controllers/
│   └── financialController.js # Lógica de negocio
│
└── utils/
    ├── logger.js             # Sistema de logging
    └── validators.js         # Validaciones
```

---

## 🔍 Respuestas de Error

### Formato estándar
```json
{
  "success": false,
  "error": "Descripción del error",
  "code": "ERROR_CODE",
  "requestId": "req_1708370102000_abc123def"
}
```

### Códigos comunes

| Código | HTTP | Descripción |
|--------|------|-------------|
| NO_TOKEN | 401 | Token no proporcionado |
| TOKEN_EXPIRED | 401 | Token expirado |
| INVALID_TOKEN | 403 | Token inválido |
| MISSING_DATE | 400 | Parámetro de fecha faltante |
| INVALID_DATE_RANGE | 400 | Rango de fechas inválido |
| INSUFFICIENT_PERMISSIONS | 403 | Permisos insuficientes |
| DB_ERROR | 500 | Error de base de datos |
| NOT_FOUND | 404 | Endpoint no encontrado |

---

## 📌 Ejemplos de Uso

### Con JavaScript/Node.js

```javascript
const axios = require('axios');

const API_URL = 'http://localhost:3003/api/v1';

// 1. Login
const loginResponse = await axios.post(`${API_URL}/auth/login`, {
  username: 'central_audit',
  password: 'admin123'
});

const token = loginResponse.data.token;

// 2. Consultar transacciones
const transactionsResponse = await axios.get(
  `${API_URL}/agent/transactions?from=2026-02-01&to=2026-02-28`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

console.log(transactionsResponse.data);
```

### Con Python

```python
import requests
import json

API_URL = 'http://localhost:3003/api/v1'

# Login
response = requests.post(f'{API_URL}/auth/login', json={
    'username': 'central_audit',
    'password': 'admin123'
})

token = response.json()['token']

# Consultar transacciones
headers = {'Authorization': f'Bearer {token}'}
response = requests.get(
    f'{API_URL}/agent/transactions?from=2026-02-01&to=2026-02-28',
    headers=headers
)

print(json.dumps(response.json(), indent=2))
```

---

## 🚨 Solución de Problemas

### Error: "serviceAccountKey.json no encontrado"
- Verificar que el archivo esté en la raíz de `firestore-proxy/`
- Descargar nuevamente desde Firebase Console

### Error: "JWT_SECRET muy corto"
- En producción, debe tener al menos 32 caracteres
- Actualizar en `.env`

### Error: "Conexión denegada"
- Verificar que el puerto 3003 esté disponible
- Cambiar `PORT` en `.env`

### Error: "Permisos insuficientes"
- Verificar rol del usuario
- Verificar que el endpoint tenga los permisos requeridos

---

## 📚 Referencia Técnica

### Tecnologías
- **Express.js** - Framework web
- **Firebase Admin SDK** - Acceso a Firestore
- **JWT (jsonwebtoken)** - Autenticación
- **Helmet** - Headers de seguridad
- **CORS** - Control de origen

### Estándares
- REST API v1
- JSON para solicitudes/respuestas
- ISO 8601 para fechas/horas
- HTTP status codes estándar

---

## 📞 Soporte

Para reportar bugs o sugerencias:
1. Revisar la documentación
2. Verificar logs en consola
3. Contactar al equipo de desarrollo

---

## 📄 Licencia

ISC

---

**Versión**: 1.1.0  
**Última actualización**: Febrero 2026  
**Estado**: En producción ✅
