import PaymentPageClient from './PaymentPageClient';

export default async function PaymentPage({ params }: { params: { linkId: string } }) {
  return <PaymentPageClient linkId={params.linkId} />;
} 