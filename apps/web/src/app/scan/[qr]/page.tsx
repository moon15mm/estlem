import { QrScanClient } from './qr-scan-client';

interface Props {
  params: { qr: string };
}

export default function QrScanPage({ params }: Props) {
  return <QrScanClient qr={params.qr} />;
}
