'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface LoyaltyMember {
  id: string;
  customerId: string;
  totalPoints: number;
  availablePoints: number;
  tier: string;
  totalSpent: number;
  totalVisits: number;
  customer: { id: string; name: string; phone: string };
}

const tierColors: Record<string, string> = {
  bronze: 'bg-amber-700',
  silver: 'bg-gray-400',
  gold: 'bg-yellow-500',
  platinum: 'bg-purple-600',
};

const tierLabels: Record<string, string> = {
  bronze: 'برونزي',
  silver: 'فضي',
  gold: 'ذهبي',
  platinum: 'بلاتيني',
};

export default function LoyaltyPage() {
  const { token } = useAuth();
  const [members, setMembers] = useState<LoyaltyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [bonusForm, setBonusForm] = useState({ customerId: '', points: 0, description: '' });
  const [showBonusForm, setShowBonusForm] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get('/loyalty/members').then(r => {
      setMembers(r.data.members || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const handleAddBonus = async () => {
    try {
      await api.post('/loyalty/bonus', bonusForm);
      setBonusForm({ customerId: '', points: 0, description: '' });
      setShowBonusForm(false);
      // Reload
      const r = await api.get('/loyalty/members');
      setMembers(r.data.members || []);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">برنامج الولاء</h1>
          <p className="text-gray-500">إدارة نقاط ومستويات العملاء</p>
        </div>
        <Button onClick={() => setShowBonusForm(!showBonusForm)} className="bg-emerald-500 hover:bg-emerald-600">
          إضافة نقاط مكافأة
        </Button>
      </div>

      {/* Tier overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['bronze', 'silver', 'gold', 'platinum'].map(tier => {
          const count = members.filter(m => m.tier === tier).length;
          return (
            <Card key={tier} className="p-4 text-center">
              <Badge className={`${tierColors[tier]} text-white mb-2`}>{tierLabels[tier]}</Badge>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-sm text-gray-500">عضو</p>
            </Card>
          );
        })}
      </div>

      {/* Bonus form */}
      {showBonusForm && (
        <Card className="p-6">
          <h3 className="font-bold mb-4">إضافة نقاط مكافأة</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="رقم العميل (Customer ID)"
              value={bonusForm.customerId}
              onChange={e => setBonusForm({ ...bonusForm, customerId: e.target.value })}
            />
            <Input
              type="number"
              placeholder="عدد النقاط"
              value={bonusForm.points || ''}
              onChange={e => setBonusForm({ ...bonusForm, points: parseInt(e.target.value) || 0 })}
            />
            <Input
              placeholder="السبب"
              value={bonusForm.description}
              onChange={e => setBonusForm({ ...bonusForm, description: e.target.value })}
            />
          </div>
          <Button onClick={handleAddBonus} className="mt-4 bg-emerald-500 hover:bg-emerald-600">
            إضافة النقاط
          </Button>
        </Card>
      )}

      {/* Members table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">العميل</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الجوال</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">المستوى</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">النقاط المتاحة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">إجمالي الإنفاق</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الزيارات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">لا يوجد أعضاء بعد</td></tr>
              ) : members.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{m.customer?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{m.customer?.phone}</td>
                  <td className="px-4 py-3">
                    <Badge className={`${tierColors[m.tier] || 'bg-gray-500'} text-white`}>{tierLabels[m.tier] || m.tier}</Badge>
                  </td>
                  <td className="px-4 py-3 font-bold text-emerald-600">{m.availablePoints}</td>
                  <td className="px-4 py-3">{Number(m.totalSpent).toFixed(2)} ر.س</td>
                  <td className="px-4 py-3">{m.totalVisits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
