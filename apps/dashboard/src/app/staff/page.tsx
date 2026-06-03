'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/Sidebar';
import toast from 'react-hot-toast';
import { StaffRole } from '@estlem/shared';
import type { Staff } from '@estlem/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, UserPlus, Trash2, Loader2 } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  owner: 'مالك',
  manager: 'مدير',
  staff: 'موظف',
  cashier: 'كاشير',
};

export default function StaffPage() {
  const { storeId, staff: me } = useAuth();
  const [list, setList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    role: StaffRole.STAFF as StaffRole,
    pin: '',
  });

  const load = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const data = (await api.get(`/staff/store/${storeId}`)) as Staff[];
      setList(data ?? []);
    } catch {
      toast.error('فشل تحميل الموظفين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [storeId]);

  const save = async () => {
    if (!form.name || !form.mobile || form.pin.length < 4) {
      toast.error('أدخل الاسم والجوال ورقم سري (4 أرقام على الأقل)');
      return;
    }
    setSaving(true);
    try {
      await api.post('/staff', { ...form, storeId });
      toast.success('تمت إضافة الموظف');
      setAdding(false);
      setForm({ name: '', mobile: '', role: StaffRole.STAFF, pin: '' });
      load();
    } catch {
      toast.error('فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('تعطيل هذا الموظف؟')) return;
    try {
      await api.delete(`/staff/${id}`);
      setList((prev) => prev.filter((s) => s.id !== id));
      toast.success('تم التعطيل');
    } catch {
      toast.error('فشل التعطيل');
    }
  };

  return (
    <div className="flex min-h-screen" dir="rtl">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-foreground">الموظفون</h1>
            <p className="text-muted-foreground text-sm">{list.length} موظف</p>
          </div>
          <Button onClick={() => setAdding(true)} className="gap-1">
            <Plus className="h-4 w-4" /> إضافة موظف
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-16 animate-pulse bg-muted/50 border-0" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <Card className="border-dashed">
            <div className="text-center py-16 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>لا يوجد موظفون بعد</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {list.map((s) => (
              <Card key={s.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {s.name?.charAt(0) ?? '؟'}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{s.mobile}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={s.role === 'owner' ? 'accent' : 'default'}>
                    {ROLE_LABELS[s.role] ?? s.role}
                  </Badge>
                  {s.id !== me?.id && s.role !== 'owner' && (
                    <Button variant="ghost" size="icon" onClick={() => remove(s.id)} className="text-destructive h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add modal */}
        {adding && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-6 space-y-4">
              <h2 className="font-bold text-lg">إضافة موظف</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">الاسم *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم الموظف" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">رقم الجوال *</label>
                  <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="05xxxxxxxx" dir="ltr" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">الدور</label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}
                      className="flex h-12 w-full rounded-xl border border-input bg-secondary/40 px-3 text-sm"
                    >
                      <option value="staff">موظف</option>
                      <option value="manager">مدير</option>
                      <option value="cashier">كاشير</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">رقم سري (PIN) *</label>
                    <Input value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} maxLength={6} placeholder="****" type="password" className="text-center tracking-widest" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setAdding(false)} className="flex-1">إلغاء</Button>
                <Button onClick={save} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
