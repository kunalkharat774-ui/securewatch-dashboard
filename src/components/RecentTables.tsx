import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UrlScanResult, FileActivity } from '../types';

interface RecentTablesProps {
  urlScans?: UrlScanResult[];
  fileActivities: FileActivity[];
}

export const RecentTables: React.FC<RecentTablesProps> = ({ fileActivities }) => {
  return (
    <div className="grid grid-cols-1 gap-6 mb-6">
      {/* Recent File Activity */}
      <div className="bg-[#0a0803]/80 backdrop-blur-md border border-amber-500/30 hover:border-amber-400/50 transition rounded-xl p-5 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm text-white">Recent File Activity</h3>
          <span className="text-xs text-amber-300 font-mono">Total: {fileActivities.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-amber-500/20 text-amber-200/70 font-normal">
                <th className="pb-3 px-2 font-normal">File Name</th>
                <th className="pb-3 px-2 font-normal">Action</th>
                <th className="pb-3 px-2 font-normal">Status</th>
                <th className="pb-3 px-2 font-normal">Size</th>
                <th className="pb-3 px-2 font-normal">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-500/15 text-gray-300">
              {fileActivities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 font-mono text-xs">
                    <i className="fa-solid fa-folder-open text-amber-400/50 text-xl mb-2 block" />
                    No recent file activity. Encrypt, decrypt, or scan a file above to view activity here.
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {fileActivities.map((act, index) => (
                    <motion.tr
                      key={act.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.04 }}
                      className="hover:bg-amber-950/30 transition"
                    >
                      <td className="py-2.5 px-2 font-medium text-white max-w-[200px] truncate font-mono" title={act.fileName}>
                        {act.fileName}
                      </td>
                      <td className="py-2.5 px-2 font-semibold text-gray-200">{act.action}</td>
                      <td className="py-2.5 px-2">
                        <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-semibold">
                          {act.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-gray-400 font-mono">{act.size}</td>
                      <td className="py-2.5 px-2 text-gray-400 whitespace-nowrap">{act.time}</td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


