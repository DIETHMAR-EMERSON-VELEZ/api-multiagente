# Guía: Subir tu API a AWS con Docker (ECR + ECS) **sin instalar Docker en tu PC**

---

## ¿Dónde está Docker? ¿Lo instalo en AWS?

- **No instalas Docker en tu PC.**  
- **No instalas Docker en un servidor que tú administres.**  

Lo que hace AWS:

1. **CodeBuild** = servicio que “construye” tu proyecto. En esa construcción **sí usa Docker por dentro** (en un entorno temporal que AWS gestiona). Tú solo subes tu código (por ejemplo a GitHub) y le dices “construye”; CodeBuild clona el repo, ejecuta `docker build` y `docker push` a ECR. **Todo eso ocurre en la nube.**
2. **ECR** = almacén de imágenes Docker. Ahí queda guardada la imagen que CodeBuild subió.
3. **ECS Fargate** = servicio que **ejecuta** esa imagen (el contenedor). Fargate ya tiene todo lo necesario para correr contenedores; tú no instalas ni mantienes Docker en ningún lado.

Resumen: **Docker “está” solo dentro de CodeBuild (build) y de Fargate (ejecución). Tú no instalas Docker ni en tu PC ni en AWS de forma manual.**

---

## Requisitos previos

1. **Cuenta AWS** con permisos para ECR, CodeBuild, ECS, Secrets Manager (y si usas ALB, ELB).
2. **Código en GitHub**: el contenido de tu carpeta `firestore-proxy` (con `Dockerfile`, `buildspec.yml`, `server.js`, etc.) debe estar en un repositorio. La raíz del repo debe ser la de tu API (donde está el `Dockerfile`).
3. **Credenciales de Firebase**: las usarás como variable de entorno en ECS (recomendado: guardarlas en **Secrets Manager** y referenciarlas desde la tarea ECS).

---

## Resumen de pasos (orden)

| Paso | Dónde en AWS | Qué haces |
|------|----------------|-----------|
| 1 | ECR | Crear repositorio `api-multiagente` |
| 2 | CodeBuild | Proyecto que construye la imagen desde GitHub y la sube a ECR |
| 3 | Secrets Manager | Guardar JWT y JSON de Firebase (opcional pero recomendado) |
| 4 | ECS | Crear clúster |
| 5 | ECS | Crear definición de tarea (Fargate, imagen ECR, puerto 3003) |
| 6 | ECS | Crear servicio (y si quieres URL fija, un Application Load Balancer) |

---

## Paso 1 – ECR: crear el repositorio

1. En AWS: **Contenedores** → **Elastic Container Registry (ECR)**.
2. **Crear repositorio**.
3. **Nombre del repositorio:** `api-multiagente`.
4. Dejar el resto por defecto (visibilidad privada, sin escaneo si no lo necesitas).
5. **Crear repositorio**.  
Anota la **URI** del repositorio (ej: `123456789012.dkr.ecr.us-east-1.amazonaws.com/api-multiagente`). La usarás en la definición de tarea de ECS.

---

## Paso 2 – CodeBuild: construir la imagen en la nube (sin Docker en tu PC)

1. En AWS: **DevOps** (o **Código**) → **CodeBuild** (o búsqueda “CodeBuild”).
2. **Crear proyecto de compilación**.
3. **Nombre:** `build-api-multiagente`.
4. **Origen:**
   - Origen: **GitHub** (o GitHub Enterprise si aplica).
   - Conectar a GitHub si es la primera vez (autorizar AWS).
   - Repositorio: el que tiene el código de `firestore-proxy` (raíz = donde está el `Dockerfile`).
   - Tipo de referencia: **Rama**.
   - Rama: `main` (o la que uses).
5. **Entorno:**
   - Imagen administrada.
   - Sistema operativo: **Ubuntu**.
   - Runtime: **Standard**.
   - Imagen: **Estándar: Amazon Linux 2 / 5.0** (incluye Docker). Si en tu región no aparece 5.0, elige la más reciente “Standard” que liste soporte para Docker en la descripción.
   - Tipo de credenciales: **Rol de servicio de CodeBuild** (crear uno nuevo si no tienes).
   - **Variables de entorno** (añadir):
     - Nombre: `ECR_REPO_NAME`  
     - Valor: `api-multiagente`  
     - Tipo: Texto plano.
6. **Buildspec:**
   - Usar **buildspec.yml** en la raíz del repositorio (ya lo tienes en el repo).
7. **Almacenamiento:** por defecto.
8. **Crear proyecto de compilación**.

Dar permisos al rol de CodeBuild para ECR:

