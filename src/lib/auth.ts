import { cookies } from 'next/headers';
import { COOKIE, readSession } from './jwt';
export { COOKIE, cookieOpts, signSession, readSession } from './jwt';
export type { Session } from './jwt';
export const getSession = () => readSession(cookies().get(COOKIE)?.value);
