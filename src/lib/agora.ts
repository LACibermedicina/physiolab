import { RtcRole, RtcTokenBuilder } from 'agora-token';
/** Token RTC com expiracao curta; o certificado nunca sai do servidor */
export function rtcToken(canal: string, uid: number, segundos = 3600) {
  const appId = process.env.AGORA_APP_ID, cert = process.env.AGORA_APP_CERTIFICATE;
  if (!appId || !cert) throw new Error('Agora nao configurado');
  return { appId, token: RtcTokenBuilder.buildTokenWithUid(appId, cert, canal, uid, RtcRole.PUBLISHER, segundos, segundos) };
}
