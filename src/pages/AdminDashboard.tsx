import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Loader2, Database, Users, Layers, Code2, Server } from 'lucide-react';
import {
  appBenchData,
  uiBenchData,
  features as featuresData,
  categories as categoriesData,
} from '@/constants/mockData';
import type { BuildRequest } from '@/types';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [buildRequests, setBuildRequests] = useState<BuildRequest[]>([]);

  const fetchData = () => {
    setLoading(true);
    setTimeout(() => {
      const stored = JSON.parse(
        localStorage.getItem('forjenta_build_requests') || '[]'
      ) as BuildRequest[];
      setBuildRequests(stored);
      setLastRefresh(new Date());
      setLoading(false);
    }, 500);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="size-4" />
              Back to Home
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-2 text-xs text-white transition-colors hover:bg-zinc-700"
            >
              <RefreshCw className="size-3" />
              Refresh
            </button>
          </div>
        </div>

        <h1 className="mb-8 font-display text-3xl font-bold text-white">
          ForJenta Admin Dashboard
        </h1>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="size-6 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-400">Loading backend data...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { icon: Database, label: 'Build Requests', value: buildRequests.length, color: 'text-violet-400' },
                { icon: Layers, label: 'Categories', value: categoriesData.length, color: 'text-blue-400' },
                { icon: Code2, label: 'Features', value: featuresData.length, color: 'text-green-400' },
                { icon: Users, label: 'Benchmarks', value: appBenchData.length + uiBenchData.length, color: 'text-orange-400' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-white/5 bg-zinc-950 p-4">
                  <stat.icon className={`size-5 ${stat.color}`} />
                  <div className="mt-3 font-display text-2xl font-bold text-white">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Build Requests */}
            <div className="rounded-xl border border-white/5 bg-zinc-950 p-6">
              <h2 className="mb-4 font-display text-lg font-semibold text-white">
                Build Requests ({buildRequests.length})
              </h2>
              {buildRequests.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  No build requests yet
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {buildRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-start justify-between rounded-lg border border-white/5 bg-zinc-900 p-4"
                    >
                      <div className="flex-1">
                        <p className="text-sm text-white">{req.prompt}</p>
                        <div className="mt-2 flex items-center gap-2">
                          {req.categories.map((cat) => (
                            <span
                              key={cat}
                              className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-300"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[10px] text-gray-500">
                          {new Date(req.timestamp).toLocaleString()}
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-gray-600">
                          {req.id.substring(0, 12)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Categories */}
            <div className="rounded-xl border border-white/5 bg-zinc-950 p-6">
              <h2 className="mb-4 font-display text-lg font-semibold text-white">
                Categories ({categoriesData.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                {categoriesData.map((cat) => (
                  <span
                    key={cat}
                    className="rounded-full border border-white/10 bg-zinc-900 px-4 py-2 text-sm text-gray-300"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="rounded-xl border border-white/5 bg-zinc-950 p-6">
              <h2 className="mb-4 font-display text-lg font-semibold text-white">
                Features ({featuresData.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                {featuresData.map((feat) => (
                  <div key={feat.title} className="rounded-lg border border-white/5 bg-zinc-900 p-4">
                    <h3 className="text-sm font-semibold text-white">{feat.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-gray-400">
                      {feat.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Benchmarks */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-white/5 bg-zinc-950 p-6">
                <h2 className="mb-4 font-display text-lg font-semibold text-white">
                  App Benchmarks ({appBenchData.length})
                </h2>
                <div className="flex flex-col gap-2">
                  {appBenchData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between rounded-lg bg-zinc-900 px-3 py-2">
                      <span className={`text-xs ${item.isForJenta ? 'font-bold text-white' : 'text-gray-400'}`}>
                        {item.name}
                      </span>
                      <span className={`text-xs font-mono ${item.isForJenta ? 'text-violet-400' : 'text-gray-500'}`}>
                        {item.score}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-zinc-950 p-6">
                <h2 className="mb-4 font-display text-lg font-semibold text-white">
                  UI Benchmarks ({uiBenchData.length})
                </h2>
                <div className="flex flex-col gap-2">
                  {uiBenchData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between rounded-lg bg-zinc-900 px-3 py-2">
                      <span className={`text-xs ${item.isForJenta ? 'font-bold text-white' : 'text-gray-400'}`}>
                        {item.name}
                      </span>
                      <span className={`text-xs font-mono ${item.isForJenta ? 'text-violet-400' : 'text-gray-500'}`}>
                        {item.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* API Endpoints */}
            <div className="rounded-xl border border-white/5 bg-zinc-950 p-6">
              <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-white">
                <Server className="size-5 text-violet-400" />
                Backend API Endpoints
              </h2>
              <div className="flex flex-col gap-2">
                {[
                  { method: 'GET', path: '/api/benchmarks' },
                  { method: 'GET', path: '/api/features' },
                  { method: 'GET', path: '/api/categories' },
                  { method: 'POST', path: '/api/build-requests' },
                  { method: 'GET', path: '/api/build-requests' },
                  { method: 'POST', path: '/api/generate-code' },
                  { method: 'POST', path: '/api/projects' },
                  { method: 'GET', path: '/api/projects/:id' },
                  { method: 'POST', path: '/api/auth/login' },
                  { method: 'POST', path: '/api/auth/signup' },
                ].map((ep) => (
                  <div key={`${ep.method}-${ep.path}`} className="flex items-center gap-3 rounded-lg bg-zinc-900 px-4 py-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        ep.method === 'GET'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="font-mono text-xs text-gray-300">
                      {ep.path}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
