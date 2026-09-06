import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save, Sliders, Bell } from 'lucide-react';
import { getSettings, updateSettings } from '../services/api';

export function Settings() {
  const [zScore, setZScore] = useState(2.5);
  const [baselineHours, setBaselineHours] = useState(168);
  const [anomalyPct, setAnomalyPct] = useState(30);
  const [autoAcknowledge, setAutoAcknowledge] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then(res => {
      if (res) {
        if (res.z_score_threshold) setZScore(res.z_score_threshold);
        if (res.baseline_window_hours) setBaselineHours(res.baseline_window_hours);
        if (res.anomaly_percentage_threshold) setAnomalyPct(res.anomaly_percentage_threshold);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({
        z_score_threshold: Number(zScore),
        baseline_window_hours: Number(baselineHours),
        anomaly_percentage_threshold: Number(anomalyPct)
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-surface-400">
        <SettingsIcon className="animate-spin h-8 w-8 text-primary-500 mr-3" />
        <span>Loading system settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary-400" />
          SpendGuard Engine Configuration
        </h1>
        <p className="text-sm text-surface-400">
          Tune statistical anomaly detection sensitivity thresholds, baseline rolling windows, and alert routing parameters
        </p>
      </div>

      {saved && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-xl text-emerald-300 text-sm font-medium flex items-center gap-2">
          <Save className="h-4 w-4" /> Configuration changes saved successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Detection Engine Parameters */}
        <div className="bg-surface-900/60 border border-surface-800/80 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-surface-200 flex items-center gap-2 border-b border-surface-800 pb-3">
            <Sliders className="h-5 w-5 text-primary-400" />
            Detection Engine Thresholds
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase text-surface-300 mb-1">
                Z-Score Threshold (Standard Deviations)
              </label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                value={zScore}
                onChange={(e) => setZScore(Number(e.target.value))}
                className="w-full bg-surface-950 border border-surface-800 text-surface-100 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary-500"
              />
              <p className="text-[11px] text-surface-400 mt-1">
                Default: 2.5. Higher values reduce false positives; lower values increase sensitivity.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-surface-300 mb-1">
                Baseline Rolling Window (Hours)
              </label>
              <input
                type="number"
                min="24"
                max="720"
                value={baselineHours}
                onChange={(e) => setBaselineHours(Number(e.target.value))}
                className="w-full bg-surface-950 border border-surface-800 text-surface-100 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary-500"
              />
              <p className="text-[11px] text-surface-400 mt-1">
                Default: 168 hrs (7 days). Controls seasonal baseline averaging.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-surface-300 mb-1">
                Cost Spike Threshold (% Deviation)
              </label>
              <input
                type="number"
                min="10"
                max="200"
                value={anomalyPct}
                onChange={(e) => setAnomalyPct(Number(e.target.value))}
                className="w-full bg-surface-950 border border-surface-800 text-surface-100 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary-500"
              />
              <p className="text-[11px] text-surface-400 mt-1">
                Default: 30%. Minimum spend jump percentage above expected baseline to flag ANOMALY.
              </p>
            </div>
          </div>
        </div>

        {/* Notification Routing & Automation */}
        <div className="bg-surface-900/60 border border-surface-800/80 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-surface-200 flex items-center gap-2 border-b border-surface-800 pb-3">
            <Bell className="h-5 w-5 text-primary-400" />
            Alert Routing & Automation
          </h2>

          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-sm font-medium text-surface-200 block">Auto-Acknowledge Low Severity Alerts</span>
              <span className="text-xs text-surface-400">Automatically mark WARNING alerts as acknowledged after 24 hours</span>
            </div>
            <input
              type="checkbox"
              checked={autoAcknowledge}
              onChange={(e) => setAutoAcknowledge(e.target.checked)}
              className="h-4 w-4 rounded border-surface-800 text-primary-600 focus:ring-primary-500 bg-surface-950"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-primary-600 hover:bg-primary-500 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
