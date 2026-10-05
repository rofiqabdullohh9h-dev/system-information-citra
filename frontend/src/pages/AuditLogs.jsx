import React, { useState, useMemo } from 'react';
import { History, Search, ShieldCheck, Filter, Clock, User } from 'lucide-react';
import { useAppStore } from '../store/store';

export default function AuditLogs() {
  const auditLogs = useAppStore((state) => state.auditLogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchSearch = log.adminNama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.target.toLowerCase().includes(searchQuery.toLowerCase());

      const matchAction = filterAction === 'ALL' || log.action.includes(filterAction);

      return matchSearch && matchAction;
    });
  }, [auditLogs, searchQuery, filterAction]);

  const getActionBadge = (action) => {
    if (action.includes('CREATE')) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">TAMBAH</span>;
    }
    if (action.includes('UPDATE')) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">UBAH</span>;
    }
    if (action.includes('DELETE')) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">HAPUS</span>;
    }
    if (action.includes('ATTENDANCE')) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">ABSENSI</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">{action}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-brand-700" />
            Audit Trail & Rekam Jejak
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Log keamanan dan transparansi aktivitas setiap pengurus dalam sistem.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari log atau nama pengurus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3.5 py-1.5 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 rounded-xl border border-slate-200 text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Semua Aksi</option>
            <option value="CREATE">Penambahan</option>
            <option value="UPDATE">Pembaruan</option>
            <option value="DELETE">Penghapusan</option>
            <option value="ATTENDANCE">Absensi</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
        {filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Waktu</th>
                  <th className="px-5 py-3.5">Nama Pengurus</th>
                  <th className="px-5 py-3.5">Tipe Aksi</th>
                  <th className="px-5 py-3.5">Objek Sasaran</th>
                  <th className="px-5 py-3.5">Rincian Perubahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 font-mono text-xs">
                      {log.timestamp}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                      {log.adminNama}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-800 line-clamp-1 max-w-xs">
                      {log.target}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 p-6 text-slate-500 space-y-2">
            <History className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="font-semibold text-slate-700">Tidak ada log aktivitas</h4>
            <p className="text-xs text-slate-400">Tidak ada riwayat yang cocok dengan kriteria filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
