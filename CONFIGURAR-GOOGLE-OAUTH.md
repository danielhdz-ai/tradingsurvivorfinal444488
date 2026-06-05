# 🔐 Configuración de Google OAuth en Trading Survivor

## ✅ Cambios Implementados

Se han agregado botones de **"Continuar con Google"** en:
- [login.html](login.html) - Pantalla de inicio de sesión
- [register.html](register.html) - Pantalla de registro

Los usuarios ahora pueden autenticarse con su cuenta de Google además del método tradicional de email/contraseña.

---

## 📋 Configuración Requerida en Supabase

Para que el login con Google funcione, debes configurarlo en tu proyecto de Supabase:

### 1️⃣ Obtener credenciales de Google Cloud

1. **Ve a Google Cloud Console**:
   - https://console.cloud.google.com/

2. **Crea un nuevo proyecto** (o selecciona uno existente):
   - Haz clic en el selector de proyectos (arriba a la izquierda)
   - "New Project" → Nombre: "Trading Survivor"
   - Haz clic en "Create"

3. **Habilita la API de Google+**:
   - En el menú lateral: **APIs & Services** → **Library**
   - Busca "Google+ API"
   - Haz clic en "Enable"

4. **Configura la pantalla de consentimiento OAuth**:
   - Ve a **APIs & Services** → **OAuth consent screen**
   - Selecciona **External** → "Create"
   - Completa la información básica:
     - **App name**: Trading Survivor
     - **User support email**: tu email
     - **Developer contact**: tu email
   - Haz clic en "Save and Continue"
   - En "Scopes": haz clic en "Save and Continue" (sin agregar nada)
   - En "Test users": puedes agregar tu email para pruebas
   - Haz clic en "Save and Continue"

5. **Crea las credenciales OAuth 2.0**:
   - Ve a **APIs & Services** → **Credentials**
   - Haz clic en **"Create Credentials"** → **OAuth client ID**
   - Application type: **Web application**
   - Name: "Trading Survivor Web"
   - **Authorized JavaScript origins**:
     ```
     https://tradingsurvivor.com
     http://localhost:5500
     http://127.0.0.1:5500
     ```
   - **Authorized redirect URIs**:
     ```
     https://gakiamardmlgftfrlxkm.supabase.co/auth/v1/callback
     http://localhost:5500/platform.html
     http://127.0.0.1:5500/platform.html
     ```
     ⚠️ **Importante**: Reemplaza `gakiamardmlgftfrlxkm` con tu Project Reference de Supabase

   - Haz clic en **"Create"**
   - **Copia el Client ID y Client Secret** (los necesitarás en el siguiente paso)

### 2️⃣ Configurar Google OAuth en Supabase

1. **Abre tu proyecto de Supabase**:
   - Ve a https://supabase.com
   - Abre tu proyecto de Trading Survivor

2. **Ve a Authentication → Providers**:
   - En el menú lateral: **Authentication** → **Providers**
   - Busca **Google** en la lista
   - Haz clic en **Google** para expandir

3. **Habilita Google OAuth**:
   - Activa el toggle **"Enable Sign in with Google"**
   - **Client ID**: Pega el Client ID de Google Cloud
   - **Client Secret**: Pega el Client Secret de Google Cloud
   - Haz clic en **"Save"**

4. **Copia la Callback URL de Supabase**:
   - Copia el valor de "Callback URL (for OAuth)" que aparece en la configuración
   - Ejemplo: `https://gakiamardmlgftfrlxkm.supabase.co/auth/v1/callback`
   - **Verifica** que esta URL esté en las "Authorized redirect URIs" de Google Cloud (paso 1.5)

### 3️⃣ Configurar URLs de redirección

1. **En Supabase → Authentication → URL Configuration**:
   - **Site URL**: `https://tradingsurvivor.com`
   - **Redirect URLs**: Agrega estas URLs:
     ```
     https://tradingsurvivor.com/platform.html
     http://localhost:5500/platform.html
     http://127.0.0.1:5500/platform.html
     ```

### 4️⃣ Probar el login con Google

1. **Abre tu aplicación**:
   - En desarrollo: http://localhost:5500/login.html
   - En producción: https://tradingsurvivor.com/login.html

2. **Haz clic en "Continuar con Google"**:
   - Deberías ser redirigido a la pantalla de Google
   - Selecciona tu cuenta de Google
   - Acepta los permisos
   - Serás redirigido a `platform.html` con tu sesión iniciada

---

## 🔍 Solución de Problemas

### Error: "redirect_uri_mismatch"
**Causa**: La URL de redirección no está autorizada en Google Cloud.

**Solución**:
1. Ve a Google Cloud Console → Credentials
2. Edita tu OAuth 2.0 Client ID
3. Verifica que las "Authorized redirect URIs" incluyan:
   - Tu callback URL de Supabase: `https://TU-PROJECT-REF.supabase.co/auth/v1/callback`
   - URLs de desarrollo si estás probando localmente

### Error: "Access blocked: This app's request is invalid"
**Causa**: La pantalla de consentimiento OAuth no está configurada correctamente.

**Solución**:
1. Ve a Google Cloud Console → OAuth consent screen
2. Completa toda la información requerida
3. Publica la app (o agrégala a usuarios de prueba)

### El usuario no se crea en Supabase
**Causa**: Puede haber un problema con los permisos RLS.

**Solución**:
1. Ve a Supabase → Authentication → Policies
2. Verifica que las políticas permitan la creación de usuarios
3. Revisa los logs de autenticación en Supabase

### El login funciona pero no redirige a platform.html
**Causa**: La URL de redirección no está en la lista permitida.

**Solución**:
1. Ve a Supabase → Authentication → URL Configuration
2. Agrega `https://tradingsurvivor.com/platform.html` a las Redirect URLs

---

## 📊 Verificación

Una vez configurado correctamente:

✅ El botón "Continuar con Google" aparece en login.html y register.html  
✅ Al hacer clic, redirige a Google para autenticación  
✅ Después de autenticar, redirige a platform.html  
✅ El usuario aparece en Supabase → Authentication → Users  
✅ La sesión persiste después de recargar la página  

---

## 🚀 Deploy a Producción

Cuando subas los cambios a producción:

1. **Actualiza las Authorized JavaScript origins en Google Cloud**:
   - Agrega: `https://tradingsurvivor.com`

2. **Actualiza las Authorized redirect URIs en Google Cloud**:
   - Agrega: `https://tradingsurvivor.com/platform.html`

3. **Verifica la Site URL en Supabase**:
   - Debe ser: `https://tradingsurvivor.com`

4. **Verifica las Redirect URLs en Supabase**:
   - Deben incluir: `https://tradingsurvivor.com/platform.html`

---

## 📝 Notas Adicionales

- **Privacidad**: Google solo comparte el email y nombre del usuario. No se comparte información sensible.
- **Seguridad**: Supabase maneja toda la autenticación de forma segura. Los tokens OAuth no se exponen al frontend.
- **Usuarios existentes**: Si un usuario ya tiene cuenta con email/password y luego usa Google OAuth con el mismo email, Supabase vinculará las cuentas automáticamente.
- **Emails verificados**: Los usuarios que se registran con Google automáticamente tienen su email verificado.

---

✅ **Una vez completada esta configuración, tus usuarios podrán iniciar sesión con Google en Trading Survivor.**
