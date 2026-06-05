'use client';

import { useEffect, useState } from 'react';
import { Car, UtensilsCrossed, Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/I18nProvider';

interface Props {
  storeName: string;
  spotNumber: string;
  spotType: 'parking' | 'table';
  onDismiss: () => void;
}

export function WelcomeOverlay({ storeName, spotNumber, spotType, onDismiss }: Props) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');
  const isTable = spotType === 'table';
  const displayNumber = spotNumber.replace('T:', '');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 800);
    const t2 = setTimeout(() => setPhase('exit'), 2200);
    const t3 = setTimeout(onDismiss, 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDismiss]);

  return (
    <div
      className={`fixed inset-0 z-[300] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${
        phase === 'exit' ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(135deg, #0F3460 0%, #1B4F72 35%, #16537E 70%, #1ABC9C 100%)',
        backgroundSize: '200% 200%',
        animation: phase !== 'exit' ? 'gradient-shift 4s ease infinite' : undefined,
      }}
      dir="rtl"
    >
      {/* Animated decorative orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#1ABC9C]/20 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse-soft delay-300" />
        <div className="absolute top-1/3 left-1/4 w-40 h-40 bg-[#1ABC9C]/15 rounded-full blur-2xl animate-float" />

        {/* Confetti particles */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-sm"
            style={{
              left: `${(i * 8.33) + Math.random() * 5}%`,
              top: `-10px`,
              backgroundColor: ['#1ABC9C', '#FFD700', '#FF6B6B', '#FFFFFF'][i % 4],
              animation: `confetti-fall ${2 + Math.random() * 2}s linear ${Math.random() * 1.5}s forwards`,
            }}
          />
        ))}

        {/* Ripple circles around center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="absolute w-32 h-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30 animate-ripple" />
          <div className="absolute w-32 h-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20 animate-ripple" style={{ animationDelay: '0.5s' }} />
          <div className="absolute w-32 h-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/10 animate-ripple" style={{ animationDelay: '1s' }} />
        </div>
      </div>

      {/* Center icon with orbit */}
      <div className="relative z-10 mb-6 animate-welcome-zoom">
        <div className="relative w-28 h-28 bg-white/15 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/20 animate-glow-pulse">
          {isTable ? (
            <UtensilsCrossed className="h-14 w-14 text-white" />
          ) : (
            <Car className="h-14 w-14 text-white" />
          )}

          {/* Orbiting sparkle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="animate-orbit">
              <Sparkles className="h-5 w-5 text-[#FFD700]" />
            </div>
          </div>
        </div>
      </div>

      {/* Welcome text */}
      <div className="relative z-10 text-center px-6 animate-slide-up-bounce delay-300">
        <p className="text-white/70 text-sm font-medium mb-2 tracking-wider">{t('welcome.welcomeTo')}</p>
        <h1 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">{storeName}</h1>

        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-xl border border-white/20 px-5 py-2.5 rounded-2xl animate-fade-in delay-500">
          {isTable ? (
            <UtensilsCrossed className="h-4 w-4 text-[#1ABC9C]" />
          ) : (
            <Car className="h-4 w-4 text-[#1ABC9C]" />
          )}
          <span className="text-white font-bold text-base">
            {isTable ? `${t('store.table')} ${displayNumber}` : `${t('store.parkingSpot')} ${displayNumber}`}
          </span>
        </div>
      </div>

      {/* Bottom hint */}
      <div className="absolute bottom-10 left-0 right-0 text-center animate-fade-in delay-700">
        <p className="text-white/50 text-xs">{t('welcome.loading')}</p>
        <div className="w-32 h-1 bg-white/10 rounded-full mx-auto mt-3 overflow-hidden">
          <div className="h-full bg-gradient-to-l from-[#1ABC9C] to-white rounded-full" style={{
            animation: 'gradient-shift 2s linear infinite, fade-up 2s ease-out',
            width: '100%',
          }} />
        </div>
      </div>
    </div>
  );
}
