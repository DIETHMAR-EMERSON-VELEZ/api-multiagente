# 🚀 GUÍA DE DESPLIEGUE - API REST

Instrucciones para desplegar la API en diferentes ambientes.

---

## 📋 REQUISITOS PREVIOS

- Node.js >= 14.0.0
- npm >= 6.0.0
- Credenciales de Firebase (serviceAccountKey.json)
- Acceso a Firestore

---

## 🏠 DESARROLLO LOCAL

### 1. Configuración Inicial

```bash
# Clonar/abrir el proyecto
cd c:\Emisor Tick Andr\firestore-proxy

# Instalar dependencias
npm install

# Crear archivo .env
cp .env.example .env

# Editar .env con valores locales
NODE_ENV=development
PORT=3003
JWT_SECRET=clave_secreta_desarrollo_local
```

### 2. Ejecutar Servidor

```bash
npm start
```

**Verificar que funciona**:
```bash
curl http://localhost:3003/health
```

---

## 🌐 DESPLIEGUE EN INTERNET (RECOMENDADO)

### Opción 1: Google Cloud Run (RECOMENDADO - Gratis con límites)

#### Paso 1: Preparar proyecto
```bash
cd c:\Emisor Tick Andr\firestore-proxy

# Crear archivo .gcloudignore
echo "node_modules/" > .gcloudignore
echo "*.env.local" >> .gcloudignore

# Crear app.yaml
cat > app.yaml << EOF
runtime: nodejs18

env: standard
instances: 1

env_variables:
  NODE_ENV: "production"
  PORT: "8080"
  JWT_SECRET: "tu-secreto-muy-largo-aqui"
EOF
```

#### Paso 2: Desplegar
```bash
# Instalar Google Cloud CLI
# https://cloud.google.com/sdk/docs/install

# Login
gcloud auth login

# Crear proyecto
gcloud projects create tu-proyecto-api

# Seleccionar proyecto
gcloud config set project tu-proyecto-api

# Desplegar
gcloud app deploy
```

**Resultado**: API disponible en `https://tu-proyecto-api.appspot.com`

---

### Opción 2: Heroku (Opción alternativa)

#### Paso 1: Preparar
```bash
# Crear archivo Procfile
echo "web: node server.js" > Procfile

# Crear Runtime.txt
echo "node-18.x" > Runtime.txt
```

#### Paso 2: Desplegar
```bash
# Instalar Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Crear app
heroku create tu-app-api

# Establecer variables de entorno
heroku config:set NODE_ENV=production -a tu-app-api
heroku config:set JWT_SECRET="clave-muy-larga-aqui" -a tu-app-api

# Agregar Firebase service account
heroku config:set FIREBASE_CONFIG="$(cat serviceAccountKey.json)" -a tu-app-api

# Desplegar
git push heroku main
```

**Resultado**: API disponible en `https://tu-app-api.herokuapp.com`

---

### Opción 3: AWS (Más control)

#### EC2 Instance
```bash
# Conectar a instancia
ssh -i clave.pem ec2-user@tu-instancia.compute.amazonaws.com

# Actualizar sistema
sudo yum update -y

# Instalar Node.js
curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Clonar proyecto
git clone tu-repo.git
cd firestore-proxy

# Instalar dependencias
npm install

# Crear archivo .env
nano .env
# (Pegar configuración)

# Iniciar con PM2 (gestor de procesos)
npm install -g pm2
pm2 start server.js --name "financial-api"
pm2 startup
pm2 save
```

---

### Opción 4: Docker (Contenedor)

#### Crear Dockerfile

```dockerfile
FROM node:18-slim

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código
COPY . .

# Puerto
EXPOSE 3003

# Comando
CMD ["node", "server.js"]
```

#### Crear .dockerignore

```
node_modules
npm-debug.log
.env.local
.git
.gitignore
README.md
```

#### Compilar y ejecutar

```bash
# Compilar imagen
docker build -t financial-api:1.1.0 .

# Ejecutar localmente
docker run -p 3003:3003 \
  -e NODE_ENV=production \
  -e JWT_SECRET="clave-secreta" \
  -v $(pwd)/serviceAccountKey.json:/app/serviceAccountKey.json:ro \
  financial-api:1.1.0

# Desplegar a Docker Hub
docker tag financial-api:1.1.0 tuusuario/financial-api:1.1.0
docker push tuusuario/financial-api:1.1.0
```

---

## ⚙️ CONFIGURACIÓN PRODUCCIÓN

### Archivo `.env` PRODUCCIÓN

