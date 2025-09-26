import React from "react";
import { Users, Layers, CreditCard, PieChart, CheckCircle } from "lucide-react";

// AdminTotalsStrip
// Props:
// - totals: object with structure { total_users, filtered_users, active_subscriptions, by_plan, by_subscription_status }
// Example usage:
// <AdminTotalsStrip totals={totalsFromApi} />

export default function AdminTotalsStrip({ totals = null }) {
  const t = totals || {
    total_users: 0,
    filtered_users: 0,
    active_subscriptions: 0,
    by_plan: {},
    by_subscription_status: {},
  };

  const planOrder = ["foundation", "therapeutic", "comprehensive"];
  const statusOrder = Object.keys(t.by_subscription_status || {});

  const badge = (label, value, subtle = false) => (
    <div className={`flex items-center space-x-3 p-3 rounded-lg ${subtle ? 'bg-white' : 'bg-white'} shadow-sm`}>
      <div className="text-emerald-600">
        <Users className="h-6 w-6" />
      </div>
      <div>
        <div className="text-xs text-gray-400">{label}</div>
        <div className="text-lg font-semibold text-gray-900">{value}</div>
      </div>
    </div>
  );

  return (
    <div className="w-full bg-gray-50 p-4 rounded-lg">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total users */}
          <div className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-3 bg-emerald-50 rounded-full mr-4">
              <Users className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Total users</div>
              <div className="text-2xl font-bold text-gray-900">{t.total_users ?? 0}</div>
            </div>
          </div>

          {/* Filtered users */}
          <div className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-3 bg-blue-50 rounded-full mr-4">
              <Layers className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Shown (filtered)</div>
              <div className="text-2xl font-bold text-gray-900">{t.filtered_users ?? 0}</div>
            </div>
          </div>

          {/* Active subscriptions */}
          <div className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-3 bg-amber-50 rounded-full mr-4">
              <CreditCard className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Active subscriptions</div>
              <div className="text-2xl font-bold text-gray-900">{t.active_subscriptions ?? 0}</div>
            </div>
          </div>

          {/* By plan */}
          <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-gray-500">Users by plan</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {planOrder.map((plan) => {
                    const val = t.by_plan?.[plan] ?? 0;
                    return (
                      <div key={plan} className="flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-50 border">
                        <div className="text-sm font-medium text-gray-700 capitalize">{plan}</div>
                        <div className="text-sm font-semibold text-gray-900">{val}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="text-gray-400">
                <PieChart className="h-6 w-6" />
              </div>
            </div>

            {/* subscription status breakdown */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-500">By subscription status</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {statusOrder.length === 0 ? (
                  <div className="text-sm text-gray-400">No data</div>
                ) : (
                  statusOrder.map((st) => (
                    <div key={st} className="flex items-center space-x-2 px-3 py-1 rounded-md bg-gray-50 border">
                      <div className="text-xs text-gray-600 capitalize">{st.replace('_', ' ')}</div>
                      <div className="text-sm font-semibold text-gray-900">{t.by_subscription_status?.[st] ?? 0}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* small footer note */}
        <div className="mt-3 text-xs text-gray-400">Totals reflect the current filter selection (where applicable).</div>
      </div>
    </div>
  );
}
