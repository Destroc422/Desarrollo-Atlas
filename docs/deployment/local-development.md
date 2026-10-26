# Entorno local

## Requisitos

- Docker Engine con soporte para Compose v2.
- Puertos locales libres: `5432` (PostgreSQL), `15672` (RabbitMQ Management) y `8080` (Gateway). Se pueden cambiar desde `.env`.
- Node.js y npm para ejecutar el prototipo web.

Las imágenes están fijadas a PostgreSQL `18.6-alpine3.24`, RabbitMQ `4.4.0-management-alpine` y Traefik `v3.7.16`. Verificar tags y actualizar versiones de forma deliberada al renovar dependencias.

## Prototipo web

Desde la carpeta `frontend/`, ejecutar `npm install` y `npm run dev`. Vite inicia en `http://localhost:5173`. La interfaz es navegable y permite probar filtros, crear productos, registrar ingresos y consultar detalles de activos. Estos datos se guardan en `localStorage` y no se envían a ningún servicio.

Para generar el paquete estático: `npm run build`. El prototipo no requiere Docker ni el backend.

## Arranque

1. Copiar `.env.example` a `.env`.
2. Cambiar los valores `local_only_change_me` si otros usuarios pueden acceder al equipo.
3. Ejecutar `docker compose up -d` desde la raíz.
4. Consultar disponibilidad con `docker compose ps` y logs con `docker compose logs -f postgres rabbitmq api-gateway`.

PostgreSQL crea una base y usuario runtime por cada uno de los once contextos cuando inicializa por primera vez el volumen. RabbitMQ inicia en el vhost `/platform`. PostgreSQL, RabbitMQ y sus datos quedan en redes privadas; los puertos publicados se enlazan a `127.0.0.1`. Traefik escucha en `http://localhost:8080` y aplica cabeceras, CORS de desarrollo y límite inicial de solicitudes. Hasta que se conecte el primer servicio no hay rutas de negocio.

## Persistencia y limpieza

`docker compose down` detiene y elimina los contenedores, pero conserva los volúmenes. El bootstrap de bases y roles se ejecuta solo cuando PostgreSQL inicia con un volumen vacío. Cambiar contraseñas en `.env` después de inicializar no rota credenciales existentes; hay que rotarlas explícitamente en PostgreSQL/RabbitMQ.

No usar `docker compose down -v` para resolver problemas de inicio: elimina las bases y colas locales. Úsalo únicamente cuando se decida borrar el estado de desarrollo.

## Límites actuales

El Compose todavía no incluye frontend ni servicios de negocio. No está validado ejecutándolo en este equipo porque Docker no está instalado/disponible en el entorno de trabajo actual. La verificación de Compose debe hacerse al tener Docker Engine, y luego añadirse al CI. Esta configuración no es una especificación de producción: requiere secretos gestionados, TLS, backup/restore verificados y políticas de acceso antes de desplegarse fuera de desarrollo.
