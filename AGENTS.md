# AGENTS.md

## Objetivo del proyecto

`descuento-carrito` es una app de Shopify basada en extensiones. Su objetivo es aplicar un descuento de pedido mediante Shopify Functions y ofrecer una interfaz de configuración dentro del administrador.

Regla actual:
- Aplicar un 10% de descuento de pedido cuando la suma de los subtotales de las líneas alcanza 100 y existen al menos 3 productos distintos.
- Contar productos por ID de producto, no por variante, línea ni cantidad de unidades.
- Variantes del mismo producto cuentan como un único producto.
- El mínimo de 100 se evalúa en la moneda del carrito. No está restringido a USD ni hace conversión de moneda.
- No aplicar descuentos de producto ni de envío.
- No devolver operaciones si la clase ORDER no está habilitada o el carrito está vacío.

No modificar estas reglas sin una solicitud explícita. No presentar esta app como equivalente a un descuento nativo de cantidad mínima: contar productos distintos es una condición diferente.

## Estructura

- `shopify.app.toml`: configuración de la app, permisos y otras definiciones.
- `pnpm-workspace.yaml`: workspace y permisos de scripts de dependencias.
- `extensions/descuento-subtotal/`: Shopify Function.
  - `shopify.extension.toml`: targets y vínculo con la extensión de ajustes.
  - `src/cart_lines_discounts_generate_run.graphql`: entrada para descuentos de pedido/productos.
  - `src/cart_lines_discounts_generate_run.js`: cálculo de la regla actual.
  - `src/cart_delivery_options_discounts_generate_run.graphql`: entrada del target de envío.
  - `src/cart_delivery_options_discounts_generate_run.js`: devuelve siempre `{ operations: [] }`.
  - `generated/api.ts`: tipos generados; no editar manualmente.
  - `tests/default.test.js`: pruebas de integración sobre la Function compilada.
  - `tests/fixtures/*.json`: entradas y salidas esperadas.
  - `vitest.config.js`: configuración de pruebas.
- `extensions/descuento-settings/`: UI de ajustes del descuento.
  - `src/DiscountFunctionSettings.jsx`: componente Preact con Polaris web components.
  - Target: `admin.discount-details.function-settings.render`.
- `extensions/app-home/`: interfaz de ejemplo de FAQs; no es el gestor del descuento.
- `extensions/app-tools/`: herramientas de ejemplo asociadas a FAQs.
- `shared/`: código compartido del ejemplo.

Inspeccionar los archivos actuales antes de editar. Esta descripción no sustituye la configuración del repositorio.

## Relación entre Function y descuento

La Function calcula y devuelve descuentos; no crea por sí sola un descuento activo.

El método automático o por código pertenece al descuento creado en Shopify, no al cálculo de la Function.

La UI de ajustes no debe afirmar que convierte el método a automático. Crear un descuento automáticamente desde una interfaz propia es una funcionalidad adicional y requiere una implementación explícita.

La Function se vincula con la UI mediante este bloque en su propio `shopify.extension.toml`:

```toml
[extensions.ui]
handle = "descuento-settings"
```

La UI establece la clase de pedido usando la API de extensión `shopify.discounts.updateDiscountClasses(["order"])` durante el envío del formulario. Manejar errores y verificar el resumen guardado; compilar la UI no prueba que el guardado funcione.

La regla está fijada en el código. La UI debe explicar la regla sin mostrar porcentajes, colecciones o mínimos editables que la Function no lea.

El metafield de ejemplo `function-configuration` no es consumido por la consulta actual de la Function. No asumir que guardarlo cambia el comportamiento.

## Herramientas y comandos

Usar pnpm como gestor de dependencias. El proyecto contiene un workspace `extensions/*`. No mezclar instalaciones con npm en el proyecto ni regenerar lockfiles innecesariamente.

Desde la raíz:

```sh
pnpm install
shopify app build
pnpm --filter descuento-subtotal exec vitest run
shopify app dev
```

`shopify app build` compila; no instala, crea descuentos ni despliega una versión de producción.

`shopify app dev` prepara una vista previa y puede actualizarla mientras está abierto. Confirmar siempre la tienda seleccionada antes de iniciar pruebas.

`shopify app deploy` publica una versión de la app; no equivale a instalarla en un cliente ni crear su descuento. No ejecutarlo sin autorización explícita.

Para cambiar de tienda mediante CLI, revisar primero la configuración y las opciones de la versión instalada. Se utilizó `shopify app dev --reset` para volver a seleccionar app y tienda. Conservar la app existente salvo indicación contraria.

En Windows usar comandos compatibles con PowerShell. No incluir el prompt `PS ...>` en los comandos para copiar.

## Dependencias y generación

- El proyecto usa `@graphql-codegen/cli` como dependencia de desarrollo en la raíz para disponer de `graphql-code-generator`.
- Los permisos de scripts observados en `pnpm-workspace.yaml` son:

```yaml
packages:
  - 'extensions/*'
allowBuilds:
  core-js: true
  esbuild: true
```

No desactivar globalmente controles de scripts para solucionar un error. Aprobar solo dependencias necesarias y revisar su procedencia.

No regenerar una extensión repetidamente ante un fallo de instalación. Inspeccionar si su carpeta existe y qué paso falló.

No cambiar versiones de API ni dependencias sin motivo. Inspeccionar las versiones declaradas en cada archivo; no asumir que todas las extensiones comparten la misma versión.

