@echo off
echo ============================================
echo Iniciando Servidor Firestore Proxy para n8n
echo ============================================
echo.

REM Verificar si Node.js está instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js no está instalado
    pause
    exit /b 1
)

REM Verificar si existe serviceAccountKey.json
if not exist "serviceAccountKey.json" (
    echo ERROR: No se encuentra serviceAccountKey.json
    echo Por favor copia el archivo desde credenciales/
    pause
    exit /b 1
)

echo El servidor estará disponible en: http://localhost:3003
echo.
echo Presiona Ctrl+C para detener el servidor
echo.
pause

REM Iniciar servidor
node server.js
