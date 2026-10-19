import { z } from 'zod';
import { Especialidade } from '@prisma/client';
export const patientSchema = z.object({
  nome: z.string().min(2).max(120),
  nascimento: z.coerce.date().optional(),
  telefone: z.string().max(30).optional(),
  convenio: z.string().max(80).optional(),
  queixa: z.string().max(500).optional(),
  codigoCif: z.string().max(40).optional(),
  especialidade: z.nativeEnum(Especialidade).optional(),
  consentimento: z.boolean().optional(),
});
