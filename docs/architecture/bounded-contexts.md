# Contextos delimitados y modelo de dominio

La división sigue capacidades del negocio, no tablas. Cada agregado tiene un único servicio propietario. Los identificadores de otro contexto se representan como referencias, no como objetos persistidos compartidos.

| Servicio | Dominio y datos propios | Agregados iniciales | Invariantes centrales |
|---|---|---|---|
| Identidad (`identity-service`) | Cuentas, roles, permisos, sesiones, credenciales y auditoría de acceso | Cuenta, Rol, Sesión | Cuenta desactivada no autentica; solo permisos vigentes habilitan acciones; contraseñas nunca se almacenan en claro |
| Catálogo (`catalog-service`) | Definiciones de productos, categorías, marcas, unidades, características e identificación | Producto, Categoría | Código interno único; política de control definida; producto referenciado por ID y versión, no es existencia física |
| Compras (`procurement-service`) | Proveedores, órdenes, aprobaciones, precios, documentos y recepciones documentales/aceptadas | Orden de compra, Recepción | Totales derivados de líneas; transición de estado permitida; aceptado no supera solicitado menos recepciones anteriores; aprobar orden no suma stock |
| Inventario (`inventory-service`) | Unidades físicas, saldos, ubicaciones, disponibilidad, reservas, movimientos, seriales y restricciones operativas | Activo, Saldo por producto/ubicación, Movimiento, Reserva | Serial/código único en alcance definido; saldo no negativo; toda mutación genera movimiento; activo reservado/asignado/bloqueado no puede reservarse otra vez |
| Organización (`organization-service`) | Grupos, colaboradores, cargos, departamentos, sedes y relaciones temporales | Colaborador, Grupo, Membresía | Identificador organizativo único; historial temporal sin sobrescritura destructiva; solo mínima información personal |
| Asignaciones (`assignment-service`) | Entregas, asignaciones, devoluciones, reasignaciones, traslados de responsabilidad y actas | Asignación, Devolución, Traslado | Máximo una asignación activa incompatible por activo; la confirmación requiere reserva de Inventario y destinatario elegible |
| Inspecciones (`inspection-service`) | Plantillas, reglas, calendario, ejecuciones, respuestas, evidencias, vencimientos e incidencias | Plantilla, Programa, Inspección, Incidencia | Una ejecución por activo/plantilla/periodo; evidencia requerida antes de enviar; incidente crítico sigue abierto hasta resolución validada |
| Mantenimiento (`maintenance-service`) | Solicitudes, diagnósticos, órdenes de trabajo, técnicos, repuestos y costos de servicio | Solicitud, Orden de trabajo | Cierre requiere resultado y permisos; el historial no se elimina; liberar un activo requiere confirmar sus restricciones con Inventario |
| Notificaciones (`notification-service`) | Preferencias, mensajes, intentos y recibos de entrega | Notificación | Consumo idempotente; reintentos limitados; error del proveedor no revierte la operación de origen |
| Reportes (`reporting-service`) | Proyecciones y exportaciones de lectura por rol | Proyección, Trabajo de exportación | La proyección se construye solo de contratos autorizados; registra versión/fecha de actualización; no afirma consistencia instantánea |
| Auditoría (`audit-service`) | Evidencia de auditoría de negocio centralizada | Registro de auditoría, Lote de ingestión | Ingesta idempotente y append-only para la aplicación; acceso restringido; redacción de secretos/PII |

## Propiedad de conceptos con riesgo de duplicación

- `ProductId` pertenece a Catálogo. Inventario almacena la referencia y una instantánea mínima/versionada de nombre/código para trazabilidad; no puede editar la definición del producto.
- El saldo de stock y el estado físico de un activo pertenecen a Inventario. Compras solo posee lo pedido/recibido contractualmente. Asignaciones posee el acuerdo de custodia, no una copia editable de disponibilidad.
- Organización posee la elegibilidad y la membresía actual/histórica. Asignaciones conserva IDs del destinatario y una instantánea mínima al emitir el acta.
- Inspecciones es dueña del resultado y la incidencia. Inventario es dueño del estado operativo `blocked`/`available`; el bloqueo se confirma mediante API de Inventario y referencia al incidente.
- Mantenimiento posee órdenes de trabajo y costos. Inventario conserva el movimiento/estado del activo, reflejando hechos confirmados del mantenimiento.
- Auditoría almacena evidencia de acciones, no reemplaza los registros de negocio fuente.
- Reportes tiene datos derivados que se pueden reconstruir desde eventos; nunca son fuente de decisiones de escritura.

## Eventos de dominio y casos de uso

Los eventos de dominio nacen dentro del contexto y se convierten a contratos de integración en la capa de aplicación. Casos de uso iniciales por contexto: autenticar y administrar permisos; crear/desactivar producto; crear/aprobar orden y aceptar recepción; recibir/ajustar/trasladar inventario y reservar/liberar activo; administrar grupos y relaciones laborales; asignar/devolver/trasladar activo; programar/responder/cerrar inspección; solicitar/ejecutar/cerrar mantenimiento; entregar/reintentar notificación; actualizar proyecciones/exportar; ingerir y consultar auditoría autorizada.

Los comandos para mutar un contexto entran por REST autenticado o un consumidor explícitamente contratado. El dominio decide invariantes y el adaptador de persistencia solo materializa sus cambios.
