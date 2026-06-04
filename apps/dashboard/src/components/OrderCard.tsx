'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Car as CarIcon, DollarSign, HourglassIcon } from 'lucide-react';
import { OrderStatus } from '@estlem/shared';
import type { Customer, CustomerVehicle, Order, OrderItem, ParkingSpot } from '@estlem/shared';
import { formatPrice, formatDate, cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { QuoteModal } from '@/components/QuoteModal';

type DashboardOrder = Order & {
  customer?: Customer;
  vehicle?: CustomerVehicle | null;
  parkingSpot?: ParkingSpot | null;
  items: OrderItem[];
};

interface Props {
  order: DashboardOrder;
  onUpdateStatus: (id: string, status: OrderStatus, estimatedMins?: number) => void;
  onQuoteSubmitted?: () => void;
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; badge: BadgeProps['variant']; next?: OrderStatus; nextLabel?: string }
> = {
  [OrderStatus.PENDING_QUOTE]:    { label: 'بانتظار التسعير', badge: 'warning' },
  [OrderStatus.PENDING_APPROVAL]: { label: 'بانتظار موافقة العميل', badge: 'warning' },
  [OrderStatus.NEW]:       { label: 'جديد',        badge: 'default',     next: OrderStatus.ACCEPTED,  nextLabel: 'قبول الطلب' },
  [OrderStatus.ACCEPTED]:  { label: 'مقبول',        badge: 'default',     next: OrderStatus.PREPARING, nextLabel: 'بدء التحضير' },
  [OrderStatus.PREPARING]: { label: 'جاري التحضير', badge: 'warning',     next: OrderStatus.READY,     nextLabel: 'جاهز للتسليم' },
  [OrderStatus.READY]:     { label: 'جاهز',         badge: 'success',     next: OrderStatus.DELIVERED, nextLabel: 'تم التسليم ✓' },
  [OrderStatus.DELIVERED]: { label: 'مُسلَّم',       badge: 'success' },
  [OrderStatus.CANCELLED]: { label: 'ملغي',         badge: 'destructive' },
};

const VEHICLE_COLORS: Record<string, string> = {
  أبيض: 'bg-gray-100 border border-gray-300',
  أسود: 'bg-gray-900',
  رمادي: 'bg-gray-400',
  أحمر: 'bg-red-500',
  أزرق: 'bg-blue-500',
  أخضر: 'bg-green-500',
  بيج: 'bg-yellow-100',
  ذهبي: 'bg-yellow-400',
};

export function OrderCard({ order, onUpdateStatus, onQuoteSubmitted }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [estimatedMins, setEstimatedMins] = useState(10);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const cfg = STATUS_CONFIG[order.status];
  const colorClass = VEHICLE_COLORS[order.vehicle?.color ?? ''] ?? 'bg-gray-200';

  const needsQuote = order.status === OrderStatus.PENDING_QUOTE;
  const awaitingApproval = order.status === OrderStatus.PENDING_APPROVAL;

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all',
        order.status === OrderStatus.NEW && 'ring-2 ring-primary/40 shadow-md',
        needsQuote && 'ring-2 ring-amber-400 shadow-md',
        awaitingApproval && 'ring-2 ring-blue-400 shadow-md',
      )}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-black text-foreground">#{order.orderNumber}</span>
            <Badge variant={cfg.badge}>{cfg.label}</Badge>
          </div>
          <span className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</span>
        </div>

        <div className="flex items-center gap-3 mb-3">
          {order.vehicle && (
            <div className={cn('w-8 h-8 rounded-full shadow-sm flex-shrink-0', colorClass)} />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{order.customer?.fullName ?? '—'}</p>
            {order.vehicle && (
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <CarIcon className="h-3 w-3" />
                {order.vehicle.make} {order.vehicle.model} — {order.vehicle.plateNumber}
              </p>
            )}
          </div>
          {order.parkingSpot && (
            <Badge variant="default" className="gap-1">
              🅿️ {order.parkingSpot.spotNumber}
            </Badge>
          )}
        </div>

        <div className="text-sm text-muted-foreground mb-3">
          {order.items?.slice(0, 2).map((i) => (
            <span key={i.id} className="inline-block ml-2">
              {i.nameArSnapshot} ×{i.quantity}
            </span>
          ))}
          {order.items?.length > 2 && (
            <span className="text-primary">+{order.items.length - 2} أخرى</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="font-black text-primary">{formatPrice(order.total)}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-muted-foreground gap-1"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'إخفاء' : 'التفاصيل'}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border p-4 bg-secondary/40 space-y-2">
          {order.items?.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.nameArSnapshot} × {item.quantity}</span>
              <span className="font-medium">{formatPrice(item.priceSnapshot * item.quantity)}</span>
            </div>
          ))}
          {order.notes && (
            <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg mt-2">📝 {order.notes}</p>
          )}
        </div>
      )}

      {/* Quote button — for orders pending pricing */}
      {needsQuote && (
        <div className="px-4 pb-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 flex items-start gap-2">
            <HourglassIcon className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-900 leading-relaxed">
              يحتوي الطلب على عناصر من القائمة الحرة. أدخل سعر كل عنصر وأرسله للعميل للموافقة.
            </p>
          </div>
          <Button
            onClick={() => setQuoteOpen(true)}
            className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white"
          >
            <DollarSign className="h-4 w-4" />
            إدخال الأسعار وإرسالها
          </Button>
          <Button
            variant="ghost"
            onClick={() => onUpdateStatus(order.id, OrderStatus.CANCELLED)}
            className="w-full text-destructive text-xs mt-1 h-8"
          >
            إلغاء الطلب
          </Button>
        </div>
      )}

      {/* Awaiting customer approval */}
      {awaitingApproval && (
        <div className="px-4 pb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
            <HourglassIcon className="h-4 w-4 text-blue-600 mt-0.5 shrink-0 animate-pulse" />
            <div className="flex-1">
              <p className="text-xs font-bold text-blue-900">بانتظار موافقة العميل على السعر</p>
              <p className="text-[11px] text-blue-700 mt-1">
                الإجمالي المُرسل: {formatPrice(order.total)}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setQuoteOpen(true)}
            className="w-full text-xs mt-2 gap-1"
            size="sm"
          >
            <DollarSign className="h-3 w-3" />
            تعديل الأسعار
          </Button>
        </div>
      )}

      {/* Quote modal */}
      {quoteOpen && (
        <QuoteModal
          order={order}
          onClose={() => setQuoteOpen(false)}
          onSubmitted={() => onQuoteSubmitted?.()}
        />
      )}

      {cfg.next && (
        <div className="px-4 pb-4">
          {cfg.next === OrderStatus.PREPARING && (
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <label className="text-xs text-muted-foreground">الوقت المتوقع:</label>
              <select
                value={estimatedMins}
                onChange={(e) => setEstimatedMins(Number(e.target.value))}
                className="text-sm border border-input rounded-lg px-2 py-1 bg-background"
              >
                {[5, 10, 15, 20, 30, 45].map((m) => (
                  <option key={m} value={m}>{m} دقيقة</option>
                ))}
              </select>
            </div>
          )}
          <Button
            onClick={() => onUpdateStatus(order.id, cfg.next!, estimatedMins)}
            variant={order.status === OrderStatus.READY ? 'accent' : 'default'}
            className="w-full"
          >
            {cfg.nextLabel}
          </Button>
          {[OrderStatus.NEW, OrderStatus.ACCEPTED].includes(order.status) && (
            <Button
              variant="ghost"
              onClick={() => onUpdateStatus(order.id, OrderStatus.CANCELLED)}
              className="w-full text-destructive text-xs mt-1 h-8"
            >
              إلغاء الطلب
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
