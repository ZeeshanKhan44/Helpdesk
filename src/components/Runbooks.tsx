import { useEffect, useState } from 'react';
import { ClipboardList, ArrowLeft, Clock, CheckCircle2, Circle, Layers } from 'lucide-react';
import type { Runbook } from '@/types';
import { fetchRunbooks } from '@/lib/agent';
import { TierBadge } from './Badges';

export function Runbooks() {
  const [runbooks, setRunbooks] = useState<Runbook[]>([]);
  const [filtered, setFiltered] = useState<Runbook[]>([]);
  const [activeTier, setActiveTier] = useState<'all' | 'L1' | 'L2' | 'L3'>('all');
  const [selected, setSelected] = useState<Runbook | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await fetchRunbooks();
        if (active) {
          setRunbooks(data || []);
          setFiltered(data || []);
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (activeTier === 'all') {
      setFiltered(runbooks);
    } else {
      setFiltered(runbooks.filter((r) => r.tier === activeTier));
    }
  }, [activeTier, runbooks]);

  function toggleStep(step: number) {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  }

  if (selected) {
    const totalSteps = selected.steps.length;
    const doneCount = completedSteps.size;
    const progress = totalSteps > 0 ? Math.round((doneCount / totalSteps) * 100) : 0;

    return (
      <div className="animate-fade-in max-w-3xl mx-auto">
        <button
          onClick={() => {
            setSelected(null);
            setCompletedSteps(new Set());
          }}
          className="text-sm text-neutral-500 hover:text-neutral-700 font-medium flex items-center gap-1.5 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Runbooks
        </button>

        <div className="card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <TierBadge tier={selected.tier} />
                <span className="badge bg-neutral-100 text-neutral-500 capitalize">{selected.category}</span>
              </div>
              <h2 className="text-2xl font-bold text-neutral-800">{selected.title}</h2>
              <p className="text-sm text-neutral-500 mt-1.5">{selected.description}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1.5 text-neutral-500">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">~{selected.estimated_time_minutes} min</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-neutral-600">Progress</span>
              <span className="text-neutral-500">
                {doneCount}/{totalSteps} steps ({progress}%)
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-neutral-200 overflow-hidden">
              <div
                className="h-full bg-success-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="mt-6 space-y-3">
            {selected.steps.map((step) => {
              const done = completedSteps.has(step.step);
              return (
                <button
                  key={step.step}
                  onClick={() => toggleStep(step.step)}
                  className={`w-full flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all ${
                    done
                      ? 'border-success-200 bg-success-50/50'
                      : 'border-neutral-200 hover:border-primary-300 hover:bg-primary-50/30'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {done ? (
                      <CheckCircle2 className="w-6 h-6 text-success-600" />
                    ) : (
                      <Circle className="w-6 h-6 text-neutral-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-400">STEP {step.step}</span>
                      <h4 className={`text-sm font-semibold ${done ? 'text-success-700 line-through' : 'text-neutral-800'}`}>
                        {step.title}
                      </h4>
                    </div>
                    <p className={`text-sm mt-1 ${done ? 'text-neutral-400' : 'text-neutral-600'}`}>{step.detail}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {progress === 100 && (
            <div className="mt-6 p-4 rounded-xl bg-success-50 border border-success-200 flex items-center gap-3 animate-slide-up">
              <CheckCircle2 className="w-5 h-5 text-success-600" />
              <p className="text-sm font-semibold text-success-700">All steps completed! This runbook is done.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-neutral-800">Runbooks</h2>
        <p className="text-sm text-neutral-500 mt-1">Step-by-step maintenance procedures for L1 and L2 teams</p>
      </div>

      {/* Tier filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'L1', 'L2', 'L3'] as const).map((tier) => (
          <button
            key={tier}
            onClick={() => setActiveTier(tier)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeTier === tier
                ? 'bg-primary-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {tier === 'all' ? 'All Tiers' : `${tier} Procedures`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-3">
            <ClipboardList className="w-7 h-7 text-neutral-400" />
          </div>
          <p className="text-sm font-medium text-neutral-600">No runbooks found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((runbook) => (
            <button
              key={runbook.id}
              onClick={() => {
                setSelected(runbook);
                setCompletedSteps(new Set());
              }}
              className="card p-5 text-left hover:border-primary-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <TierBadge tier={runbook.tier} />
                    <span className="badge bg-neutral-100 text-neutral-500 capitalize">{runbook.category}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-neutral-800 group-hover:text-primary-700">
                    {runbook.title}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1.5 line-clamp-2">{runbook.description}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0 group-hover:bg-primary-50 transition-colors">
                  <Layers className="w-5 h-5 text-neutral-400 group-hover:text-primary-600" />
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-neutral-400">
                <span className="flex items-center gap-1">
                  <ClipboardList className="w-3.5 h-3.5" /> {runbook.steps.length} steps
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> ~{runbook.estimated_time_minutes} min
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
