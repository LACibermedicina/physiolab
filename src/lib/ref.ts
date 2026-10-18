export const REF: Record<string, [number, number]> = {
  hemoglobina: [12, 17.5], glicemia: [70, 99], creatinina: [0.6, 1.3], pcr: [0, 5],
  'vitamina d': [30, 100], ck: [30, 200], ferritina: [20, 300], colesterol: [0, 190],
  tsh: [0.4, 4.5], potassio: [3.5, 5.1], sodio: [135, 145],
};
export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
