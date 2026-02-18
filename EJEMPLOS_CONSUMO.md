# 📚 EJEMPLOS DE CONSUMO - API REST

Aquí encontrarás ejemplos prácticos de cómo consumir la API en diferentes lenguajes de programación.

---

## 🔑 OBTENER TOKEN

### cURL
```bash
curl -X POST http://localhost:3003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "central_audit",
    "password": "admin123"
  }' | jq .token
```

### JavaScript/Node.js
```javascript
const axios = require('axios');

async function getToken() {
  try {
    const response = await axios.post('http://localhost:3003/api/v1/auth/login', {
      username: 'central_audit',
      password: 'admin123'
    });
    
    const token = response.data.token;
    console.log('Token:', token);
    return token;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Usar
getToken();
```

### Python
```python
import requests
import json

def get_token():
    response = requests.post(
        'http://localhost:3003/api/v1/auth/login',
        json={
            'username': 'central_audit',
            'password': 'admin123'
        }
    )
    
    if response.status_code == 200:
        token = response.json()['token']
        print(f'Token: {token}')
        return token
    else:
        print(f'Error: {response.json()}')

# Usar
get_token()
```

### PHP
```php
<?php
$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'http://localhost:3003/api/v1/auth/login',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS => json_encode([
    'username' => 'central_audit',
    'password' => 'admin123'
  ]),
  CURLOPT_HTTPHEADER => array(
    'Content-Type: application/json'
  ),
));

$response = curl_exec($curl);
$err = curl_error($curl);

curl_close($curl);

if ($err) {
    echo "cURL Error #:" . $err;
} else {
    $data = json_decode($response, true);
    $token = $data['token'];
    echo "Token: " . $token;
}
?>
```

---

## 📊 OBTENER TRANSACCIONES

### cURL
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET "http://localhost:3003/api/v1/agent/transactions?from=2026-02-01&to=2026-02-28&page=1&size=50" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .
```

### JavaScript/Node.js (Completo)
```javascript
const axios = require('axios');

const API_URL = 'http://localhost:3003/api/v1';

