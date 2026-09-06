import { useEffect, useState } from 'react';
import { Bug, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { getFailureCases } from '../services/api';

interface FailureCase {
  id: string;
  title: string;
  category: string;
  description: string;
  impact: string;
  mitigation: string;
  status: 'MITIGATED' | 'UNDER_REVIEW' | 'KNOWN_LIMITATION';
}

export function FailureCases() {
  const [cases, setCases] = useState<FailureCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFailureCases().then(res => {
      setCases(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const defaultCases: FailureCase[] = [
    {
      id: 'FC-01',
      title: 'Scheduled Nightly Batch DICOM Image Ingestion',
      category: 'False Positive Risk',
      description: 'Ingestion of large batch DICOM archives during off-peak hours causes a legitimate 400% surge in S3 storage and EC2 network bandwidth.',
      impact: 'Triggers WARNING or ANOMALY alerts if rolling baseline window is strictly 7-day without workload classification.',
      mitigation: 'Correlate billing spikes with cron scheduled deployments and DICOM ingestion pipeline tag metadata.',
      status: 'MITIGATED'
    },
    {
      id: 'FC-02',
      title: 'Gradual Creeping Storage Leak (Sub-Threshold Drift)',
      category: 'False Negative Risk',
      description: 'Application log accumulation increases cost by 1.5% daily without sudden step-function jumps.',
      impact: 'Rolling Z-score baseline adjusts upward slowly, masking a total 45% monthly budget overrun.',
      mitigation: 'Incorporate dual-window detection: combine 7-day hourly Z-score with 30-day linear slope regression.',
      status: 'MITIGATED'
    },
    {
      id: 'FC-03',
      title: 'Overlapping Deployment Multi-Correlation Ambiguity',
      category: 'Root Cause Ambiguity',
      description: 'Two separate deployment tasks (Database Indexing + ML Model Warmup) execute within the same 15-minute window.',
      impact: 'Attribution confidence score drops due to overlapping temporal telemetry.',
      mitigation: 'Weight root cause confidence by deployment resource scope and tags rather than raw timestamps alone.',
      status: 'UNDER_REVIEW'
    }
  ];

  const displayCases = cases.length > 0 ? cases : defaultCases;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-surface-400">
        <Bug className="animate-spin h-8 w-8 text-amber-500 mr-3" />
        <span>Loading documented edge cases...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-2">
          <Bug className="h-6 w-6 text-amber-400" />
          Failure Modes & Edge Case Analysis
        </h1>
        <p className="text-sm text-surface-400">
          Transparent documentation of complex real-world edge cases, false positive triggers, and mitigation algorithms
        </p>
      </div>

      <div className="space-y-4">
        {displayCases.map((item) => (
          <div key={item.id} className="bg-surface-900/60 border border-surface-800/80 rounded-xl p-6 hover:border-surface-700 transition-colors">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs bg-surface-800 text-amber-300 px-2 py-1 rounded">
                  {item.id}
                </span>
                <h2 className="text-lg font-semibold text-surface-100">{item.title}</h2>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> {item.status}
              </span>
            </div>

            <p className="text-sm text-surface-300 mb-4">{item.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-950/50 p-4 rounded-lg text-xs border border-surface-800/50">
              <div>
                <span className="text-rose-400 font-semibold block mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Risk / Impact:
                </span>
                <p className="text-surface-400 leading-relaxed">{item.impact}</p>
              </div>

              <div>
                <span className="text-primary-400 font-semibold block mb-1 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" /> SpendGuard Mitigation Strategy:
                </span>
                <p className="text-surface-300 leading-relaxed">{item.mitigation}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
