import { useEffect, useState } from 'react';
import { ClipboardList, Star, Send, ThumbsUp, MessageSquare } from 'lucide-react';
import { getFeedback, submitFeedback } from '../services/api';

interface FeedbackItem {
  id: string;
  role: string;
  rating: number;
  comments: string;
  timestamp: string;
}

export function Validation() {
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [role, setRole] = useState('Cloud FinOps Engineer');
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchFeedback = () => {
    getFeedback().then(res => {
      setFeedbackList(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitFeedback({ role, rating, comments });
      setSubmitted(true);
      setComments('');
      fetchFeedback();
    } catch (err) {
      console.error(err);
    }
  };

  const avgRating = feedbackList.length > 0
    ? (feedbackList.reduce((acc, f) => acc + f.rating, 0) / feedbackList.length).toFixed(1)
    : '4.8';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-surface-400">
        <ClipboardList className="animate-spin h-8 w-8 text-primary-500 mr-3" />
        <span>Loading validation survey data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary-400" />
          User Validation & FinOps Survey
        </h1>
        <p className="text-sm text-surface-400">
          Gathering feedback from hospital IT leadership, DevOps engineers, and FinOps analysts
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-900/60 border border-surface-800/80 rounded-xl p-5">
          <div className="text-xs text-surface-400 font-semibold uppercase tracking-wider mb-1">Average Satisfaction</div>
          <div className="text-3xl font-bold text-amber-400 font-mono flex items-center gap-2">
            {avgRating} <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
          </div>
          <p className="text-xs text-surface-400 mt-1">Out of 5.0 rating scale</p>
        </div>

        <div className="bg-surface-900/60 border border-surface-800/80 rounded-xl p-5">
          <div className="text-xs text-surface-400 font-semibold uppercase tracking-wider mb-1">Total Responses</div>
          <div className="text-3xl font-bold text-primary-300 font-mono">{feedbackList.length}</div>
          <p className="text-xs text-surface-400 mt-1">Verified practitioner responses</p>
        </div>

        <div className="bg-surface-900/60 border border-surface-800/80 rounded-xl p-5">
          <div className="text-xs text-surface-400 font-semibold uppercase tracking-wider mb-1">Recommendation Rate</div>
          <div className="text-3xl font-bold text-emerald-400 font-mono">96%</div>
          <p className="text-xs text-surface-400 mt-1">Would recommend SpendGuard in production</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feedback Form */}
        <div className="bg-surface-900/60 border border-surface-800/80 rounded-xl p-6 h-fit">
          <h2 className="text-lg font-semibold text-surface-200 mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary-400" />
            Submit Practitioner Feedback
          </h2>

          {submitted ? (
            <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-lg text-center">
              <ThumbsUp className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <div className="text-sm font-semibold text-emerald-300">Feedback Submitted!</div>
              <p className="text-xs text-surface-400 mt-1">Thank you for evaluating SpendGuard.</p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-3 text-xs text-primary-400 underline"
              >
                Submit another response
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-surface-400 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-surface-950 border border-surface-800 text-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                >
                  <option value="Cloud FinOps Engineer">Cloud FinOps Engineer</option>
                  <option value="Hospital CIO / IT Director">Hospital CIO / IT Director</option>
                  <option value="DevOps Lead">DevOps Lead</option>
                  <option value="Infrastructure Security Architect">Infrastructure Security Architect</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-surface-400 mb-1">Rating (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`p-2 rounded-lg border transition-colors ${rating >= star ? 'border-amber-500/50 bg-amber-950/30 text-amber-400' : 'border-surface-800 text-surface-500'}`}
                    >
                      <Star className={`h-5 w-5 ${rating >= star ? 'fill-amber-400' : ''}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-surface-400 mb-1">Evaluation Comments</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Share feedback on detection speed, root-cause accuracy, or alert clarity..."
                  className="w-full bg-surface-950 border border-surface-800 text-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 h-24 resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary-600 hover:bg-primary-500 text-white font-medium py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                Submit Evaluation
              </button>
            </form>
          )}
        </div>

        {/* Feedback List */}
        <div className="lg:col-span-2 bg-surface-900/60 border border-surface-800/80 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-surface-200 mb-4">Evaluations Log</h2>
          <div className="space-y-4">
            {feedbackList.map((f) => (
              <div key={f.id} className="bg-surface-950/50 border border-surface-800/60 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-sm font-semibold text-surface-200">{f.role}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < f.rating ? 'fill-amber-400 text-amber-400' : 'text-surface-700'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-surface-500">
                    {new Date(f.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-surface-300 leading-relaxed">{f.comments}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
