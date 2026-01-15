
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
  }).format(amount).replace('MYR', 'RM');
};

export const generateRefNumber = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `MKM/${year}H/${random}`;
};

export const getCurrentDate = (): string => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

export const formatDateRange = (start: string, end: string): string => {
  if (!start || !end) return 'TBC';
  
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  const d1 = new Date(start).toLocaleDateString('en-GB', options).toUpperCase();
  const d2 = new Date(end).toLocaleDateString('en-GB', options).toUpperCase();
  
  return `${d1} - ${d2}`;
};
