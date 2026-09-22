export interface PaymentProvider {
  create(input: { orderId: string; amountToman: number }): Promise<{ reference: string; redirectUrl: string | null; status: 'UNPAID' }>;
  verify(input: { reference: string; orderId: string; expectedAmountToman: number }): Promise<{ paid: boolean; verifiedAmountToman?: number }>;
}
class ManualPaymentProvider implements PaymentProvider {
  async create({ orderId }: { orderId: string; amountToman: number }) { return { reference: `manual-${orderId}`, redirectUrl: null, status: 'UNPAID' as const }; }
  async verify() { return { paid: false }; }
}
// A gateway adapter must convert Toman to Rial and verify amounts server-side before marking paid.
export const paymentProvider: PaymentProvider = new ManualPaymentProvider();
