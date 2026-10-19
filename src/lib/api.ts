import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import type { Session } from './jwt';
import { db } from './db';

export const json = (d: unknown, status = 200) => NextResponse.json(d, { status });
export const err = (erro: string, status: number) => json({ erro }, status);
export const isFisio = (s: Session) => s.role === 'FISIOTERAPEUTA_GENERALISTA' || s.role === 'FISIOTERAPEUTA_ESPECIALISTA';
export const isGestor = (s: Session) => s.role === 'GESTOR_CLINICA';

/** RBAC por escopo de dados: quem pode ver quais pacientes */
export function patientScope(s: Session): Prisma.PacienteWhereInput {
  switch (s.role) {
    case 'GESTOR_CLINICA': return {};
    case 'FISIOTERAPEUTA_GENERALISTA':
    case 'FISIOTERAPEUTA_ESPECIALISTA': return { fisioterapeutaId: s.sub };
    case 'PACIENTE': return { usuarioId: s.sub };
    case 'CUIDADOR': return { cuidadorId: s.sub };
  }
}
export const bodyOf = (req: Request) => req.json().catch(() => null);

export const ownPatient = (s: Session, id: string) => db.paciente.findFirst({ where: { id, ...patientScope(s) } });
export const canClinical = (s: Session) => s.role !== 'GESTOR_CLINICA'; // minimizacao: gestor nao ve dados clinicos detalhados
