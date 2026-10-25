import { NavLink } from 'react-router-dom';
import { Home, Package, ShoppingCart, ClockIcon, MoreHorizontal } from 'lucide-react';
import { useLang } from '../i18n/LangContext';

export function BottomNav() {
  const { t } = useLang();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5EAE3] shadow-[0_-4px_20px_rgba(32,53,44,0.06)] safe-area-bottom w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-16 px-1">
        {/* Home */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center py-1 transition-all select-none min-h-[48px] ${
              isActive ? 'text-[#155E46] font-bold' : 'text-[#6B7C72] hover:text-[#20332A]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`p-1.5 rounded-xl transition-all ${
                  isActive ? 'bg-[#DFF5E8] text-[#155E46]' : ''
                }`}
              >
                <Home size={20} strokeWidth={isActive ? 2.5 : 2} />
              </span>
              <span className="text-[10px] mt-0.5 leading-none font-medium truncate max-w-[54px]">
                {t('navHome')}
              </span>
            </>
          )}
        </NavLink>

        {/* Stock */}
        <NavLink
          to="/stock"
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center py-1 transition-all select-none min-h-[48px] ${
              isActive ? 'text-[#155E46] font-bold' : 'text-[#6B7C72] hover:text-[#20332A]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`p-1.5 rounded-xl transition-all ${
                  isActive ? 'bg-[#DFF5E8] text-[#155E46]' : ''
                }`}
              >
                <Package size={20} strokeWidth={isActive ? 2.5 : 2} />
              </span>
              <span className="text-[10px] mt-0.5 leading-none font-medium truncate max-w-[54px]">
                {t('navStock')}
              </span>
            </>
          )}
        </NavLink>

        {/* Center Prominent Quick Sale Action */}
        <div className="flex items-center justify-center px-1 -mt-5">
          <NavLink
            to="/sale"
            id="nav-quick-sale"
            aria-label={t('navSale')}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-14 h-14 rounded-full shadow-lg transition-transform active:scale-95 cursor-pointer select-none ${
                isActive
                  ? 'bg-[#155E46] text-white ring-4 ring-[#DFF5E8] shadow-[#087F5B]/35'
                  : 'bg-[#087F5B] text-white ring-4 ring-white shadow-[#087F5B]/30 hover:bg-[#155E46]'
              }`
            }
          >
            <ShoppingCart size={22} strokeWidth={2.4} />
            <span className="text-[9px] font-bold mt-0.5 leading-none tracking-tight">
              {t('navSale')}
            </span>
          </NavLink>
        </div>

        {/* History */}
        <NavLink
          to="/history"
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center py-1 transition-all select-none min-h-[48px] ${
              isActive ? 'text-[#155E46] font-bold' : 'text-[#6B7C72] hover:text-[#20332A]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`p-1.5 rounded-xl transition-all ${
                  isActive ? 'bg-[#DFF5E8] text-[#155E46]' : ''
                }`}
              >
                <ClockIcon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </span>
              <span className="text-[10px] mt-0.5 leading-none font-medium truncate max-w-[54px]">
                {t('navHistory')}
              </span>
            </>
          )}
        </NavLink>

        {/* More */}
        <NavLink
          to="/more"
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center py-1 transition-all select-none min-h-[48px] ${
              isActive ? 'text-[#155E46] font-bold' : 'text-[#6B7C72] hover:text-[#20332A]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`p-1.5 rounded-xl transition-all ${
                  isActive ? 'bg-[#DFF5E8] text-[#155E46]' : ''
                }`}
              >
                <MoreHorizontal size={20} strokeWidth={isActive ? 2.5 : 2} />
              </span>
              <span className="text-[10px] mt-0.5 leading-none font-medium truncate max-w-[54px]">
                {t('navMore')}
              </span>
            </>
          )}
        </NavLink>
      </div>
      {/* Safe bottom spacing */}
      <div className="h-safe-bottom" />
    </nav>
  );
}
