export interface Company {
  id: string;
  name: string;
  cnpj: string;
  color: string;
}

export const COMPANIES: Company[] = [
  {
    id: 'CRC_COSTA',
    name: 'CRC COSTA (MATRIZ)',
    cnpj: '13.824.759/0001-30',
    color: '#144bb8'
  },
  {
    id: 'AC_DA_COSTA',
    name: 'A.C. DA COSTA',
    cnpj: '21.279.969/0001-13',
    color: '#10b981'
  },
  {
    id: 'COMEX_COSTA_LOG',
    name: 'COMEX COSTA LOG',
    cnpj: '13.138.835/0001-54',
    color: '#f43f5e'
  }
];
