import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { CheckCircle2, Cloud, Download, KeyRound, Lock, RefreshCcw, ShieldCheck, Unlock, User } from 'lucide-react';
import Formula from '../components/Formula';

const STEPS = [
  {
    id: 'request',
    title: 'Step 1 · Retrieve Request',
    formula: '\\langle t, UID, W \\rangle',
    summary: '\\text{用户向 CSP 发送检索请求 } \\langle t, UID, W \\rangle\\text{。}',
  },
  {
    id: 'auth',
    title: 'Step 2 · Identity Check',
    summary: '\\text{CSP 先验证 } e(UID, g) = e(H_4(uid) \\cdot t, W)\\text{，只有当前 owner 能下载。}',
    formula: 'e(UID, g) = e(H_4(uid) \\cdot t, W)',
  },
  {
    id: 'download',
    title: 'Step 3 · Download C + Key_i',
    summary: '\\text{通过验证后，CSP 返回处理后的数据集 } C \\text{ 和 ECC 密钥密文 } \\{Key_i\\}\\text{。}',
    formula: '\\langle C, \\{Key_i\\} \\rangle',
  },
  {
    id: 'decrypt',
    title: 'Step 4 · Local Recovery',
    summary: '\\text{客户端用 } sk \\text{ 解密 } Key_i\\text{，公开块直读，私密块逐 sector 做 } H_3(k) \\oplus c \\text{ 恢复。}',
    formula: 'm(i,j) = H_3(k(i,j)) \\oplus c(i,j)',
  },
  {
    id: 'done',
    title: 'Step 5 · File Reassembled',
    summary: '\\text{全部块合并，恢复原始文件 } F\\text{。}',
    formula: 'F = \\text{merge}(\\text{public} \\cup \\text{decrypted private})',
  },
];

