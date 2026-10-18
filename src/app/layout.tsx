export const metadata = { title: 'PhysioLab' };
export default function Root({ children }: { children: React.ReactNode }) {
  return (<html lang="pt-BR"><body>{children}</body></html>);
}
