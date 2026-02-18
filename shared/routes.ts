
import { z } from 'zod';
import { 
  insertDocketSchema, 
  insertDocketItemSchema, 
  insertLoadingSheetSchema, 
  insertThcSchema, 
  insertPodSchema,
  dockets,
  docketItems,
  loadingSheets,
  manifests,
  thcs,
  pods
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  dockets: {
    list: {
      method: 'GET' as const,
      path: '/api/dockets' as const,
      input: z.object({
        status: z.string().optional(),
        search: z.string().optional()
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof dockets.$inferSelect & { items: typeof docketItems.$inferSelect[] }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/dockets/:id' as const,
      responses: {
        200: z.custom<typeof dockets.$inferSelect & { items: typeof docketItems.$inferSelect[], pod: typeof pods.$inferSelect | null }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/dockets' as const,
      input: insertDocketSchema.extend({
        items: z.array(insertDocketItemSchema)
      }),
      responses: {
        201: z.custom<typeof dockets.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/dockets/:id/status' as const,
      input: z.object({ status: z.string() }),
      responses: {
        200: z.custom<typeof dockets.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  loadingSheets: {
    list: {
      method: 'GET' as const,
      path: '/api/loading-sheets' as const,
      responses: {
        200: z.array(z.custom<typeof loadingSheets.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/loading-sheets' as const,
      input: insertLoadingSheetSchema.extend({
        docketIds: z.array(z.number())
      }),
      responses: {
        201: z.custom<typeof loadingSheets.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/loading-sheets/:id' as const,
      responses: {
        200: z.custom<typeof loadingSheets.$inferSelect & { dockets: (typeof dockets.$inferSelect)[] }>(),
        404: errorSchemas.notFound,
      },
    },
  },
  manifests: {
    create: {
      method: 'POST' as const,
      path: '/api/manifests' as const,
      input: z.object({ loadingSheetId: z.number() }),
      responses: {
        201: z.custom<typeof manifests.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/manifests' as const,
      responses: {
        200: z.array(z.custom<typeof manifests.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/manifests/:id' as const,
      responses: {
        200: z.custom<typeof manifests.$inferSelect & { loadingSheet: typeof loadingSheets.$inferSelect }>(),
        404: errorSchemas.notFound,
      },
    },
  },
  thcs: {
    create: {
      method: 'POST' as const,
      path: '/api/thcs' as const,
      input: insertThcSchema,
      responses: {
        201: z.custom<typeof thcs.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/thcs' as const,
      responses: {
        200: z.array(z.custom<typeof thcs.$inferSelect>()),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/thcs/:id' as const,
      input: insertThcSchema.partial(),
      responses: {
        200: z.custom<typeof thcs.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  pods: {
    create: {
      method: 'POST' as const,
      path: '/api/pods' as const,
      input: insertPodSchema,
      responses: {
        201: z.custom<typeof pods.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/pods' as const,
      responses: {
        200: z.array(z.custom<typeof pods.$inferSelect>()),
      },
    },
    review: {
      method: 'POST' as const,
      path: '/api/pods/:id/review' as const,
      input: z.object({
        status: z.enum(['approved', 'rejected']),
        rejectionReason: z.string().optional()
      }),
      responses: {
        200: z.custom<typeof pods.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    analyze: { // Trigger AI analysis
      method: 'POST' as const,
      path: '/api/pods/:id/analyze' as const,
      responses: {
        200: z.custom<typeof pods.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
