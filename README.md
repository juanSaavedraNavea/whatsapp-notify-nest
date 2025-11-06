# 📱 API de Notificaciones por WhatsApp

API desarrollada en **NestJS** que permite gestionar y enviar **notificaciones automatizadas por WhatsApp**, utilizando [`whatsapp-web.js`](https://github.com/pedroslopez/whatsapp-web.js) y sesiones persistentes con **MongoDB Atlas**.

Incluye:
- Envío de mensajes, imágenes, GIFs y archivos.
- Sesión persistente con RemoteAuth.
- Generación automática de reportes Excel.
- Integración lista para contenedores Docker.
- Tests automáticos con Jest (unit & e2e).

---

## 🧠 Tecnologías principales

| Tecnología | Uso |
|-------------|-----|
| **NestJS** | Framework principal para la API |
| **MongoDB Atlas** | Base de datos remota para guardar sesiones y logs |
| **whatsapp-web.js** | Envío de mensajes a través de WhatsApp Web |
| **Puppeteer** | Control del navegador headless para sesión WA |
| **ExcelJS** | Generación de reportes en Excel |
| **Docker** | Contenerización de la aplicación |
| **Jest + Supertest** | Testing unitario y end-to-end |

---

## ⚙️ Requisitos previos

- **Node.js 20+**
- **Docker** y **Docker Compose**
- Acceso a una base de datos en **MongoDB Atlas**
- Un número de WhatsApp que se usará como emisor

---

## 🚀 Instalación local

```bash
# Clonar el repositorio
git clone https://github.com/juanSaavedraNavea/whatsapp-notify-nest.git
cd whatsapp-notify

# Instalar dependencias
npm install

# Compilar el proyecto
npm run build

# Iniciar la API localmente
npm run start
```

Por defecto la API se ejecuta en:
```
http://localhost:3000
```

---

## 🧰 Variables de entorno (`.env`)

Ejemplo:

```env
# App
PORT=3000
NODE_ENV=production
TZ=America/Santiago

# MongoDB Atlas
MONGODB_URI="mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/ceranalytics"

# WhatsApp RemoteAuth
WPP_DATA_DIR=/app/.wpp
WPP_CLIENT_ID=Active
WPP_GROUP_CONFIRMATION=120363152618711111@g.us
```

> ⚠️ Si tu password tiene caracteres especiales (`@`, `#`, `:`), escápalos en la URI (`@` → `%40`, `#` → `%23`, etc.)

---

## 🐳 Despliegue con Docker

### 🔹 Build normal
```bash
make build
make up
```

### 🔹 Build sin caché (forzado)
```bash
make build-nc
make up
```

### 🔹 Ver logs
```bash
make logs
```

### 🔹 Detener y limpiar
```bash
make down
```

### 🔹 Healthcheck
La API expone un endpoint de métricas Prometheus en:
```
GET /api/metrics
```

---

## 🧭 Endpoints principales

### 🟢 Iniciar sesión de WhatsApp

**GET** `/api/whatsapp/start-session`  
Devuelve un código QR en base64 para escanear desde WhatsApp Web.

**Response:**
```json
{
  "message": "Escanea este QR para iniciar sesión",
  "qr": "data:image/png;base64,iVBORw0KGgoAAA..."
}
```

---

### 🗒️ Listar grupos de WhatsApp

**GET** `/api/whatsapp/groups?invite=true`  
Devuelve la lista de grupos disponibles y (opcionalmente) su código de invitación.

**Response:**
```json
{
  "count": 2,
  "groups": [
    {
      "id": "120363152618761132@g.us",
      "name": "Equipo Ventas",
      "participantsCount": 14,
      "inviteCode": "AbCdEfGhIjK"
    }
  ]
}
```

---

### ✉️ Enviar notificaciones

**POST** `/api/notifications/send`

**Body:**
```json
{
  "cod": "T02",
  "alert": false
}
```

Envía todas las notificaciones asociadas al código entregado (`cod`), genera un Excel con los resultados y envía un resumen a un grupo de confirmación.

**Response:**
```json
{
  "message": "La notificación fue enviada con éxito"
}
```

---

## 🧪 Tests

Ejecuta los tests unitarios y e2e:

```bash
# Unitarios
npm run test

# E2E
npm run test:e2e
```

Genera reporte de cobertura:
```bash
npm run test:cov
```

---

## 🧱 Makefile útil

| Comando | Descripción |
|----------|--------------|
| `make build` | Construye la imagen Docker |
| `make build-nc` | Construye sin caché |
| `make up` | Levanta el contenedor |
| `make rebuild` | Build + Up en un paso |
| `make logs` | Muestra logs |
| `make down` | Detiene y elimina contenedores |
| `make test` | Ejecuta los tests unitarios |
| `make test-e2e` | Ejecuta los tests e2e |
| `make clean` | Limpia volúmenes e imágenes |
| `make dev` | Inicia la API en modo desarrollo |

---

## 🧩 Estructura del proyecto

```
src/
├── whatsapp/
│   ├── whatsapp.controller.ts
│   ├── whatsapp.service.ts
│   └── whatsapp.module.ts
├── notifications/
│   ├── notifications.controller.ts
│   ├── notifications.service.ts
│   └── notifications.module.ts
├── schemas/
│   └── whatsapp-notification.schema.ts
├── utils/
│   └── logger.ts
└── main.ts
```

---
## 📌 Guía de uso (paso a paso)

> Orden recomendado para que todo funcione de primera.

### 1) Iniciar sesión de WhatsApp (escanear QR)
1. Levanta la API.
2. Abre **GET** `/api/whatsapp/start-session`.
3. Escanea el **QR** desde tu celular (WhatsApp > Dispositivos vinculados).
4. La sesión queda persistente en el directorio configurado por `WPP_DATA_DIR`.

> Si no ves el QR inmediatamente, espera unos segundos y refresca: la primera vez Puppeteer descarga Chromium.

---

### 2) Crear un grupo de confirmación y guardar su ID
1. Crea un **grupo en WhatsApp** donde quieras recibir el registro de las notificaciones enviadas.
2. Llama a **GET** `/api/whatsapp/groups` para listar los grupos y obtener el **id** (JID) de tu grupo (termina en `@g.us`).
3. Pon ese **id** en tu `.env`:
   ```env
   WPP_GROUP_CONFIRMATION=120363152618711111@g.us
   ```
4. Reinicia la API si cambiaste variables de entorno.

> Si necesitas el **invite code** (y eres admin del grupo), usa `/api/whatsapp/groups?invite=true`.

---

### 3) Crear las notificaciones en MongoDB
Debes insertar documentos en la colección **`WhatsAppNotification`**.  
Ejemplo mínimo:

```json
{
  "cod": "T03",
  "typeMessage": "Notification",
  "type": "WhatsApp",
  "statusSend": false,
  "message": {
    "message": "Hola mundo!!",
    "url": "",
    "nameFile": "",
    "caption": "",
    "images": [],
    "documens": []
  },
  "contacts": [
    {
      "name": "username",
      "number": "56912345678"
    }
  ]
}
```

- `cod`: identificador lógico para agrupar qué notificación enviar.
- `typeMessage`: tipo de mensaje a enviar:
  - `Notification`: solo texto
  - `File`: un archivo adjunto (usar `message.url`)
  - `Image`: una imagen (usar `message.url`)
  - `Gif`: GIF que se envía como **video mp4** (usar `message.url`)
  - `Files`: **varios** archivos (usar `message.documens` — *tal cual está en el código*)
  - `Images`: **varias** imágenes (usar `message.images`)
- `message`:
  - `message`: texto/caption del mensaje
  - `url`: cuando es `File`, `Image` o `Gif`
  - `nameFile`: nombre sugerido del archivo
  - `caption`: (opcional) texto adicional para media
  - `images`: array de URLs (para `Images`)
  - `documens`: array de URLs (para `Files`) **(sic)**  
  > Los **archivos/imagenes/GIF** deben ser **URLs públicas** (subidas a un storage externo como Firebase, S3, etc.)
- `contacts`: a quiénes enviar. Puedes incluir **varios** contactos.
  - `number`: debe ir **con código de país** y **sin “+”**. Ej: Chile → `569XXXXXXXX`.

> `statusSend` debe partir en **false**; la API lo pondrá en true al enviar.

---

### 4) Enviar notificaciones por código
Usa el endpoint:

**POST** `/api/notifications/send`

**Body:**
```json
{
  "cod": "T03",
  "alert": false
}
```

- `cod`: el mismo que guardaste en Mongo para esa tanda de mensajes.
- `alert`:
  - **false** (por defecto): registra el envío en tu **grupo de confirmación** (`WPP_GROUP_CONFIRMATION`) y adjunta Excel con el detalle.
  - **true**: **no** envía el resumen al grupo (modo silencioso).

> Si necesitas reintentar un envío fallido, asegúrate de que el documento correspondiente siga con `statusSend: false` o vuelve a crear uno nuevo con el mismo `cod`.


---

## 🧰 Troubleshooting

| Problema | Posible causa | Solución |
|-----------|----------------|-----------|
| ❌ `Cannot find Chromium` | Puppeteer no encuentra su binario | Asegúrate de no tener `PUPPETEER_SKIP_DOWNLOAD=true` |
| ❌ `MongoNetworkError` | IP no permitida en Atlas | Agrega tu IP pública en Network Access |
| ⚠️ QR no aparece | Cliente aún inicializando | Espera unos segundos y vuelve a llamar a `/api/whatsapp/start-session` |
| ⚠️ Sesión no persiste | Carpeta `.wpp` sin volumen persistente | Verifica `./wpp-data` esté montada correctamente |
| ❌ Error en Puppeteer por permisos | Sandbox bloqueado | Usa los flags `--no-sandbox` y `--disable-setuid-sandbox` (ya incluidos) |

---

## 🧰 Despliegue en producción

1. Crea tu archivo `.env` con tus credenciales de Atlas y configuración.
2. Ejecuta:
   ```bash
   make build-nc
   make up
   ```
3. Abre en navegador:
   ```
   http://<tu-servidor>:3000/api/whatsapp/start-session
   ```
4. Escanea el QR desde tu teléfono (solo la primera vez).
5. La sesión quedará persistente en el volumen `./wpp-data`.

---

## 🧑‍💻 Contribución

1. Haz un fork del repositorio  
2. Crea una rama:  
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```
3. Commit:  
   ```bash
   git commit -m "feat: agrega nueva funcionalidad"
   ```
4. Push:  
   ```bash
   git push origin feature/nueva-funcionalidad
   ```
5. Crea un Pull Request 🚀  

---

## 🧡 Autor

**Juan Saavedra Navea**  
Desarrollador Back-End / QA / Data Analyst  
📍 Chile  
💼 [LinkedIn](https://www.linkedin.com/in/juan-saavedra-navea-664639206/)  
🐙 [GitHub](https://github.com/juanSaavedraNavea)

---
