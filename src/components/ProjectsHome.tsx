import React from 'react';
import { Plus, Copy, Trash2, FolderOpen } from 'lucide-react';
import type { ProjectItem } from '../lib';

interface Props {
  projects: ProjectItem[];
  activeProjectId: string;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const ProjectsHome: React.FC<Props> = ({
  projects, activeProjectId, onOpen, onCreate, onDuplicate, onDelete, onClose,
}) => {
  const sorted = [...projects].sort((a, b) => b.updatedAt - a.updatedAt);
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0E0F12]/95 text-slate-100">
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col px-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Projects</h1>
          <button
            onClick={onCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium"
          >
            <Plus size={16} /> New project
          </button>
        </div>
        <div className="overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pr-1">
          {sorted.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl border p-4 bg-white/5 hover:bg-white/10 transition ${
                p.id === activeProjectId ? 'border-emerald-500/60' : 'border-white/10'
              }`}
            >
              <button onClick={() => onOpen(p.id)} className="w-full text-left">
                <div className="flex items-center gap-2 font-medium">
                  <FolderOpen size={16} className="text-slate-400" /> {p.name}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {p.boardConfig.platform} · {p.boardConfig.cols}×{p.boardConfig.rows} tiles ·{' '}
                  {p.channels.length} channels
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Edited {new Date(p.updatedAt).toLocaleString()}
                </div>
              </button>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => onDuplicate(p.id)}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-400"
                  title="Duplicate"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => window.confirm(`Delete "${p.name}"?`) && onDelete(p.id)}
                  className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-6 self-center text-sm text-slate-400 hover:text-slate-200">
          Continue with "{projects.find((p) => p.id === activeProjectId)?.name ?? 'current project'}"
        </button>
      </div>
    </div>
  );
};
