# ADR-0004: Gateway y seguridad de servicio

- Estado: Aceptada para iniciar
- Fecha: 2026-10-25

## Contexto

La web necesita un punto de entrada estable con enrutamiento, seguridad de borde y correlación. Una API Gateway por sí sola no conoce ni debe contener las reglas de dominio.

## Decisión

Usar una Gateway configurable (Traefik previsto para enrutamiento de Compose, sujeto a confirmar su encaje para políticas requeridas). La Gateway centraliza rutas, TLS/CORS de borde, límites, timeout, cabeceras de correlación y errores. Cada servicio comprueba el token/audiencia y permiso para sus operaciones. Identidad mantiene cuentas y políticas; el mecanismo OIDC/JWT exacto se fija con el primer incremento ejecutable. Comunicación interna usa credenciales de servicio gestionadas.

## Consecuencias

La entrada web puede evolucionar sin mezclar lógica. La Gateway puede volverse cuello de botella y debe instrumentarse y configurarse como infraestructura crítica. Autorización duplicada intencionalmente (borde y servicio) protege operaciones si se accede por ruta interna.
