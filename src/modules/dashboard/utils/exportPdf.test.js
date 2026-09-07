import { formatMoneyPdf } from './exportPdf';

describe('exportPdf helpers', () => {
  test('formatMoneyPdf uses Rs for jsPDF font safety', () => {
    expect(formatMoneyPdf(2000)).toBe('Rs 2,000');
    expect(formatMoneyPdf(0)).toBe('Rs 0');
  });
});