const phaseAccent = {
  idle: 'border-slate-700 text-slate-400',
  active: 'border-indigo-400 bg-indigo-500/10 text-indigo-100 shadow-[0_0_24px_rgba(99,102,241,0.18)]',
  done: 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100',
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Retrieve() {
  const { state, dispatch } = useStore();
  const { currentFile } = state;
  const [phase, setPhase] = useState('request');
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [payloadReturned, setPayloadReturned] = useState(false);
  const [decryptedBlocks, setDecryptedBlocks] = useState([]);
  const [reassembled, setReassembled] = useState(false);
  const [flowObject, setFlowObject] = useState(null);

  const addLog = (message) => dispatch({ type: 'ADD_LOG', payload: message });

  const resetRetrieve = () => {
    setPhase('request');
    setCurrentStep(0);
    setIdentityVerified(false);
    setPayloadReturned(false);
    setDecryptedBlocks([]);
    setReassembled(false);
    setFlowObject(null);
    dispatch({ type: 'UPDATE_FILE_STATUS', payload: 'STORED' });
    addLog('Retrieve scene reset to idle.');
  };

  const runCurrentStep = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (phase === 'request') {
      setFlowObject('request');
      dispatch({ type: 'UPDATE_FILE_STATUS', payload: 'RETRIEVING' });
      addLog(`User ${currentFile.owner} submitted the retrieve request tuple <t, UID, W> to CSP.`);
      await wait(850);
      setFlowObject(null);
      setPhase('auth');
      setCurrentStep(1);
    } else if (phase === 'auth') {
      setFlowObject('auth');
      setIdentityVerified(true);
      addLog(`CSP verified the current owner context ${currentFile.uid} before releasing any stored blocks.`);
      await wait(850);
      setFlowObject(null);
      setPhase('download');
      setCurrentStep(2);
    } else if (phase === 'download') {
      setFlowObject('download');
      setPayloadReturned(true);
      addLog('CSP returned the processed data set C together with encrypted key bundle {Key_i}.');
      await wait(850);
      setFlowObject(null);
      setPhase('decrypt');
      setCurrentStep(3);
    } else if (phase === 'decrypt') {
      dispatch({ type: 'UPDATE_FILE_STATUS', payload: 'DECRYPTING' });
      addLog('Client used sk to decrypt Key_i, then recovered private sectors with H3(k) XOR c.');
      await wait(700);
      setDecryptedBlocks(['b2 -> m_2', 'b3 -> m_3']);
      addLog('Public blocks were read directly while private blocks were restored locally.');
      await wait(700);
      setPhase('done');
      setCurrentStep(4);
    } else if (phase === 'done') {
      setReassembled(true);
      dispatch({ type: 'UPDATE_FILE_STATUS', payload: 'STORED' });
      addLog('All blocks were merged and the original file F was reassembled.');
    }

    setIsProcessing(false);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Download size={20} className="text-cyan-400" />
            <h2 className="text-2xl font-black uppercase tracking-tight text-white">Retrieve & Recover</h2>
          </div>
          <Formula latex="\text{对应论文第 8 页的数据检索流程：先做身份校验，再拿回 } \langle C, \{Key_i\} \rangle\text{，最后在本地用 } sk \text{ 恢复私密块并重组文件。}" displayMode={false} className="max-w-4xl text-sm font-medium tracking-tight text-slate-400" />
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/30 p-1.5 backdrop-blur-xl">
          <button
            onClick={runCurrentStep}
            disabled={isProcessing || (phase === 'done' && reassembled)}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:bg-indigo-500 disabled:opacity-40"
          >
            {isProcessing ? 'Running...' : phase === 'done' && reassembled ? 'Completed' : STEPS[currentStep].title}
          </button>
          <button
            onClick={resetRetrieve}
            className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-300 transition-all hover:border-white/20 hover:bg-slate-800"
          >
            <RefreshCcw size={14} className="inline-block mr-1" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid flex-1 min-h-0 grid-cols-[360px_minmax(0,1fr)] gap-6">
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
          <div className="glass-panel rounded-3xl p-5">
            <div className="mb-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Retrieve Steps</div>
            <div className="space-y-3">
              {STEPS.map((step, index) => {
                const stateKey = currentStep === index ? 'active' : currentStep > index || reassembled ? 'done' : 'idle';
                return (
                  <div key={step.id} className={`rounded-2xl border p-4 transition-all overflow-x-auto ${phaseAccent[stateKey]}`}>
                    <div className="mb-2 flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/20 text-[10px] font-black">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div className="text-sm font-black">{step.title}</div>
                    </div>
                    <Formula latex={step.summary} displayMode={false} className="mb-2 text-xs leading-6 text-slate-300/90" />
                    <Formula latex={step.formula} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-5">
            <div className="mb-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Recovery State</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="mb-1 text-slate-500">Identity</div>
                <div className={`font-mono ${identityVerified ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {identityVerified ? 'verified' : 'pending'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="mb-1 text-slate-500">Payload</div>
                <div className="text-slate-200">{payloadReturned ? <Formula latex="\langle C, \{Key_i\} \rangle" displayMode={false} /> : 'waiting'}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="mb-1 text-slate-500">Private Blocks</div>
                <div className="font-mono text-cyan-300">{decryptedBlocks.length ? decryptedBlocks.join(', ') : 'waiting'}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="mb-1 text-slate-500">File</div>
                <div className={`font-mono ${reassembled ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {reassembled ? currentFile.name : 'not reassembled'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
          <div className="glass-panel rounded-3xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="mb-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Retrieval Rule</div>
                <div className="text-sm text-slate-300">
                  <Formula latex="\text{公开块直接读取；私密块必须先解开 } Key_i\text{，再逐 sector 恢复。}" displayMode={false} className="text-sm text-slate-300" />
                </div>
              </div>
              <div className="rounded-full border border-cyan-400/50 bg-cyan-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-cyan-300">
                local recovery path
              </div>
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden rounded-[28px] border border-white/5 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.88),_rgba(2,6,23,0.98))] p-8">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:30px_30px]" />

            <div className="relative z-10 flex h-full items-center justify-between px-10">
              <div className="flex flex-col items-center gap-5">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-slate-700 bg-slate-900">
                  <User className="h-10 w-10 text-slate-500" />
                  <div className="absolute -bottom-2 rounded-full bg-slate-800 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-300">
                    User
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-center">
                  <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Local Secret</div>
                  <div className="font-mono text-sm text-amber-300">{currentFile.uidProof} + {currentFile.witness}</div>
                </div>
              </div>

              <div className="flex flex-1 items-center justify-center">
                <div className="absolute left-[26%] right-[26%] top-1/2 h-12 -translate-y-1/2 rounded-full border border-white/5 bg-slate-900/40" />

                <AnimatePresence>
                  {flowObject === 'request' && (
                    <motion.div
                      initial={{ x: -220, opacity: 0 }}
                      animate={{ x: -10, opacity: 1 }}
                      exit={{ x: 120, opacity: 0 }}
                      className="absolute rounded-2xl border border-indigo-400/50 bg-indigo-500/10 px-4 py-3 text-center"
                    >
                      <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-indigo-300">Retrieve Request</div>
                      <Formula latex={`\\langle ${currentFile.fileTag}, UID, W \\rangle`} displayMode={false} className="text-[11px] text-white" />
                    </motion.div>
                  )}
                  {flowObject === 'auth' && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.1, opacity: 0 }}
                      className="absolute top-[24%] rounded-2xl border border-purple-400/50 bg-purple-500/10 px-4 py-3 text-center"
                    >
                      <div className="mb-1 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-300">
                        <ShieldCheck size={12} />
                        Identity Gate
                      </div>
                      <Formula latex="e(UID, g) = e(H_4(uid) \cdot t, W)" displayMode={false} className="text-[11px] text-white" />
                    </motion.div>
                  )}
                  {flowObject === 'download' && (
                    <motion.div
                      initial={{ x: 220, opacity: 0 }}
                      animate={{ x: 10, opacity: 1 }}
                      exit={{ x: -120, opacity: 0 }}
                      className="absolute rounded-2xl border border-cyan-400/50 bg-cyan-500/10 px-4 py-3 text-center"
                    >
                      <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">Cloud Return</div>
                      <Formula latex="\langle C, \{Key_i\} \rangle" displayMode={false} className="text-[11px] text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-col items-center gap-5">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-cyan-500/40 bg-cyan-500/10">
                  <Cloud className="h-10 w-10 text-cyan-400" />
                  <div className="absolute -bottom-2 rounded-full bg-cyan-500 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-950">
                    CSP
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-center">
                  <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Returned Payload</div>
                  <div className="text-sm text-cyan-300">{payloadReturned ? <Formula latex="C + Key_i" displayMode={false} /> : 'waiting'}</div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-10 grid grid-cols-4 gap-4">
              {[
                { id: 'b1', type: 'public', label: 'm_1', restored: true },
                { id: 'b2', type: 'private', label: decryptedBlocks.length ? 'm_2' : 'c_2', restored: decryptedBlocks.length > 0 },
                { id: 'b3', type: 'private', label: decryptedBlocks.length ? 'm_3' : 'c_3', restored: decryptedBlocks.length > 0 },
                { id: 'b4', type: 'public', label: 'm_4', restored: true },
              ].map((block) => (
                <div
                  key={block.id}
                  className={`rounded-2xl border p-4 text-center ${block.type === 'private' ? (block.restored ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-purple-500/40 bg-purple-500/10') : 'border-blue-500/40 bg-blue-500/10'}`}
                >
                  <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span>{block.id}</span>
                    {block.type === 'private' ? <Lock size={12} className="text-purple-300" /> : <Unlock size={12} className="text-blue-300" />}
                  </div>
                  <Formula latex={block.label} displayMode={false} className="text-sm text-white" />
                  <div className="mt-2 text-[9px] uppercase tracking-widest text-slate-500">
                    {block.type === 'private' ? (block.restored ? 'decrypted' : 'ciphertext') : 'plaintext'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {reassembled && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-5"
            >
              <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300">
                <CheckCircle2 size={12} />
                File Recovered
              </div>
              <div className="text-sm leading-7 text-slate-200">
                检索阶段已经完整覆盖论文流程：身份验证、下载处理后数据、局部解密私密块、重新拼装原文件。
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
