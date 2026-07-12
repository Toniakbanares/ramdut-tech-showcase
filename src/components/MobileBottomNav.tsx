import { NavLink } from 'react-router-dom';
import { MessageSquare, Wand2, Image as ImageIcon, Activity, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { to: '/chat', label: 'Chat Ramu', icon: MessageSquare },
  { to: '/lab', label: 'Ferramentas', icon: Wand2 },
  { to: '/imagine', label: 'Imagens', icon: ImageIcon },
  { to: '/api-status', label: 'Status', icon: Activity },
  { to: '/', label: 'Início', icon: Home },
];

export const MobileBottomNav = () => {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-16 ramu-glass border-t border-white/10 flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegação principal"
    >
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors min-w-0',
              isActive ? 'text-[#8B5CF6]' : 'text-neutral-400 hover:text-white',
            )
          }
        >
          <Icon className="h-5 w-5 shrink-0" aria-hidden />
          <span className="truncate max-w-full px-1">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default MobileBottomNav;
