# PhysioLab — versão de produção (backend + instalador)

API Next.js 14 (App Router) + PostgreSQL + Prisma, com autenticação, RBAC por escopo de dados, auditoria e instalação via Docker.

## Instalação (servidor Linux, macOS ou WSL)
Pré-requisitos: Docker com Compose v2 e openssl.

    ./install.sh

O instalador pergunta o domínio (vazio = apenas localhost) e o e-mail do administrador, gera segredos aleatórios em `.env` (permissão 600), sobe PostgreSQL + aplicação (+ Caddy com HTTPS automático se houver domínio), cria o administrador e exibe a senha provisória uma única vez. Com domínio, abra as portas 80 e 443 e aponte o DNS para o servidor antes de rodar.

## Operação
- Backup: `./backup.sh` (agendar no cron e copiar para armazenamento externo criptografado; testar a restauração).
- Atualizar: `git pull && docker compose up -d --build`.
- Logs: `docker compose logs -f app`.

## Antes de ir para produção (obrigatório)
1. Gerar as migrations e versioná-las: `npx prisma migrate dev --name init` (sem elas, o container usa `db push`, só adequado à primeira instalação).
2. Gerar e versionar o `package-lock.json` (`npm install`) e trocar `npm install` por `npm ci` no Dockerfile.
3. Rodar `npm run build` e os testes em um ambiente com internet; este pacote foi escrito sem poder executar o build, então pode haver ajustes de tipos/versões.
4. Revisão de segurança independente, política de senhas/MFA e plano de resposta a incidentes.

## Endpoints
| Método | Rota | Quem |
|---|---|---|
| POST | /api/auth/login, /api/auth/logout, /api/auth/senha | todos |
| GET/POST | /api/pacientes | leitura conforme escopo; criação por fisioterapeutas |
| GET/PATCH | /api/pacientes/:id | idem (sem DELETE: arquivar com status ARQUIVADO) |
| GET/POST | /api/pacientes/:id/evolucoes | fisioterapeuta (próprios pacientes); gestor lê |
| GET/POST/PATCH | /api/usuarios | somente gestor |
| GET | /api/health | público |

Escopo de dados: gestor vê todos; fisioterapeuta, só seus pacientes; paciente e cuidador, só o vinculado.

## Segurança já implementada
Senhas com bcrypt (custo 12), cookie JWT httpOnly/SameSite=Strict (Secure com HTTPS), bloqueio de 15 min após 5 falhas, validação com zod, exigência de JSON nas mutações, cabeçalhos de segurança, banco sem porta exposta, auditoria de login, leituras e escritas.

## Pendências conhecidas
- Interface web de produção: o protótipo funcional está em `prototype/` (usa localStorage) e precisa ser migrado para páginas que consumam esta API.
- MFA, recuperação de senha por e-mail, limite de requisições por IP, rotação de chaves, criptografia de campos sensíveis em repouso, assinatura digital ICP-Brasil, integrações com wearables/FHIR e módulos clínicos restantes.
- LGPD: base legal, consentimento (campo `consentimentoEm`), RIPD, política de retenção/guarda de prontuário (confirmar prazos com COFFITO/assessoria jurídica), contrato com operador de nuvem e canal do titular.

## Módulo de caso clínico (API)
| Método | Rota | Descrição |
|---|---|---|
| GET/PUT | /api/pacientes/:id/caso | história inicial, objetivo, protocolo preferencial, início |
| GET/POST | /api/pacientes/:id/eventos | linha do tempo (intervenção, controle, exame, marco) |
| GET/POST | /api/pacientes/:id/exames | valores de exames (já extraídos), com faixa de referência e alerta |
| GET/PUT | /api/pacientes/:id/dias | parâmetros diários: hidratação, diurese, atividade, antropometria, sinais (paciente e cuidador também lançam) |
| POST/DELETE | /api/pacientes/:id/compartilhar | token de consultor externo (hash no banco, validade, revogação) |
| GET | /api/consultor/:token | resumo anonimizado (sem nome, contato, convênio; datas como D+N), com auditoria e limite de requisições |

Pendente neste módulo: extração por IA de PDFs/imagens (serviço no backend com armazenamento criptografado), geração do plano a partir da história e dos protocolos (OMS, Ministério da Saúde, World Physiotherapy, sociedades, PDF do profissional), e revisão jurídica do formato anonimizado (nomes em campos de texto livre podem escapar da remoção automática).
Após aplicar o schema novo, rode `npx prisma migrate dev --name caso_clinico`.

## Kinexo (rede profissional): próximos passos de backend
O protótipo `prototype/kinexo-prototipo.html` já mostra a rede (feed, métodos e evidências, eventos, vagas, biblioteca, stories em vídeo, painel da rede), login com convite e três idiomas. Para produção faltam: tabelas e rotas (Post, Evento, Vaga, Material, Metodo, Voto, Evidencia, Story, Convite, Denuncia), armazenamento de vídeo com transcodificação e moderação, verificação do registro profissional, tradução automática de conteúdo de usuários (serviço externo), antifraude nas enquetes (um voto por membro verificado) e revisão jurídica (LGPD, termos de uso, remoção de conteúdo). Nome "Kinexo": verificar disponibilidade de marca antes de uso comercial.

## IA, e-mail e vídeo (variáveis de ambiente, só no servidor)
- **IA com failsafe:** `src/lib/ai.ts` tenta Gemini → OpenAI → Pollinations → Claude e usa o primeiro que responder (só entram provedores com chave). Para dados de saúde, envie apenas texto anonimizado e com base legal; o modo `sensivel` pula o Pollinations (serviço público). `POST /api/ia/prefill` sugere o pré-preenchimento da ficha a partir de uma descrição livre.
- **E-mail:** `src/lib/mail.ts` (SMTP). **Vídeo:** `src/lib/agora.ts` emite tokens Agora; `POST /api/teleconsulta` cria a sala com código temporário (e envia o convite por e-mail, se informado) e `GET /api/teleconsulta/:codigo` entrega o token ao convidado.
- **Segurança:** as chaves que circularam em conversa devem ser revogadas e substituídas. Nunca versionar `.env` nem colocar chaves no navegador. Antes de usar IA ou e-mail com dados de pacientes, firmar contrato com os operadores (LGPD).
- Aplique o schema novo: `npx prisma migrate dev --name portal`.

## Protótipos de interface
`prototype/physiolab.html`: portal PhysioLab (revista pública, rede social, ficha do paciente, grafo 3D de evidências e evolução). `prototype/fisiomotion-pro.html`: protótipo anterior de gestão clínica. Ambos usam localStorage e servem de referência para a interface de produção. As mídias de exemplo (ilustrações e vídeos) foram geradas para demonstração e não são imagens reais de pacientes.
