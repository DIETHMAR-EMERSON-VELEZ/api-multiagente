# Lo que le entregas a tu amigo (desarrollador de la Central Gerencial)

Tu amigo te pidió: **"Pásame tu API REST de tu APK"**.

Esto es lo que le das.

---

## 1. Qué es lo que tienes

- **Tu APK (Android)** guarda y usa datos en **Firestore**.
- **Tu API REST** (la que armamos en la carpeta `firestore-proxy`) lee esos mismos datos de Firestore y los expone por HTTP para que otro sistema (la Central) los consuma.

O sea: **tu API REST es el “puente” entre tus datos (APK + Firestore) y el software de la Central que hace tu amigo.**

Tú no desarrollas la Central; solo le pasas **tu API**.

---

## 2. Qué tiene que recibir él para usar “tu API REST”

Para que la Central pueda usar tu API, tu amigo necesita **dos cosas**:

1. **Una URL base** donde esté tu API (ej: `https://tu-api.en-internet.com` o `http://tu-ip:3003`).
2. **Credenciales** para obtener el token y llamar a los endpoints:
   - Usuario: `central_audit`
   - Contraseña: `admin123`

Y opcional: la lista de endpoints y ejemplos (eso ya lo tienes en otros documentos).

---

## 3. Cómo puede usar tu API: dos opciones

### Opción A: Tú subes la API a internet (recomendado)

- Tú despliegas el proyecto `firestore-proxy` en un servicio (Railway, Render, Google Cloud Run, etc.).
- Obtienes una URL pública, por ejemplo: `https://financial-api-xxxx.railway.app`.
- Le pasas a tu amigo:
  - **URL base:** `https://financial-api-xxxx.railway.app`
  - **Credenciales:** usuario `central_audit`, contraseña `admin123`
  - **Endpoints:** la lista que ya tienes (transactions, daily-summary, closures, etc.).

Él desde su Central solo hace:
- Login a `POST .../api/v1/auth/login` con esas credenciales.
- Luego llama a `GET .../api/v1/agent/transactions`, etc., con el token.

Así “le pasas tu API REST de tu APK” sin que él toque tu código.

---

### Opción B: Le pasas el código y él la hospeda

- Le entregas la carpeta `firestore-proxy` (o un ZIP) con el código.
- Le das las instrucciones para instalar (Node, `npm install`, `.env`, `serviceAccountKey.json`) y ejecutar (`npm start`).
- Él la sube a un servidor que tenga URL pública y te dice la URL, o la usa en su propio servidor.

En ese caso “tu API REST” es el mismo proyecto; solo que él la corre en su lado.

---

## 4. Resumen para decirle a tu amigo

Puedes enviarle algo así:

- *“La API REST de mi APK es un servidor que expone los datos de caja/transacciones/cierres. Te la dejo disponible así:”*
  - **Si la desplegaste tú:**  
    *“URL: https://tu-url.com — Usuario: central_audit — Contraseña: admin123. Endpoints: [lista que ya tienes].”*
  - **Si le pasas el código:**  
    *“Te paso el proyecto para que lo hospedes tú; la URL será la que tú configures. Credenciales: central_audit / admin123.”*

Con eso ya le “pasaste tu API REST de tu APK”. Él no necesita que tú desarrolles la Central; solo que tu API esté disponible (por URL) y con esas credenciales.

---

## 5. Importante

- **Localhost** solo sirve en tu PC. Para que la Central (en otra máquina) use tu API, la API tiene que estar en una **URL accesible en internet** (opción A) o que él la suba y te dé la URL (opción B).
- Lo que construimos en `firestore-proxy` **es** tu API REST; no hace falta sacar “otra API” de la APK. La APK ya escribe en Firestore y la API lee de ahí para la Central.

Si quieres, en el siguiente paso te digo exactamente cómo desplegar en un servicio gratis (por ejemplo Railway o Render) para tener la URL y solo pasarle eso a tu amigo.