- Ve a **IAM** → Roles → el rol que usa CodeBuild (ej. `codebuild-build-api-multiagente-service-role`).
- Añade una política que permita:  
  `ecr:GetAuthorizationToken`  
  y en el recurso del repositorio ECR:  
  `ecr:BatchCheckLayerAvailability`, `ecr:GetDownloadUrlForLayer`, `ecr:BatchGetImage`, `ecr:PutImage`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload`.

(O usa la política administrada **AmazonEC2ContainerRegistryPowerUser** o una política que incluya estos permisos para tu cuenta/repo.)

Luego en CodeBuild: **Iniciar compilación** (Start build). La primera vez puede tardar unos minutos. Si el build es correcto, la imagen quedará en ECR con tag `latest`.

---

## Paso 3 – Secrets Manager (recomendado para producción)

1. **Seguridad, identidad y cumplimiento** → **Secrets Manager** (o buscar “Secrets Manager”).
2. **Guardar un nuevo secreto**.
3. Tipo: **Otro tipo de secreto**.
4. Clave/valor (ejemplo):
   - `JWT_SECRET` → valor largo y aleatorio.
   - `FIREBASE_SERVICE_ACCOUNT_JSON` → contenido completo del JSON de Firebase (el de `serviceAccountKey.json`) como texto (una sola línea o escapado).
5. Nombre del secreto: por ejemplo `api-multiagente/env`.
6. Guardar.

En la **definición de tarea de ECS** (paso 5) referenciarás este secreto para inyectar esas variables en el contenedor.

---

## Paso 4 – ECS: crear el clúster

1. **Contenedores** → **Elastic Container Service (ECS)**.
2. **Clústeres** → **Crear clúster**.
3. Nombre: `cluster-api-multiagente`.
4. Infraestructura: **Solo AWS Fargate (servidor sin servidor)**.
5. **Crear**.

---

## Paso 5 – ECS: definición de tarea (Fargate + imagen ECR + puerto 3003)

1. En ECS: **Definiciones de tarea** (Task definitions) → **Crear nueva definición de tarea**.
2. **Tipo de inicio:** Fargate.
3. **Nombre de la familia de la definición de tarea:** `api-multiagente`.
4. **Rol de la tarea:** rol que permita ECR pull y (si usas Secrets) lectura de Secrets Manager. Puedes usar **ecsTaskExecutionRole** y asegurarte de que tenga política para Secrets Manager.
5. **Tamaño de la CPU y memoria:** por ejemplo 0.25 vCPU y 0.5 GB (ajustable).
6. **Contenedor:**
   - **Nombre:** `api-multiagente`.
   - **URI de imagen:** la URI de ECR (ej. `123456789012.dkr.ecr.us-east-1.amazonaws.com/api-multiagente:latest`). Debe ser la imagen que subió CodeBuild.
   - **Puerto:** `3003`.
   - **Variables de entorno** (si no usas Secrets para todo):
     - `NODE_ENV` = `production`
     - `PORT` = `3003`
     - Si no usas Secrets: `JWT_SECRET` = valor (no recomendado en producción).
   - **Secrets** (si guardaste JWT y Firebase en Secrets Manager):  
     Añadir secreto: nombre del secreto de Secrets Manager, y mapear las claves a variables de entorno (ej. `JWT_SECRET`, `FIREBASE_SERVICE_ACCOUNT_JSON`).
7. **Crear**.

---

## Paso 6 – ECS: crear el servicio (y opcionalmente balanceador para la URL)

1. Dentro del clúster `cluster-api-multiagente` → pestaña **Servicios** → **Crear**.
2. **Definición de tarea:** familia `api-multiagente`, revisión última.
3. **Nombre del servicio:** `svc-api-multiagente`.
4. **Número de tareas:** 1 (o más si quieres alta disponibilidad).
5. **Red:**
   - VPC y subredes: por defecto o las que uses (subredes públicas si quieres IP pública).
   - **Balanceador de carga (opcional):** si quieres una URL fija (ej. `api.tudominio.com`), crea un **Application Load Balancer**, un grupo objetivo y asocia este servicio a ese ALB en el puerto 3003. Así la URL del backend será la del ALB (o el dominio que apunte al ALB).
6. Si no usas balanceador: tras crear el servicio, en **Tareas** → clic en la tarea → **Redworking**: verás la **IP pública** (si la tarea está en subred pública). La URL sería `http://IP_PUBLICA:3003`. Esa IP puede cambiar si la tarea se reinicia; por eso el ALB es recomendable para producción.
7. **Crear servicio**.

---

## Cómo obtienes la URL del backend

- **Con ALB:** la URL es la del balanceador (ej. `http://nombre-alb-123456789.us-east-1.elb.amazonaws.com` o `https://api.tudominio.com` si configuras dominio y certificado).
- **Sin ALB:** `http://IP_PUBLICA_DE_LA_TAREA:3003` (recuerda abrir el puerto 3003 en el grupo de seguridad de la tarea/servicio).

Esa URL es la “base” que le das a tu amigo (ej. `https://api.tudominio.com` o `http://ALB_URL`). Los endpoints serían:

- `POST /api/v1/auth/login`
- `GET /api/v1/agent/transactions?from=...&to=...`
- etc.

---

## Resumen

- **Docker no va en tu PC:** la imagen se construye en **CodeBuild** (en la nube) y se sube a **ECR**. **ECS Fargate** ejecuta esa imagen; no instalas Docker en AWS tú mismo.
- **Orden:** ECR (repositorio) → CodeBuild (build desde GitHub con `buildspec.yml`) → Secrets Manager (JWT + Firebase) → ECS clúster → ECS definición de tarea (Fargate, imagen ECR, puerto 3003) → ECS servicio (y opcionalmente ALB para la URL).
- Los archivos que ya tienes en el repo (`Dockerfile`, `.dockerignore`, `buildspec.yml`) y el cambio en `server.js` para leer Firebase desde variable de entorno son la base para que todo esto funcione sin tener Docker en tu PC.

Si quieres, el siguiente paso puede ser detallar solo la parte de **CodeBuild** (qué poner en cada pantalla) o la de **ECS + ALB** para dejar una URL fija.
