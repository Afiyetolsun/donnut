import PaymentPageClient from './PaymentPageClient';

export default function PaymentPage({ params }: { params: { linkId: string } }) {
  return <PaymentPageClient linkId={params.linkId} />;
} 