# 🌿 Analiza Permiso SENPA

Una aplicación web moderna para análisis automatizado de permisos ambientales de República Dominicana, desarrollada para SENPA (Sistema Nacional de Evaluación de Permisos Ambientales).

![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![React](https://img.shields.io/badge/React-19.x-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🎯 Características Principales

### 📍 Análisis de Ubicación
- ✅ **Extracción automática** de coordenadas UTM y geográficas
- ✅ **Conversión inteligente** entre sistemas de coordenadas
- ✅ **Mapa interactivo** con Leaflet y OpenStreetMap
- ✅ **Integración con Google Maps** para navegación
- ✅ **Detección de múltiples puntos** de coordenadas

### 📅 Análisis de Fechas
- ✅ **Detección de fecha de emisión** en firma digital con código QR
- ✅ **Extracción de días autorizados** ("VÁLIDO POR X DÍAS")
- ✅ **Cálculo automático** de fecha de vencimiento
- ✅ **Estado del permiso** (válido/vencido/próximo a vencer)
- ✅ **Contador de días restantes** en tiempo real

### 🛡️ Funciones Avanzadas
- ✅ **Manejo inteligente de errores** con sugerencias específicas
- ✅ **Validación de documentos** no legibles
- ✅ **Soporte múltiples formatos** (JPG, PNG, WEBP, PDF)
- ✅ **Interfaz responsiva** y accesible
- ✅ **Tema institucional** en verdes suaves

## 🚀 Tecnologías

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **React** | 19.x | Framework frontend |
| **TypeScript** | 5.x | Tipado estático |
| **Vite** | 7.x | Build tool y dev server |
| **Tailwind CSS** | 3.x | Framework CSS |
| **Leaflet** | 1.9.x | Mapas interactivos |
| **OpenRouter API** | - | Procesamiento IA |
| **Llama 3.2 Vision** | - | Análisis de documentos |

## 📋 Requisitos Previos

- Node.js 18+ 
- npm 9+
- Cuenta en [OpenRouter](https://openrouter.ai) para API key

## 🛠️ Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/Almanzar001/analiza_permiso.git
cd analiza_permiso
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env y agregar tu API key
VITE_OPENROUTER_API_KEY=tu_api_key_de_openrouter
```

### 4. Ejecutar en desarrollo
```bash
npm run dev
```

### 5. Construir para producción
```bash
npm run build
npm run preview
```

## 🎮 Uso

### Análisis de Ubicación
1. Ve a la pestaña **"📍 Análisis de Ubicación"**
2. Sube una imagen/PDF que contenga coordenadas UTM o geográficas
3. La IA extraerá las coordenadas y mostrará el mapa
4. Haz clic en el marcador para abrir en Google Maps

### Análisis de Fechas
1. Ve a la pestaña **"📅 Análisis de Fechas"**
2. Sube una imagen que incluya el pie de página con la firma digital
3. La IA detectará la fecha de emisión y días autorizados
4. Verás el estado del permiso y días restantes

## 🏗️ Estructura del Proyecto

```
src/
├── components/          # Componentes React
│   ├── DateAnalysis.tsx    # Análisis de fechas
│   ├── FileUpload.tsx      # Subida de archivos
│   ├── MapView.tsx         # Mapa interactivo
│   └── PermitAnalysis.tsx  # Análisis de ubicación
├── services/            # Servicios externos
│   └── aiService.ts        # Integración con OpenRouter
├── utils/              # Utilidades
│   └── coordinateUtils.ts  # Conversión de coordenadas
├── types.ts            # Tipos TypeScript
├── App.tsx            # Componente principal
└── main.tsx          # Punto de entrada
```

## 🌍 Optimizado para República Dominicana

Esta aplicación está específicamente optimizada para permisos del:
- **Ministerio de Medio Ambiente y Recursos Naturales (MARENA)**
- **Sistema Nacional de Evaluación de Permisos Ambientales (SENPA)**

### Formatos Soportados:
- ✅ Coordenadas UTM (Zonas 19N/20N)
- ✅ Coordenadas geográficas (WGS84)
- ✅ Fechas en formato dominicano
- ✅ Firma digital con código QR

## 🔧 Configuración Avanzada

### Variables de Entorno
```bash
# Requerido
VITE_OPENROUTER_API_KEY=sk-or-v1-xxxxx

# Opcional
VITE_APP_NAME=Analiza Permiso SENPA
VITE_APP_VERSION=1.0.0
```

### Modelos IA Soportados
- `meta-llama/llama-3.2-90b-vision-instruct` (Recomendado)
- `anthropic/claude-3.5-sonnet`
- `openai/gpt-4-vision-preview`

## 📈 Roadmap

- [ ] Exportación de reportes PDF
- [ ] API REST para integración
- [ ] Base de datos de permisos analizados  
- [ ] Notificaciones de vencimiento
- [ ] Dashboard administrativo

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👥 Equipo

- **Desarrollado para SENPA** - República Dominicana
- **Optimizado para MARENA** - Ministerio de Medio Ambiente

## 🆘 Soporte

Si encuentras algún problema o tienes preguntas:

1. Revisa los [Issues existentes](https://github.com/Almanzar001/analiza_permiso/issues)
2. Crea un [Nuevo Issue](https://github.com/Almanzar001/analiza_permiso/issues/new)
3. Proporciona detalles del problema y screenshots

---

<div align="center">
  <p>🌿 <strong>Hecho con ❤️ para el medio ambiente de República Dominicana</strong> 🇩🇴</p>
</div>