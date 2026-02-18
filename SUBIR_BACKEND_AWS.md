# Cómo subir tu backend (API) a AWS

Tienes dos opciones. La **A** es la más simple para empezar.

---

## OPCIÓN A – Sin Docker (más fácil): EC2

### 1. Crear la instancia EC2

1. En la consola AWS, **Menú** → **Informática** → **EC2**.
2. Clic en **Instancias** (Instances) → **Lanzar instancia** (Launch instance).
3. Configurar:
   - **Nombre:** `api-multiagente` (o el que quieras).
   - **Sistema operativo:** **Ubuntu Server 22.04 LTS**.
   - **Tipo de instancia:** **t2.micro** (capa gratuita).
   - **Par de claves:** Crear nuevo par de claves, nombre `api-key`, descargar el `.pem` y guárdalo.
   - **Configuración de red:** Crear grupo de seguridad. Reglas:
     - **SSH (22)** – Origen: Mi IP (para que solo tú entres).
     - **HTTP (80)** – Origen: 0.0.0.0/0 (o **Personalizado** con la IP de tu amigo si quieres restringir).
     - **Personalizado TCP 3003** – Puerto 3003, Origen: 0.0.0.0/0 (donde escucha tu API).
4. **Lanzar instancia**.

### 2. Conectarte por SSH (Windows)

En PowerShell (en la carpeta donde está el `.pem`):

```powershell
# Ajusta la ruta del .pem y la IP pública de tu instancia
ssh -i "C:\ruta\api-key.pem" ubuntu@IP_PUBLICA_DE_TU_EC2
```

La **IP pública** la ves en EC2 → Instancias → tu instancia.

### 3. En el servidor (Ubuntu): instalar Node y subir tu API

Una vez conectado por SSH:

```bash
# Actualizar e instalar Node.js 18
sudo apt update
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar
node -v
npm -v
```

Luego tienes que **subir tu carpeta `firestore-proxy`** al servidor. Opciones:

- **Opción 1 – Desde tu PC con SCP (PowerShell):**

```powershell
scp -i "C:\ruta\api-key.pem" -r "c:\Emisor Tick Andr\firestore-proxy" ubuntu@IP_PUBLICA_EC2:~/
```

- **Opción 2 – Clonar desde Git:** si tu proyecto está en GitHub/GitLab, en el servidor:

```bash
git clone URL_DE_TU_REPO
cd firestore-proxy
```

- **Opción 3 – Subir con WinSCP o FileZilla** usando el `.pem` y el usuario `ubuntu`.

### 4. En el servidor: instalar dependencias y archivos secretos

```bash
cd ~/firestore-proxy   # o la ruta donde hayas dejado el proyecto

npm install
```

Crear el archivo `.env` (igual que en tu PC):

```bash
nano .env
```

Pegar algo como (ajusta valores):

```env
PORT=3003
NODE_ENV=production
JWT_SECRET=tu_clave_secreta_muy_larga_minimo_32_caracteres
JWT_EXPIRATION=15m
```

Subir también **serviceAccountKey.json** de Firebase (misma forma que el proyecto: SCP, WinSCP o Git sin commitear el archivo y subirlo a mano).

### 5. Dejar la API corriendo siempre (PM2)

```bash
sudo npm install -g pm2
pm2 start server.js --name "api-multiagente"
pm2 save
pm2 startup   # ejecutar el comando que te muestre (sudo ...)
```

### 6. Probar desde fuera

En el navegador o Postman:

- `http://IP_PUBLICA_DE_TU_EC2:3003/health`
- Login: `POST http://IP_PUBLICA_DE_TU_EC2:3003/api/v1/auth/login` con body `{"username":"central_audit","password":"admin123"}`

La **URL base** que le das a tu amigo es: `http://IP_PUBLICA_DE_TU_EC2:3003`  
(Si más adelante pones un dominio, sería `https://api.tudominio.com`.)

---

## OPCIÓN B – Con Docker: ECR + ECS Fargate

### 1. Crear la imagen Docker (en tu PC)

En la carpeta `firestore-proxy` ya deberías tener (o crear) un `Dockerfile`. Ejemplo:

```dockerfile
FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3003
CMD ["node", "server.js"]
```

Crear `.dockerignore`:

```
node_modules
.env.local
.git
*.md
```

Construir y probar en local (opcional):

```bash
docker build -t api-multiagente .
docker run -p 3003:3003 --env-file .env api-multiagente
```

### 2. Subir la imagen a ECR

1. En AWS: **Contenedores** → **Elastic Container Registry (ECR)**.
2. **Crear repositorio** → nombre `api-multiagente` → Crear.
3. En el repositorio, clic en **Ver comandos de inserción** (View push commands). Te dará algo como:

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin TU_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker build -t api-multiagente .
docker tag api-multiagente:latest TU_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/api-multiagente:latest
docker push TU_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/api-multiagente:latest
```

Ejecutas esos comandos en tu PC (con AWS CLI y Docker instalados). La imagen queda en ECR.

### 3. Ejecutar el contenedor en ECS Fargate

1. **Contenedores** → **Elastic Container Service (ECS)**.
2. **Clústeres** → Crear clúster → nombre `cluster-api` → Crear.
3. **Tareas (Task definitions)** → Crear nueva definición de tarea:
   - Familia: `api-multiagente`.
   - Capacidad: **Fargate**.
   - Imagen: la URI de ECR (ej. `123456789.dkr.ecr.us-east-1.amazonaws.com/api-multiagente:latest`).
   - Puerto: 3003.
   - Variables de entorno: añadir las de tu `.env` (o usar Secrets Manager después).
4. **Clúster** → tu clúster → **Servicios** → Crear servicio:
   - Definición de tarea: `api-multiagente`.
   - Número de tareas: 1.
   - Tipo de red: Pública (o VPC con balanceador).
   - Abrir puerto 3003 en el grupo de seguridad.

Al final tendrás una IP o un balanceador (ALB). Esa URL es la que usas como “backend en AWS”.

---

## Resumen rápido

- **Solo quieres “subir el backend” y que funcione ya:**  
  Usa **Opción A (EC2)**. Creas instancia → te conectas por SSH → subes `firestore-proxy` → `npm install` → `.env` y `serviceAccountKey.json` → `pm2 start server.js`. La URL es `http://IP_EC2:3003`.

- **Quieres usar contenedores (Docker):**  
  Usa **Opción B**: construir imagen → subir a **ECR** → crear tarea y servicio en **ECS Fargate** con esa imagen. La URL será la del servicio/balanceador.

Si me dices si prefieres EC2 o ECR+ECS, puedo reducirlo a una lista de 5–6 pasos “qué clic dar” en la consola.