## Pruebas

El último resultado compartido fue de 16 pruebas de integración aprobadas con la regla de tres productos distintos. Volver a ejecutarlas tras cualquier cambio relevante; ese resultado histórico no garantiza el estado actual.

Cobertura existente:
- Carrito vacío y ausencia de clase ORDER.
- Un producto aunque el subtotal sea 100 o 150.
- Tres productos distintos con subtotal 99: sin descuento.
- Tres productos distintos con subtotal 100 o 150: descuento del 10%.
- Dos productos distintos con subtotal 150: sin descuento.
- Tres líneas del mismo producto con subtotal 150: sin descuento.
- Target de envío: ninguna operación, incluso con SHIPPING habilitado.

Los fixtures usan esta estructura:

```json
{
  "payload": {
    "export": "cart-lines-discounts-generate-run",
    "target": "cart.lines.discounts.generate.run",
    "input": {},
    "output": { "operations": [] }
  }
}
```

La entrada debe coincidir con la consulta GraphQL, incluida `merchandise.__typename` y el ID de producto para ProductVariant. No añadir campos ajenos a la consulta sin actualizarla.

`tests/default.test.js` compila y valida los fixtures contra el esquema antes de ejecutar la Function. Se amplió el timeout de `beforeAll` de 45000 a 180000 ms. No aumentar indefinidamente el timeout: si vuelve a agotarse, diagnosticar el paso bloqueado.

La carpeta de la Function puede establecerse con `path.dirname(__dirname)` dentro de `beforeAll`, conservando `let functionDir`. Evitar una asignación posterior a una variable declarada con `const`.

Cuando cambie la regla, actualizar tanto la consulta y el código como los fixtures y el texto de la UI. No alterar resultados esperados únicamente para ocultar una regresión.

Añadir pruebas cuando proceda para variantes distintas del mismo producto, cantidades múltiples y productos distribuidos en varias líneas.

## Estado y entornos

- Repositorio compartido: `https://github.com/thomywtc/descuento-carrito.git`.
- Rama utilizada: `main`.
- `th001.myshopify.com` se usó inicialmente para pruebas y contiene otros trabajos del comerciante. No dirigir nuevas pruebas allí sin autorización.
- Se cambió la vista previa a `th002.myshopify.com`, confirmada como tienda de desarrollo.
- Los permisos de desarrollo observados fueron `write_discounts,write_products`.
- Se creó el código de prueba `PRUEBA10` en th002, asociado a la misma Function.
- Se verificó en checkout la regla anterior, de solo subtotal: 139.90 USD produjo 13.99 USD de descuento; 69.95 USD no recibió descuento.
- Esas capturas NO verifican la nueva regla de tres productos distintos.
- La nueva regla pasó pruebas locales. No hay confirmación de guardado y prueba en checkout del descuento automático con esa regla.
- No hay confirmación de despliegue de producción.

No asumir que la vista previa continúa abierta, que los descuentos siguen activos o que cambios locales ya están en GitHub. Comprobar el estado antes de afirmarlo.

## Producción y distribución

Shopify Functions se distribuye mediante apps; no se instala como código del tema.

Para tiendas reales, verificar los requisitos vigentes antes de recomendar distribución:
- Apps personalizadas con Functions requieren Shopify Plus.
- Apps públicas compatibles con Functions pueden usarse desde Basic, sujetas a los requisitos de la API concreta y revisión aplicable.
- No asumir que el nombre de un plan Custom confirma compatibilidad.
- No seleccionar distribución sin autorización: es una decisión que no se puede cambiar después de elegirla.

La instalación, la publicación de la app y la creación del descuento son pasos diferentes. Los descuentos creados en una tienda de prueba no se trasladan automáticamente a otra tienda.

Antes de producción, revisar moneda, permisos mínimos, interfaces de ejemplo innecesarias y pruebas reales de checkout. No retirar FAQs, metaobjects u otras extensiones sin autorización.

## Seguridad y Git

Nunca incluir tokens, contraseñas, secretos o archivos `.env` en commits, mensajes o registros compartidos. Un repositorio privado no sustituye la protección de credenciales.

Mantener excluidos `node_modules`, `.env*`, `.shopify`, `dist`, archivos locales y respaldos como `descuento-subtotal-rust-respaldo/`. La configuración MCP local `mcp.json` se excluyó para evitar publicar configuración sensible; revisar sus contenidos antes de cambiar esa decisión.

El `client_id` de Shopify es un identificador público, no un token secreto.

Revisar `.npmrc`, diffs y archivos preparados antes de hacer commit. No borrar ni sobrescribir trabajo ajeno. No modificar archivos generados manualmente.

No hacer push ni desplegar sin una solicitud que lo autorice. Proponer commits pequeños y descriptivos, conservar lockfiles necesarios y no afirmar que GitHub está actualizado sin una salida que confirme el push.

## Comunicación

Trabajar en español. Explicar claramente si un resultado corresponde a compilación, pruebas locales, vista previa, descuento guardado o producción.

No pedir capturas o archivos ya recibidos salvo que hayan cambiado. Si un archivo excede el límite del chat, leerlo localmente cuando exista acceso; en caso contrario solicitar fragmentos numerados sin huecos.

Nunca presentar una operación intentada como terminada. Indicar exactamente qué se verificó y el siguiente paso pendiente.