async function getTransactions() {
  try {
    // 1. Login
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: 'central_audit',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Autenticación exitosa\n');

    // 2. Crear headers con token
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 3. Consultar transacciones
    const transResponse = await axios.get(
      `${API_URL}/agent/transactions?from=2026-02-01&to=2026-02-28&page=1&size=10`,
      { headers }
    );

    // 4. Procesar respuesta
    const data = transResponse.data;
    console.log(`📊 Transacciones obtenidas: ${data.data.length}`);
    console.log(`📄 Página ${data.pagination.current_page} de ${data.pagination.total_pages}`);
    console.log(`📈 Total de registros: ${data.pagination.total_records}\n`);

    // 5. Mostrar primeras transacciones
    data.data.slice(0, 3).forEach(trans => {
      console.log(`  • ${trans.fecha}: ${trans.tipo_operacion} - $${trans.monto} (Comisión: $${trans.comision})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Ejecutar
getTransactions();
```

### Python (Completo)
```python
import requests
import json
from datetime import datetime

API_URL = 'http://localhost:3003/api/v1'

def get_transactions():
    try:
        # 1. Login
        login_response = requests.post(
            f'{API_URL}/auth/login',
            json={
                'username': 'central_audit',
                'password': 'admin123'
            }
        )
        
        token = login_response.json()['token']
        print('✅ Autenticación exitosa\n')

        # 2. Headers con token
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

        # 3. Consultar transacciones
        trans_response = requests.get(
            f'{API_URL}/agent/transactions?from=2026-02-01&to=2026-02-28&page=1&size=10',
            headers=headers
        )

        # 4. Procesar respuesta
        data = trans_response.json()
        print(f"📊 Transacciones obtenidas: {len(data['data'])}")
        print(f"📄 Página {data['pagination']['current_page']} de {data['pagination']['total_pages']}")
        print(f"📈 Total de registros: {data['pagination']['total_records']}\n")

        # 5. Mostrar primeras transacciones
        for trans in data['data'][:3]:
            fecha = trans['fecha']
            tipo = trans['tipo_operacion']
            monto = trans['monto']
            comision = trans['comision']
            print(f"  • {fecha}: {tipo} - ${monto} (Comisión: ${comision})")

    except Exception as error:
        print(f'❌ Error: {error}')

# Ejecutar
get_transactions()
```

---

## 📈 OBTENER RESUMEN DIARIO

### JavaScript/Node.js
```javascript
async function getDailySummary(token, date = '2026-02-18') {
  try {
    const response = await axios.get(
      `${API_URL}/agent/daily-summary?date=${date}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const data = response.data;
    console.log(`\n📊 RESUMEN DEL DÍA: ${date}`);
    console.log(`Cajas: ${data.meta.total_usuarios_caja}`);
    console.log(`Total Recargas: $${data.meta.total_recargas}`);
    console.log(`Total Pagos: $${data.meta.total_pagos}`);
    console.log(`Total Comisiones: $${data.meta.total_comisiones}\n`);

    data.data.forEach(caja => {
      console.log(`\n🏪 ${caja.usuario_caja}:`);
      console.log(`   Recargas: $${caja.total_recargas}`);
      console.log(`   Pagos: $${caja.total_pagos}`);
      console.log(`   Retiros: $${caja.total_retiros}`);
      console.log(`   Saldo Teórico: $${caja.saldo_teorico}`);
      console.log(`   Saldo Reportado: $${caja.saldo_reportado}`);
      console.log(`   Diferencia: $${caja.diferencia}`);
    });

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}
```

### Python
```python
def get_daily_summary(token, date='2026-02-18'):
    try:
        headers = {'Authorization': f'Bearer {token}'}
        
        response = requests.get(
            f'{API_URL}/agent/daily-summary?date={date}',
            headers=headers
        )

        data = response.json()
        print(f'\n📊 RESUMEN DEL DÍA: {date}')
        print(f'Cajas: {data["meta"]["total_usuarios_caja"]}')
        print(f'Total Recargas: ${data["meta"]["total_recargas"]}')
        print(f'Total Pagos: ${data["meta"]["total_pagos"]}')
        print(f'Total Comisiones: ${data["meta"]["total_comisiones"]}\n')

        for caja in data['data']:
            print(f"\n🏪 {caja['usuario_caja']}:")
            print(f"   Recargas: ${caja['total_recargas']}")
            print(f"   Pagos: ${caja['total_pagos']}")
            print(f"   Retiros: ${caja['total_retiros']}")
            print(f"   Saldo Teórico: ${caja['saldo_teorico']}")
            print(f"   Saldo Reportado: ${caja['saldo_reportado']}")
            print(f"   Diferencia: ${caja['diferencia']}")

    except Exception as error:
        print(f'Error: {error}')
```

---

## 🔐 OBTENER CIERRES DE CAJA (CON DESCUADRES)

### JavaScript/Node.js
```javascript
async function getClosuresWithVariances(token) {
  try {
    const response = await axios.get(
      `${API_URL}/agent/closures?from=2026-02-01&to=2026-02-28`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    const data = response.data;
    const descuadres = data.data.filter(c => c.estado === 'descuadre');

    console.log(`\n🔐 ANÁLISIS DE CIERRES DE CAJA`);
    console.log(`Total: ${data.meta.total_cierres}`);
    console.log(`Balanceados: ${data.meta.cierres_balanceados}`);
    console.log(`Con Descuadre: ${data.meta.cierres_con_descuadre}\n`);

    if (descuadres.length > 0) {
      console.log('⚠️ DESCUADRES DETECTADOS:\n');
      descuadres.forEach(cierre => {
        console.log(`  📍 ${cierre.usuario}`);
        console.log(`     Fecha: ${cierre.fecha}`);
        console.log(`     Saldo Sistema: $${cierre.saldo_sistema}`);
        console.log(`     Saldo Físico: $${cierre.saldo_fisico}`);
        console.log(`     Diferencia: $${cierre.diferencia_detectada}\n`);
      });
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}
```

### Python
```python
def get_closures_with_variances(token):
    try:
        headers = {'Authorization': f'Bearer {token}'}
        
        response = requests.get(
            f'{API_URL}/agent/closures?from=2026-02-01&to=2026-02-28',
            headers=headers
        )

        data = response.json()
        descuadres = [c for c in data['data'] if c['estado'] == 'descuadre']

        print(f'\n🔐 ANÁLISIS DE CIERRES DE CAJA')
        print(f'Total: {data["meta"]["total_cierres"]}')
        print(f'Balanceados: {data["meta"]["cierres_balanceados"]}')
        print(f'Con Descuadre: {data["meta"]["cierres_con_descuadre"]}\n')

        if descuadres:
            print('⚠️ DESCUADRES DETECTADOS:\n')
            for cierre in descuadres:
                print(f"  📍 {cierre['usuario']}")
                print(f"     Fecha: {cierre['fecha']}")
                print(f"     Saldo Sistema: ${cierre['saldo_sistema']}")
                print(f"     Saldo Físico: ${cierre['saldo_fisico']}")
                print(f"     Diferencia: ${cierre['diferencia_detectada']}\n")

    except Exception as error:
        print(f'Error: {error}')
```

---

## ⚙️ AJUSTES MANUALES

### JavaScript/Node.js
```javascript
async function getManualAdjustments(token) {
  try {
    const response = await axios.get(
      `${API_URL}/agent/manual-adjustments?from=2026-02-01&to=2026-02-28&page=1&size=20`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    const data = response.data;
    console.log(`\n⚙️ AJUSTES MANUALES`);
    console.log(`Total: ${data.meta.total_ajustes}`);
    console.log(`Créditos: $${data.meta.total_creditos}`);
    console.log(`Débitos: $${data.meta.total_debitos}`);
    console.log(`Neto: $${data.meta.neto}\n`);

    data.data.forEach(ajuste => {
      const simbolo = ajuste.tipo === 'credito' ? '+' : '-';
      console.log(`  ${simbolo} $${ajuste.monto} | ${ajuste.usuario} | ${ajuste.motivo}`);
    });

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}
```

---

## 🔄 GESTIÓN DE ERRORES

### JavaScript/Node.js
```javascript
async function robustApiCall(token, endpoint, params = {}) {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await axios.get(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: params,
        timeout: 10000
      });

      return response.data;

    } catch (error) {
      attempt++;

      if (error.response?.status === 401) {
        console.error('❌ Token expirado o inválido');
        throw error;
      } else if (error.response?.status === 403) {
        console.error('❌ Acceso denegado - Permisos insuficientes');
        throw error;
      } else if (error.response?.status >= 500) {
        console.warn(`⚠️ Error servidor. Intento ${attempt}/${maxRetries}`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
      }

      throw error;
    }
  }
}

// Usar
try {
  const data = await robustApiCall(token, `${API_URL}/agent/transactions`, {
    from: '2026-02-01',
    to: '2026-02-28'
  });
  console.log('✅ Datos obtenidos:', data);
} catch (error) {
  console.error('❌ Error final:', error.message);
}
```

### Python
```python
def robust_api_call(token, endpoint, params={}, max_retries=3):
    headers = {'Authorization': f'Bearer {token}'}
    
    for attempt in range(max_retries):
        try:
            response = requests.get(
                endpoint,
                headers=headers,
                params=params,
                timeout=10
            )
            
            return response.json()

        except requests.exceptions.Timeout:
            print(f'⚠️ Timeout. Intento {attempt + 1}/{max_retries}')
            if attempt < max_retries - 1:
                time.sleep(1 * (attempt + 1))
                continue
            raise
        
        except requests.exceptions.RequestException as e:
            if response.status_code == 401:
                print('❌ Token expirado o inválido')
                raise
            elif response.status_code == 403:
                print('❌ Acceso denegado')
                raise
            else:
                print(f'❌ Error: {e}')
                raise
```

---

## 📦 INSTALACIÓN DE DEPENDENCIAS

### Node.js
```bash
npm install axios
```

### Python
```bash
pip install requests
```

### PHP
```
Ya incluido en curl estándar
```

---

## ✅ CHECKLIST DE INTEGRACIÓN

- [ ] Obtener credenciales de acceso (usuario/contraseña)
- [ ] Instalar cliente HTTP (`axios`, `requests`, etc.)
- [ ] Crear función de login reutilizable
- [ ] Implementar refresh de tokens
- [ ] Manejar errores de autenticación
- [ ] Validar respuestas de la API
- [ ] Implementar paginación si es necesario
- [ ] Añadir logs de auditoría
- [ ] Testear en ambiente de staging
- [ ] Documentar endpoints consumidos

---

## 🚀 ¡Listo!

Ya tienes ejemplos prácticos para integrar la API en tu aplicación.

Para más detalles, consulta `README.md`.
