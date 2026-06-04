'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

interface CommissionRule {
  id: string;
  isGlobal: boolean;
  tenantId: string | null;
  type: string;
  value: number;
  isActive: boolean;
}

interface CommissionTransaction {
  id: string;
  tenantId: string;
  orderId: string;
  orderTotal: number;
  commissionType: string;
  commissionRate: number;
  commissionAmount: number;
  status: string;
  createdAt: string;
}

export default function AdminCommissionsPage() {
  const [globalRule, setGlobalRule] = useState<CommissionRule | null>(null);
  const [transactions, setTransactions] = useState<CommissionTransaction[]>([]);
  const [totalCommissions, setTotalCommissions] = useState(0);
  const [editType, setEditType] = useState('percentage');
  const [editValue, setEditValue] = useState(5);
  const [loading, setLoading] = useState(true);

  const getToken = () => {
    try {
      const data = JSON.parse(localStorage.getItem('admin-auth') || '{}');
      return data.state?.token;
    } catch { return null; }
  };

  const headers = () => ({ Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ruleRes, reportRes] = await Promise.all([
        fetch(`${API_URL}/commissions/global-rule`, { headers: headers() }),
        fetch(`${API_URL}/commissions/report`, { headers: headers() }),
      ]);
      if (ruleRes.ok) {
        const rule = await ruleRes.json();
        setGlobalRule(rule);
        if (rule) {
          setEditType(rule.type);
          setEditValue(rule.value);
        }
      }
      if (reportRes.ok) {
        const data = await reportRes.json();
        setTransactions(data.transactions || []);
        setTotalCommissions(data.totalCommissions || 0);
      }
    } catch { }
    setLoading(false);
  };

  const saveGlobalRule = async () => {
    try {
      await fetch(`${API_URL}/commissions/global-rule`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ type: editType, value: editValue }),
      });
      await loadData();
    } catch { alert('Failed to save'); }
  };

  const markCollected = async (ids: string[]) => {
    await fetch(`${API_URL}/commissions/collect`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ ids }),
    });
    await loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold">إدارة العمولات</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 text-center">
          <p className="text-sm text-gray-500">إجمالي العمولات</p>
          <p className="text-3xl font-bold text-emerald-600">{totalCommissions.toFixed(2)} ر.س</p>
        </Card>
        <Card className="p-6 text-center">
          <p className="text-sm text-gray-500">معاملات معلّقة</p>
          <p className="text-3xl font-bold text-amber-600">
            {transactions.filter(t => t.status === 'pending').length}
          </p>
        </Card>
        <Card className="p-6 text-center">
          <p className="text-sm text-gray-500">نوع العمولة الحالي</p>
          <p className="text-3xl font-bold">
            {globalRule?.type === 'percentage' ? `${globalRule.value}%` : globalRule?.type === 'fixed' ? `${globalRule.value} ر.س` : 'بدون'}
          </p>
        </Card>
      </div>

      {/* Global rule editor */}
      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4">القاعدة العامة للعمولات</h3>
        <div className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="text-sm text-gray-500 block mb-1">النوع</label>
            <select
              value={editType}
              onChange={e => setEditType(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="percentage">نسبة مئوية</option>
              <option value="fixed">مبلغ ثابت</option>
              <option value="none">بدون عمولة</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-500 block mb-1">
              {editType === 'percentage' ? 'النسبة (%)' : 'المبلغ (ر.س)'}
            </label>
            <Input
              type="number"
              value={editValue}
              onChange={e => setEditValue(parseFloat(e.target.value) || 0)}
              className="w-32"
              disabled={editType === 'none'}
            />
          </div>
          <Button onClick={saveGlobalRule} className="bg-emerald-500 hover:bg-emerald-600">
            حفظ القاعدة
          </Button>
        </div>
      </Card>

      {/* Transactions table */}
      <Card className="overflow-hidden">
        <div className="p-4 flex justify-between items-center border-b">
          <h3 className="font-bold">سجل العمولات</h3>
          <Button
            size="sm"
            onClick={() => {
              const pendingIds = transactions.filter(t => t.status === 'pending').map(t => t.id);
              if (pendingIds.length) markCollected(pendingIds);
            }}
            className="bg-blue-500 hover:bg-blue-600"
          >
            تحصيل الكل المعلّق
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">التاريخ</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الطلب</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">قيمة الطلب</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">النسبة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">العمولة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">لا توجد عمولات</td></tr>
              ) : transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{new Date(tx.createdAt).toLocaleDateString('ar-SA')}</td>
                  <td className="px-4 py-3 text-sm font-mono">{tx.orderId.slice(0, 8)}...</td>
                  <td className="px-4 py-3">{Number(tx.orderTotal).toFixed(2)} ر.س</td>
                  <td className="px-4 py-3">
                    {tx.commissionType === 'percentage' ? `${tx.commissionRate}%` : `${tx.commissionRate} ر.س`}
                  </td>
                  <td className="px-4 py-3 font-bold text-emerald-600">{Number(tx.commissionAmount).toFixed(2)} ر.س</td>
                  <td className="px-4 py-3">
                    <Badge className={tx.status === 'pending' ? 'bg-amber-500' : tx.status === 'collected' ? 'bg-emerald-500' : 'bg-gray-500'}>
                      {tx.status === 'pending' ? 'معلّق' : tx.status === 'collected' ? 'محصّل' : tx.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
