import React from 'react';
import * as Icons from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  rawValue?: string | number;
  description?: string;
  icon: string;
  index: number;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  rawValue,
  description,
  icon,
  index,
}) => {
  // Resolve Lucide icons dynamically from key
  const LucideIcon = (Icons as any)[icon] || Icons.HelpCircle;

  // Determine icon gradient styling based on icon name
  const getIconStyles = (iconName: string) => {
    switch (iconName.toLowerCase()) {
      case 'trendingsup':
      case 'trendingup':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'dollarsign':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'percent':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'database':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'mappin':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  const exactValueDisplay = typeof rawValue === 'number' ? rawValue.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : String(rawValue ?? value);

  return (
    <div
      style={{ animationDelay: `${index * 80}ms` }}
      className="glass-panel glass-panel-hover rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group animate-slide"
    >
      {/* Decorative gradient glow on card hover */}
      <div className="absolute -right-16 -top-16 w-32 h-32 rounded-full bg-blue-500/5 blur-2xl group-hover:bg-blue-500/10 transition-all duration-500" />
      
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-550 tracking-wide uppercase truncate max-w-[130px] sm:max-w-none" title={title}>
            {title}
          </p>
          <h2 className="text-xl sm:text-2xl xl:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1 group-hover:scale-[1.01] transition-transform duration-300 break-words" title={exactValueDisplay}>
            {value}
          </h2>
        </div>
        <div className={`p-3 rounded-xl border ${getIconStyles(icon)}`}>
          <LucideIcon size={20} className="stroke-[2.5]" />
        </div>
      </div>

      {description && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {description}
          </p>
        </div>
      )}
    </div>
  );
};
