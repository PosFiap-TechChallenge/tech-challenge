import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

/**
 * No Zod 4 o metodo `.openapi()` so existe em schemas construidos DEPOIS de
 * `extendZodWithOpenApi`. Todo schema que for exposto no documento OpenAPI deve
 * portanto importar `z` deste modulo, nunca direto de 'zod'.
 */
export { z };
