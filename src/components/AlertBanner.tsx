import { ShieldAlert } from 'lucide-react';

interface Props {
  activeAlert: string | null;
  setActiveAlert: (msg: string | null) => void;
}

export default function AlertBanner({ activeAlert, setActiveAlert }: Props) {
  return (
    <>
      {/* DYNAMIC ALERT POPUP BANNER */}
      {activeAlert && (
        <div className="bg-gradient-to-r from-red-600 via-pink-600 to-orange-600 text-white px-4 py-3 shadow-2xl flex items-center justify-between animate-bounce sticky top-[61px] md:top-[65px] z-50 transition-all">
          <div className="flex items-center space-x-3 max-w-7xl mx-auto w-full">
            <ShieldAlert className="w-6 h-6 flex-shrink-0 animate-pulse" />
            <span className="font-semibold text-sm md:text-base">{activeAlert}</span>
          </div>
          <button onClick={() => setActiveAlert(null)} className="text-white hover:text-slate-200 font-bold text-lg px-2">×</button>
        </div>
      )}
    </>
  );
}
