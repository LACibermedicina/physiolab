import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
const db = new PrismaClient();
(async () => {
  const email = process.env.ADMIN_EMAIL?.toLowerCase(), pw = process.env.ADMIN_PASSWORD;
  if (!email || !pw) throw new Error('Defina ADMIN_EMAIL e ADMIN_PASSWORD');
  if ((await db.usuario.count()) > 0) { console.log('Ja existem usuarios; nada a fazer.'); return; }
  await db.usuario.create({ data: { nome: 'Administrador', email, senhaHash: await bcrypt.hash(pw, 12), role: Role.GESTOR_CLINICA, trocarSenha: true } });
  console.log('Administrador criado.');
})().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
