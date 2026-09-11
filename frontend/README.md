# Frontend — Aplicación Web React + Vite

## Descripción

Interfaz web de EcoBite desarrollada con **React 18 + Vite**. Proporciona la experiencia del usuario para navegar el catálogo, crear pedidos y ver el impacto ambiental generado.

## Stack Tecnológico

- **Framework:** React 18
- **Build tool:** Vite
- **Routing:** React Router v6
- **Estilos:** Tailwind CSS
- **State management:** Context API
- **HTTP client:** Fetch API / Axios

## Estructura de carpetas

```
frontend/
├── src/
│   ├── components/         # Componentes reutilizables
│   ├── pages/              # Páginas/rutas principales
│   ├── services/           # Llamadas a API
│   ├── context/            # Estado global (carrito, autenticación)
│   ├── styles/             # Tailwind config
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js
└── README.md               # Este archivo
```

## Primeros pasos

### 1. Instalar dependencias

```bash
npm install
```

### 2. Iniciar servidor (desarrollo)

```bash
npm run dev
```

La app estará disponible en `http://localhost:5173`

## Componentes principales

- **Navbar** — Navegación global
- **RestaurantCard** — Tarjeta de restaurante
- **CartItem** — Ítem en el carrito
- **GreenBadge** — Indicador eco-friendly
- **Dashboard** — Panel admin (protegido)

## Documentación

Ver `/docs/api/postman-collection.json` para entender qué endpoints consume el frontend.
