import React, { useState } from 'react';
import { Shield, Hash, Lock, Download, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from './store';
import Deduplication from './modules/Deduplication';
import Audit from './modules/Audit';
import Market from './modules/Market';
import HVTUpdate from './modules/HVTUpdate';
import Retrieve from './modules/Retrieve';

function App() {
  const { state, dispatch } = useStore();
  const { activeTab, currentFile, protocol } = state;
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const tabs = [
    { id: 'dedup', label: '1. Deduplication' },
    { id: 'retrieve', label: '2. Retrieve' },
    { id: 'hvt', label: '3. HVT Update' },
    { id: 'audit', label: '4. Hybrid Audit' },
    { id: 'market', label: '5. Data Market' },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      <header className="flex-none bg-slate-900 border-b border-slate-800/60 p-4 shrink-0 shadow-2xl z-20 flex items-center justify-between backdrop-blur-xl bg-opacity-80">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <Shield className="text-emerald-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              D-STORAGE
            </h1>
            <div className="text-[10px] font-bold text-emerald-500/80 tracking-[0.2em] uppercase">Interactive Protocol Sandbox</div>
          </div>
        </div>

        <nav className="flex bg-black/40 rounded-xl p-1 border border-white/5 backdrop-blur-md">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => dispatch({ type: 'SET_TAB', payload: tab.id })}
              className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 flex min-h-0">
        <aside className={`${leftCollapsed ? 'w-14' : 'w-64 xl:w-72'} bg-black/20 border-r border-white/5 p-3 flex flex-col gap-4 overflow-y-auto backdrop-blur-sm transition-all duration-300`}>
          <div className="flex items-center justify-between">
            {!leftCollapsed && (
              <h2 className="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase text-center opacity-70">Node State Agent</h2>
            )}
            <button
              onClick={() => setLeftCollapsed((prev) => !prev)}
              className="ml-auto rounded-lg border border-white/10 bg-slate-900/80 p-2 text-slate-400 transition-colors hover:border-white/20 hover:text-slate-200"
              aria-label={leftCollapsed ? 'Expand left sidebar' : 'Collapse left sidebar'}
            >
              {leftCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            </button>
          </div>

          {!leftCollapsed && (
            <>
          <div className="glass-panel rounded-2xl p-4 group hover:border-indigo-500/20 transition-all duration-500">
            <h3 className="font-bold text-[11px] text-indigo-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
              Data Object
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Object ID</span>
                <span className="font-mono text-cyan-300">{currentFile.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Owner</span>
                <span className="font-mono text-cyan-300">{currentFile.owner}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">UID</span>
                <span className="font-mono text-cyan-300">{currentFile.uid}</span>
              </div>
              <div className="flex justify-between border-t border-slate-700/50 pt-2 mt-2">
                <span className="text-slate-400">Phase</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider">
                  {currentFile.status}
                </span>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-4">
            <h3 className="font-bold text-[11px] text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
              <Hash size={12} className="text-purple-500" /> Protocol Params
            </h3>
            <div className="space-y-3 text-[10px] font-mono">
              <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 group transition-colors hover:border-purple-500/30">
                <div className="text-slate-600 mb-1.5 flex justify-between">
                  <span>File Tag (t)</span>
                  <Lock size={10} />
                </div>
                <div className="text-purple-300 font-bold tracking-wider break-all">{currentFile.fileTag}</div>
              </div>
              <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 group transition-colors hover:border-blue-500/30">
                <div className="text-slate-600 mb-1.5 flex justify-between">
                  <span>Auth UID</span>
                  <Shield size={10} />
                </div>
                <div className="text-blue-300 font-bold tracking-wider break-all">{currentFile.uidProof}</div>
              </div>
              <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 group transition-colors hover:border-cyan-500/30">
                <div className="text-slate-600 mb-1.5 flex justify-between">
                  <span>Witness W</span>
                  <Download size={10} />
                </div>
                <div className="text-cyan-300 font-bold tracking-wider break-all">{currentFile.witness}</div>
              </div>
              <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 group transition-colors hover:border-emerald-500/30">
                <div className="text-slate-600 mb-1.5 flex justify-between">
                  <span>Root</span>
                  <Hash size={10} />
                </div>
                <div className="text-emerald-300 font-bold tracking-wider break-all">{currentFile.rootHash}</div>
              </div>
            </div>
          </div>
            </>
          )}
        </aside>

        <section className="flex-1 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950 p-3 relative overflow-hidden flex flex-col min-h-0 bg-grid-slate-800/[0.05]">
          <div className="absolute inset-0 bg-slate-950 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] -z-1 pointer-events-none"></div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full"
            >
              {activeTab === 'dedup' && <Deduplication />}
              {activeTab === 'retrieve' && <Retrieve />}
              {activeTab === 'audit' && <Audit />}
              {activeTab === 'market' && <Market />}
              {activeTab === 'hvt' && <HVTUpdate />}
              {!tabs.find((tab) => tab.id === activeTab) && (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 italic">
                  <p>Module {activeTab.toUpperCase()} implementation pending...</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </section>

        <aside className={`${rightCollapsed ? 'w-14' : 'w-56 xl:w-64'} bg-black/20 border-l border-white/5 p-3 flex flex-col gap-4 overflow-y-auto backdrop-blur-sm transition-all duration-300`}>
          <div className="flex items-center justify-between">
            {!rightCollapsed && (
              <h2 className="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase text-center opacity-70">Protocol State Machine</h2>
            )}
            <button
              onClick={() => setRightCollapsed((prev) => !prev)}
              className="ml-auto rounded-lg border border-white/10 bg-slate-900/80 p-2 text-slate-400 transition-colors hover:border-white/20 hover:text-slate-200"
              aria-label={rightCollapsed ? 'Expand right sidebar' : 'Collapse right sidebar'}
            >
              {rightCollapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
            </button>
          </div>
          {!rightCollapsed && (
          <div className="glass-panel rounded-2xl p-3.5">
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Current Track</div>
            <div className="space-y-2">
              {protocol.availableStages.map((stage) => {
                const active = currentFile.status === stage;
                const reached = protocol.availableStages.indexOf(currentFile.status) >= protocol.availableStages.indexOf(stage);
                return (
                  <div
                    key={stage}
                    className={`rounded-xl border px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                      active
                        ? 'border-indigo-400 bg-indigo-500/10 text-indigo-100'
                        : reached
                          ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
                          : 'border-white/5 bg-slate-950/60 text-slate-500'
                    }`}
                  >
                    {stage}
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </aside>
      </main>

    </div>
  );
}

export default App;
