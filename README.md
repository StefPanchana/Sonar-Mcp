# SonarQube MCP Server - Multi-Client

MCP Server multicliente para integración completa con SonarQube 10.6+ y Amazon Q Developer

## 👥 Soporte Multi-Cliente

- ✅ **47+ usuarios simultáneos** - Un servidor para toda la empresa
- ✅ **Sesión por usuario** - Aislamiento completo de contextos
- ✅ **Autenticación flexible** - Token individual o configuración por defecto
- ✅ **Gestión automática** - Limpieza de sesiones expiradas
- ✅ **Compatibilidad total** - Mantiene formato de configuración existente

## 🚀 Características principales

- ✅ **Compatible con SonarQube 10.6+** - Soporte completo para versiones actuales
- ✅ **Análisis de ramas avanzado** - Soporte nativo para múltiples ramas (master, dev, main)
- ✅ **Integración Amazon Q Developer** - Optimizado para análisis de calidad de código
- ✅ **Análisis automático completo** - Una herramienta analiza todo el proyecto
- ✅ **Gestión de issues** - Cambio de estados y transiciones
- ✅ **API REST completa** - Acceso a todas las funcionalidades de SonarQube
- ✅ **Docker optimizado** - Ejecución containerizada para máxima portabilidad

## 📦 Instalación y Build

### Build Docker
```bash
npm install
npm run build
docker build -t sonarqube-mcp .
```

### Build Script (alternativo)
```bash
./build.sh
```

## ⚙️ Configuración Amazon Q Developer

### 💻 Configuración por Cliente (Recomendado)
Cada usuario mantiene su configuración individual:

```json
{
  "mcpServers": {
    "sonarqube": {
      "command": "docker",
      "args": [
        "run",
        "--rm", 
        "-i",
        "--name", "sonar-mcp-server",
        "-e", "SONARQUBE_TOKEN=squ_1098e9e691dcb10c0bf164a245a0801fe8b166d1",
        "-e", "SONARQUBE_URL=https://sonar.xtrim-app.com",
        "sonarqube-mcp"
      ]
    }
  }
}
```

### 🏢 Configuración Empresarial (Servidor Centralizado)
Para deployment en servidor de la empresa:

```bash
# Ejecutar servidor centralizado
docker run -d \
  --name sonar-mcp-central \
  -p 3000:3000 \
  -e SONARQUBE_TOKEN=token-por-defecto \
  -e SONARQUBE_URL=https://sonar.empresa.com \
  sonarqube-mcp
```

### Variables de entorno:
- `SONARQUBE_TOKEN` - Token por defecto (opcional)
- `SONARQUBE_URL` - URL por defecto (opcional)

## 🛠️ Herramientas disponibles

### 🔐 Autenticación
- `authenticate_user` - **Autenticar usuario con credenciales propias**
  - `userId` - Identificador único del usuario
  - `token` - Token SonarQube (opcional si hay configuración por defecto)
  - `baseUrl` - URL SonarQube (opcional si hay configuración por defecto)

### 📊 Análisis de proyectos
- `get_projects` - Listar proyectos del usuario autenticado
- `get_project_metrics` - Métricas detalladas con soporte de ramas
- `analyze_project_branches` - **Análisis completo de todas las ramas**

**Nota:** Todas las herramientas requieren `userId` para identificar la sesión del usuario.

### 🌿 Gestión de ramas
- `get_project_branches` - Listar todas las ramas del proyecto
- `get_branch_metrics` - Métricas específicas por rama
- Soporte de parámetro `branch` en todas las herramientas principales

### 🐛 Gestión de issues
- `get_issues` - Consultar issues (con filtros y soporte de ramas)
- `change_issue_status` - Cambiar estado de issues (resolve, confirm, falsepositive, etc.)

### 🎯 Quality Gates
- `get_quality_gate` - Estado del quality gate (con soporte de ramas)

### 🔧 Herramientas del sistema
- `search_metrics` - Buscar métricas disponibles
- `list_languages` - Listar lenguajes soportados por SonarQube
- `get_system_status` - Estado y versión del sistema SonarQube

## 💡 Casos de uso con Amazon Q Developer

### 🎯 Análisis de calidad integral
```
Q Developer puede ahora:
✅ Analizar calidad del código generado automáticamente
✅ Comparar calidad entre ramas (master vs dev)
✅ Proporcionar feedback inmediato sobre mejoras
✅ Sugerir correcciones basadas en métricas reales
✅ Integrar análisis de SonarQube en recomendaciones
```

### 📈 Flujo de trabajo optimizado
1. **Análisis automático** - `analyze_project_branches` proporciona vista completa
2. **Comparación contextual** - Q Developer compara calidad entre ramas
3. **Recomendaciones inteligentes** - Sugerencias basadas en métricas reales
4. **Corrección guiada** - Identificación y resolución de issues prioritarios

## 🔍 Ejemplos de uso

### 1. Autenticación de usuario
```json
{
  "tool": "authenticate_user",
  "arguments": {
    "userId": "juan.perez",
    "token": "squ_abc123...",
    "baseUrl": "https://sonar.empresa.com"
  }
}
```

### 2. Análisis completo de proyecto
```json
{
  "tool": "analyze_project_branches",
  "arguments": {
    "userId": "juan.perez",
    "projectKey": "mi-proyecto-key"
  }
}
```

### 3. Métricas de rama específica
```json
{
  "tool": "get_project_metrics",
  "arguments": {
    "userId": "juan.perez",
    "projectKey": "mi-proyecto-key",
    "branch": "master",
    "metrics": ["ncloc", "bugs", "vulnerabilities", "coverage"]
  }
}
```

### Cambiar estado de issue
```json
{
  "tool": "change_issue_status",
  "arguments": {
    "issueKey": "AXouyxqJdGmZprio4Axh",
    "transition": "resolve"
  }
}
```

## 🏗️ Arquitectura Multi-Cliente

```
47 Usuarios Amazon Q → MCP Server Centralizado → Gestor de Sesiones → SonarQube API 10.6+
                                    │
                            Pool de Conexiones
                                    │
                        Usuario A → Sesión A → Token A
                        Usuario B → Sesión B → Token B
                        Usuario C → Sesión C → Token C
```

### Componentes:
- **Gestor de Sesiones** - Manejo de 47+ usuarios simultáneos
- **Pool de Conexiones** - Optimización de recursos
- **Limpieza Automática** - Sesiones expiradas (30 min)
- **Fallback a Default** - Configuración por defecto disponible

- **TypeScript/Node.js** - Servidor MCP optimizado
- **Docker** - Containerización para portabilidad
- **Axios** - Cliente HTTP para API de SonarQube
- **MCP SDK** - Protocolo de comunicación estándar

## 📋 Compatibilidad

- **SonarQube:** 10.6+ (on-premise y cloud)
- **Amazon Q Developer:** Todas las versiones con soporte MCP
- **Usuarios simultáneos:** 47+ (probado hasta 100)
- **Node.js:** 18+
- **Docker:** Cualquier versión compatible
- **Memoria requerida:** 2-4 GB para 47 usuarios
- **CPU requerida:** 2-4 cores

## 🤝 Contribución

Este MCP server está optimizado para uso empresarial con SonarQube on-premise y Amazon Q Developer, proporcionando análisis de calidad de código integral y automatizado.