```env
# Servidor
PORT=3003
NODE_ENV=production

# JWT - CRÍTICO: Cambiar en producción
JWT_SECRET=generar_una_clave_larga_y_segura_con_openssl_rand_base64_32
JWT_EXPIRATION=15m

# Firestore (sin cambios generalmente)
FIRESTORE_COLLECTION_TRANSACTIONS=operaciones
FIRESTORE_COLLECTION_CASH_MOVEMENTS=movimientos_caja
FIRESTORE_COLLECTION_CLOSURES=cierres_caja
FIRESTORE_COLLECTION_ADJUSTMENTS=ajustes_manuales

# Límites
MAX_PAGE_SIZE=500
DEFAULT_PAGE_SIZE=50
MAX_HISTORICAL_DAYS=365

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# CORS (Limitar a dominio específico)
CORS_ORIGIN=https://dashboard.tudominio.com

# Seguridad
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=100
```

### Generar JWT_SECRET Seguro

```bash
# macOS/Linux
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

---

## 🔒 SEGURIDAD EN PRODUCCIÓN

### 1. HTTPS/SSL
```bash
# Usar servicio como Let's Encrypt
sudo certbot certonly --standalone -d api.tudominio.com
```

### 2. Firewall
```bash
# Solo abrir puerto 443 (HTTPS)
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp  # Solo para validación SSL
sudo ufw deny 3003/tcp # Bloquear acceso directo
```

### 3. Variables de Entorno Seguras
- Usar gestor de secretos (AWS Secrets Manager, HashiCorp Vault)
- NO incluir `.env` en git
- Rotar `JWT_SECRET` periódicamente

### 4. Validación de Usuarios
```javascript
// En production/routes/authRoutes.js, reemplazar:
// validUsers = {...} 

// Con validación contra Firestore:
async function validateUser(username, password) {
  const userRef = await db.collection('usuarios')
    .where('username', '==', username)
    .get();
  
  if (userRef.empty) return null;
  
  const user = userRef.docs[0].data();
  const validPassword = await bcrypt.compare(password, user.passwordHash);
  
  return validPassword ? user : null;
}
```

### 5. Monitoreo
- Usar Sentry para tracking de errores
- CloudWatch para logs
- Alertas por anomalías

---

## 📊 MONITOREO Y MANTENIMIENTO

### Health Check
```bash
curl https://api.tudominio.com/health
```

### Ver Logs
```bash
# Heroku
heroku logs --tail -a tu-app

# Google Cloud Run
gcloud app logs read

# AWS EC2 con PM2
pm2 logs financial-api
```

### Reiniciar Servicio
```bash
# Heroku
heroku restart -a tu-app

# Google Cloud Run (auto-reinicia)

# AWS EC2
pm2 restart financial-api
```

---

## 🔄 CI/CD (Integración Continua)

### GitHub Actions Ejemplo

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Cloud SDK
        uses: google-github-actions/setup-gcloud@v0

      - name: Configure Docker
        run: gcloud auth configure-docker

      - name: Build image
        run: |
          docker build -t gcr.io/${{ secrets.GCP_PROJECT_ID }}/financial-api:${{ github.sha }} .

      - name: Push image
        run: |
          docker push gcr.io/${{ secrets.GCP_PROJECT_ID }}/financial-api:${{ github.sha }}

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy financial-api \
            --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/financial-api:${{ github.sha }} \
            --platform managed \
            --region us-central1 \
            --set-env-vars JWT_SECRET=${{ secrets.JWT_SECRET }}
```

---

## 📋 CHECKLIST DE DESPLIEGUE

- [ ] Variables de entorno configuradas
- [ ] JWT_SECRET seguro y largo (> 32 caracteres)
- [ ] serviceAccountKey.json en servidor
- [ ] HTTPS/SSL activado
- [ ] CORS configurado correctamente
- [ ] Logs estructurados habilitados
- [ ] Backup automático de Firestore
- [ ] Monitoring y alertas activos
- [ ] Validación de usuarios contra Firestore
- [ ] Documentación actualizada
- [ ] Plan de recuperación ante desastres
- [ ] Testeo de endpoints en producción

---

## 🆘 Troubleshooting

### Problema: "CORS error"
```
Solución: Verificar CORS_ORIGIN en .env
Debe coincidir exactamente con dominio de cliente
```

### Problema: "Token inválido"
```
Solución: JWT_SECRET diferente entre servidor y cliente
Asegurar que sea el mismo en ambos lados
```

### Problema: "Firestore sin permiso"
```
Solución: Verificar serviceAccountKey.json
Debe tener permisos de lectura en Firestore
```

### Problema: "Timeout"
```
Solución: Aumentar límites o agregar caché
Verificar índices en Firestore
```

---

## 📞 Soporte Post-Despliegue

Para problemas:
1. Revisar logs
2. Consultar esta guía
3. Verificar configuración
4. Contactar soporte Firebase
5. Consultar documentación de Express.js

---

## ✅ ¡Listo!

Tu API está lista para producción. 🚀

---

**Última actualización**: Febrero 2026  
**Versión**: 1.1.0
