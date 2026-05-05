describe('invoice line math', () => {
  function lineTotal(quantity: number, unitPrice: number, taxRate: number): number {
    return quantity * unitPrice * (1 + taxRate);
  }

  it('computes taxed line totals', () => {
    expect(lineTotal(2, 100, 0.1)).toBe(220);
  });

  it('aggregates invoice body totals', () => {
    const items = [
      { quantity: 1, unitPrice: 1000, taxRate: 0.1 },
      { quantity: 2, unitPrice: 50, taxRate: 0 }
    ];
    const subtotal = items.reduce((acc, row) => acc + row.quantity * row.unitPrice, 0);
    const taxTotal = items.reduce((acc, row) => acc + row.quantity * row.unitPrice * row.taxRate, 0);
    expect(subtotal).toBe(1100);
    expect(taxTotal).toBe(100);
    expect(subtotal + taxTotal).toBe(1200);
  });
});
