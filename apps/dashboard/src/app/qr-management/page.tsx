'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface QREntry {
  type: 'table' | 'car';
  label: string;
  identifier: string;
  url: string;
}

export default function QRManagementPage() {
  const [qrType, setQrType] = useState<'table' | 'car'>('table');
  const [entries, setEntries] = useState<QREntry[]>([]);
  const [tableCount, setTableCount] = useState(10);
  const [parkingCount, setParkingCount] = useState(5);

  const generateTableQRs = () => {
    const newEntries: QREntry[] = [];
    for (let i = 1; i <= tableCount; i++) {
      const storeSlug = 'my-store'; // would come from state
      newEntries.push({
        type: 'table',
        label: `طاولة ${i}`,
        identifier: `T-${i}`,
        url: `https://estlem.store/scan/table-${i}?store=${storeSlug}`,
      });
    }
    setEntries(newEntries);
  };

  const generateParkingQRs = () => {
    const newEntries: QREntry[] = [];
    const zones = ['A', 'B', 'C', 'D', 'E'];
    let count = 0;
    for (const zone of zones) {
      for (let i = 1; i <= Math.ceil(parkingCount / zones.length); i++) {
        if (count >= parkingCount) break;
        newEntries.push({
          type: 'car',
          label: `موقف ${zone}-${i}`,
          identifier: `${zone}-${i}`,
          url: `https://estlem.store/scan/parking-${zone}-${i}?store=my-store`,
        });
        count++;
      }
    }
    setEntries(newEntries);
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">إدارة رموز QR</h1>
        <p className="text-gray-500">إنشاء وإدارة رموز QR للطاولات والمواقف</p>
      </div>

      {/* Type selector */}
      <div className="flex gap-4">
        <Button
          onClick={() => setQrType('table')}
          className={qrType === 'table' ? 'bg-emerald-500' : 'bg-gray-200 text-gray-700'}
        >
          🍽️ طاولات
        </Button>
        <Button
          onClick={() => setQrType('car')}
          className={qrType === 'car' ? 'bg-emerald-500' : 'bg-gray-200 text-gray-700'}
        >
          🚗 مواقف سيارات
        </Button>
      </div>

      {/* Generator */}
      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4">
          {qrType === 'table' ? 'توليد QR للطاولات' : 'توليد QR للمواقف'}
        </h3>
        <div className="flex gap-4 items-end">
          <div>
            <label className="text-sm text-gray-500 block mb-1">
              {qrType === 'table' ? 'عدد الطاولات' : 'عدد المواقف'}
            </label>
            <Input
              type="number"
              value={qrType === 'table' ? tableCount : parkingCount}
              onChange={e => qrType === 'table' ? setTableCount(parseInt(e.target.value) || 0) : setParkingCount(parseInt(e.target.value) || 0)}
              className="w-32"
            />
          </div>
          <Button
            onClick={qrType === 'table' ? generateTableQRs : generateParkingQRs}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            توليد رموز QR
          </Button>
        </div>
      </Card>

      {/* Generated QRs */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {entries.map((entry, idx) => (
            <Card key={idx} className="p-4 text-center hover:shadow-lg transition-shadow">
              <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                {/* QR placeholder - would use qrcode.react in production */}
                <div className="text-4xl">{entry.type === 'table' ? '🍽️' : '🚗'}</div>
              </div>
              <p className="font-bold text-sm">{entry.label}</p>
              <p className="text-xs text-gray-400 mt-1">{entry.identifier}</p>
              <div className="flex gap-1 mt-3">
                <Button size="sm" variant="outline" className="flex-1 text-xs">تحميل</Button>
                <Button size="sm" variant="outline" className="flex-1 text-xs">طباعة</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
