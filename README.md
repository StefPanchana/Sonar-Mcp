# SonarQube MCP Server

MCP Server personalizado para integración completa con SonarQube 10.6+ y Amazon Q Developer

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

Agregar al archivo de configuración MCP de Amazon Q Developer:

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
        "-e", "SONARQUBE_TOKEN=tu-token-aqui",
        "-e", "SONARQUBE_URL=https://tu-sonar-server.com",
        "sonarqube-mcp"
      ]
    }
  }
}
```

### Variables de entorno requeridas:
- `SONARQUBE_TOKEN` - Token de autenticación de SonarQube
- `SONARQUBE_URL` - URL del servidor SonarQube

## 🛠️ Herramientas disponibles

### 📊 Análisis de proyectos
- `get_projects` - Listar todos los proyectos disponibles
- `get_project_metrics` - Obtener métricas detalladas (con soporte de ramas)
- `analyze_project_branches` - **Análisis completo automático de todas las ramas**

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

### Análisis completo de proyecto
```json
{
  "tool": "analyze_project_branches",
  "arguments": {
    "projectKey": "mi-proyecto-key"
  }
}
```

### Métricas de rama específica
```json
{
  "tool": "get_project_metrics",
  "arguments": {
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

## 🏗️ Arquitectura

```
Amazon Q Developer ↔ MCP Protocol ↔ SonarQube MCP Server ↔ SonarQube API 10.6+
```

- **TypeScript/Node.js** - Servidor MCP optimizado
- **Docker** - Containerización para portabilidad
- **Axios** - Cliente HTTP para API de SonarQube
- **MCP SDK** - Protocolo de comunicación estándar

## 📋 Compatibilidad

- **SonarQube:** 10.6+ (on-premise y cloud)
- **Amazon Q Developer:** Todas las versiones con soporte MCP
- **Node.js:** 18+
- **Docker:** Cualquier versión compatible

## 🤝 Contribución

Este MCP server está optimizado para uso empresarial con SonarQube on-premise y Amazon Q Developer, proporcionando análisis de calidad de código integral y automatizado.