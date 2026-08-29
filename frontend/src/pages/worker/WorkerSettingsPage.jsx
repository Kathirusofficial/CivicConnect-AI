import { useState } from 'react';
import { Settings, Bell, HardHat, CheckCircle2 } from 'lucide-react';
import { useWorkerAuthStore } from '../../store/workerAuthStore';

export const WorkerSettingsPage = () => {
  const { workerUser, updateWorkerStatus } = useWorkerAuthStore();
  const [status, setStatus] = useState(workerUser?.status || 'Available');
  const [notifyEmergency, setNotifyEmergency] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    updateWorkerStatus(status);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Settings size={24} className="text-amber-400" /> Operative Settings
        </h1>
        <p className="text-xs text-surface-400 mt-0.5">Availability and field dispatch preferences</p>
      </div>

      {saved && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>Settings saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="p-6 rounded-3xl bg-[#161b22] border border-surface-800 space-y-6 shadow-xl">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-surface-300 uppercase tracking-wide">
            Availability Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-4 py-3 bg-[#0d1117] border border-surface-700 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
          >
            <option value="Available">🟢 Available (Ready for field dispatch)</option>
            <option value="Busy">🟡 Busy (On active field work)</option>
            <option value="Offline">⚪ Offline (Off-duty)</option>
          </select>
          <p className="text-[11px] text-surface-500">
            When marked Offline or Busy, government officers see your status in the municipal capacity registry.
          </p>
        </div>

        <div className="pt-4 border-t border-surface-800 space-y-3">
          <label className="block text-xs font-bold text-surface-300 uppercase tracking-wide">
            Dispatch Alerts
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyEmergency}
              onChange={(e) => setNotifyEmergency(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-surface-900 border-surface-700"
            />
            <span className="text-xs text-surface-200 font-medium">Show Emergency Dispatch Popups immediately on new assignment</span>
          </label>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs shadow transition-all"
        >
          Save Preferences
        </button>
      </form>
    </div>
  );
};
