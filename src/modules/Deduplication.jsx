import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { CheckCircle2, Cloud, Database, Hash, KeyRound, Lock, Shield, Sparkles, Unlock, Upload, User, Wallet } from 'lucide-react';
import Formula from '../components/Formula';

const BASE_BLOCKS = [
  { id: 'b1', type: 'public', status: 'raw', fileTag: 't', tag: 'tg_1', payload: 'm_1', keyCipher: 'Key_1' },
  { id: 'b2', type: 'private', status: 'raw', fileTag: 't', tag: 'tg_2', payload: 'c_2', keyCipher: 'Key_2' },
  { id: 'b3', type: 'private', status: 'raw', fileTag: 't', tag: 'tg_3', payload: 'c_3', keyCipher: 'Key_3' },
  { id: 'b4', type: 'public', status: 'raw', fileTag: 't', tag: 'tg_4', payload: 'm_4', keyCipher: 'Key_4' },
];

const STEPS = [
  {
    id: 'prepare',
    title: 'Step 1 · Local Preprocess',
    summary: '\\text{分块、分 sector、计算 } fk \\;/\\; tg_i \\;/\\; Key_i\\text{，并得到身份凭证 } UID \\text{ 与 } W\\text{。}',
    formula: 't = g^{fk},\\quad tg_i = H_1(c_i),\\quad UID = (H_4(uid) \\cdot t)^{\\mu}',
  },
  {
    id: 'check',
    title: 'Step 2 · Off-chain Dedup Check',
    summary: '\\text{向 CSP 发送第一次请求 } \\langle t, T, \\{Key_i\\}, uid, UID, W \\rangle\\text{。}',
    formula: 'e(UID, g) = e(H_4(uid) \\cdot t, W)',
  },
  {
    id: 'auth',
    title: 'Step 3 · Unique Block AuthGen',
    summary: '\\text{CSP 返回 } T_u \\text{ 后，仅为唯一块生成 } y_i \\;/\\; Y_i \\;/\\; \\sigma_i\\text{。}',
    formula: 'Y_i = g^{y_i},\\quad \\sigma_i = (H_2(s \\parallel tg_i) \\cdot \\prod r_j^{c_{i,j}})^{y_i}',
  },
  {
    id: 'commit',
    title: 'Step 4 · Upload + Ledger',
    summary: '\\text{提交第二次请求 } \\langle C_u, \\sigma \\rangle\\text{，支付 } fee_1\\text{，CSP 验证并构建增强 MHT。}',
    formula: 'e(\\sigma_i, g) = e(H_2(s \\parallel tg_i) \\cdot \\prod r_j^{c_{i,j}}, Y_i)',
  },
  {
    id: 'done',
    title: 'Step 5 · Metadata Retained',
    summary: '\\text{链上登记 } \\langle t, T_u, \\sigma, uid, SID, w_r \\rangle\\text{，本地只保留最小元数据。}',
    formula: '\\text{keep: } \\langle t, sk, uid, \\mu \\mid UID/W, w_r \\rangle',
  },
];

const phaseAccent = {
  idle: 'border-slate-700 text-slate-400',
  active: 'border-indigo-400 bg-indigo-500/10 text-indigo-100 shadow-[0_0_24px_rgba(99,102,241,0.18)]',
  done: 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100',
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Deduplication() {
  const { state, dispatch } = useStore();
  const { contract, currentFile } = state;
  const [phase, setPhase] = useState('prepare');
  const [blocks, setBlocks] = useState(BASE_BLOCKS);
  const [activeStep, setActiveStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [requestPacket, setRequestPacket] = useState(null);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [dedupResult, setDedupResult] = useState(null);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [storedRoot, setStoredRoot] = useState(null);
  const [escrowLocked, setEscrowLocked] = useState(false);

  const addLog = (message) => dispatch({ type: 'ADD_LOG', payload: message });

  const uniqueBlocks = useMemo(
    () => blocks.filter((block) => block.status === 'unique' || block.status === 'uploaded'),
    [blocks]
  );

  const duplicateBlocks = useMemo(
    () => blocks.filter((block) => block.status === 'duplicate'),
    [blocks]
  );

  const setGlobalPhase = (value) => dispatch({ type: 'UPDATE_FILE_STATUS', payload: value });

  const resetAll = () => {
    setPhase('prepare');
    setBlocks(BASE_BLOCKS);
    setActiveStep(0);
    setRequestPacket(null);
    setIdentityVerified(false);
    setDedupResult(null);
    setUploadQueue([]);
    setStoredRoot(null);
    setEscrowLocked(false);
    dispatch({
      type: 'SET_FILE_METADATA',
      payload: {
        owner: 'UID_ALICE',
        uid: 'uid_alice',
        uidProof: '0xbc51...8a1',
        witness: 'g^μ',
        fileTag: '0x8f2a...91e',
        rootHash: 'w_r',
      },
    });
    setGlobalPhase('LOCAL_PREPROCESSING');
    BASE_BLOCKS.forEach((block) => {
      dispatch({ type: 'SET_BLOCK_STATUS', id: block.id, status: 'pending' });
    });
    addLog('Deduplication scene reset to the upload baseline.');
  };

  const runCurrentStep = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (phase === 'prepare') {
      setActiveStep(0);
      setGlobalPhase('LOCAL_PREPROCESSING');
      addLog('Client split F into n blocks and each block into s sectors.');
      await wait(700);

      setBlocks((prev) =>
        prev.map((block) => ({
          ...block,
          status: 'prepared',
        }))
      );
      addLog('Computed fk, sector keys, block tags tg_i, and ECC key ciphertexts {Key_i}.');
      dispatch({
        type: 'SET_FILE_METADATA',
        payload: {
          fileTag: '0x8f2a...91e',
          uidProof: '0xbc51...8a1',
          witness: 'g^μ',
        },
      });
      await wait(800);

      addLog('Derived UID=(H4(uid)·t)^μ and W=g^μ for later identity authentication.');
      setRequestPacket('dedup-check');
      setPhase('check');
      setActiveStep(1);
      setGlobalPhase('AUTH_CHECKING');
    } else if (phase === 'check') {
      addLog('Client sent the first off-chain request: <t, T, {Key_i}, uid, UID, W>.');
      await wait(700);

      setIdentityVerified(true);
      addLog('CSP verified e(UID, g) = e(H4(uid)·t, W) before any dedup operation.');
      await wait(800);

      setBlocks((prev) =>
        prev.map((block) => {
          const nextStatus = block.id === 'b2' ? 'duplicate' : 'unique';
          dispatch({ type: 'SET_BLOCK_STATUS', id: block.id, status: nextStatus });
          return { ...block, status: nextStatus };
        })
      );
      setDedupResult({
        fileCheck: 'miss',
        uniqueTags: ['tg_1', 'tg_3', 'tg_4'],
      });
      addLog('File-level check missed on t, then block-level check returned T_u={tg_1,tg_3,tg_4}.');
      setRequestPacket(null);
      setPhase('auth');
      setActiveStep(2);
      setGlobalPhase('DEDUP_PROBING');
    } else if (phase === 'auth') {
      addLog('Client generated y_i, Y_i, and σ_i only for blocks in T_u.');
      await wait(700);

      setBlocks((prev) =>
        prev.map((block) =>
          block.status === 'unique'
            ? { ...block, proof: `σ_${block.id.slice(1)}`, publicValue: `Y_${block.id.slice(1)}` }
            : block
        )
      );
      setRequestPacket('commit-upload');
      addLog('Prepared the second request payload: <C_u, σ>. Duplicate block b2 was excluded.');
      setPhase('commit');
      setActiveStep(3);
      setGlobalPhase('DEDUP_DONE');
    } else if (phase === 'commit') {
      addLog(`User prepaid storage fee fee1=${contract.fee1} ETH to the smart contract.`);
      setEscrowLocked(true);
      await wait(700);

      for (const block of uniqueBlocks) {
        setUploadQueue((prev) => [...prev, block.id]);
        setBlocks((prev) => prev.map((item) => (item.id === block.id ? { ...item, status: 'uploaded' } : item)));
        addLog(`Uploaded ${block.id} with ${block.proof ?? `σ_${block.id.slice(1)}`}; CSP validated equation (5).`);
        await wait(650);
      }

      setStoredRoot('w_r = H(tg_1 || tg_3 || tg_4)');
      dispatch({
        type: 'SET_FILE_METADATA',
        payload: {
          rootHash: 'w_r',
          fileTag: currentFile.fileTag,
          uid: 'uid_alice',
          owner: 'UID_ALICE',
        },
      });
      addLog('CSP stored <t, T, {Key_i}, T_u, C_u>, built the enhanced MHT, and deposited Fee1=2*fee1.');
      await wait(800);

      addLog('Blockchain recorded <t, T_u, σ, uid, SID, w_r>; client can now delete the large local file.');
      setRequestPacket(null);
      setPhase('done');
      setActiveStep(4);
      setGlobalPhase('STORED');
    }

    setIsProcessing(false);
  };

  const cspStoredBlocks = blocks.filter((block) => block.status === 'uploaded');

  return (
    <div className="flex h-full w-full flex-col overflow-hidden p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Sparkles size={20} className="text-amber-400" />
            <h2 className="text-2xl font-black uppercase tracking-tight text-white">Deduplication Upload Pipeline</h2>
          </div>
          <p className="max-w-4xl text-sm font-medium tracking-tight text-slate-400">
            按论文第 6-7 页细化为五段流程：本地预处理、第一次链下去重检查、唯一块认证器生成、第二次提交、链上登记与元数据保留。
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/30 p-1.5 backdrop-blur-xl">
          <button
            onClick={runCurrentStep}
            disabled={isProcessing || phase === 'done'}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:bg-indigo-500 disabled:opacity-40"
          >
            {isProcessing ? 'Running...' : phase === 'done' ? 'Completed' : STEPS[activeStep].title}
          </button>
          <button
            onClick={resetAll}
            className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-300 transition-all hover:border-white/20 hover:bg-slate-800"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid flex-1 min-h-0 grid-cols-[360px_minmax(0,1fr)] gap-6">
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
          <div className="glass-panel rounded-3xl p-5">
            <div className="mb-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Protocol Steps</div>
            <div className="space-y-3">
              {STEPS.map((step, index) => {
                const stateKey = activeStep === index ? 'active' : activeStep > index || phase === 'done' && index <= activeStep ? 'done' : 'idle';
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
            <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
              <Database size={12} />
              Request Trace
            </div>
            <div className="space-y-3 text-xs text-slate-400">
              <div className={`rounded-2xl border p-4 ${requestPacket === 'dedup-check' ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/10 bg-slate-950/70'}`}>
                <div className="mb-2 font-black text-white">Request 1 · `POST /dedup/check`</div>
                <Formula latex="\langle t, T=\{tg_i\}, \{Key_i\}, uid, UID, W \rangle" displayMode={false} className="text-[11px] leading-6" />
              </div>
              <div className={`rounded-2xl border p-4 ${requestPacket === 'commit-upload' ? 'border-emerald-400 bg-emerald-500/10' : 'border-white/10 bg-slate-950/70'}`}>
                <div className="mb-2 font-black text-white">Request 2 · `POST /upload/commit`</div>
                <Formula latex="\langle C_u, \sigma=\{\sigma_i\} \rangle" displayMode={false} className="text-[11px] leading-6" />
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="mb-2 font-black text-white">Ledger Record</div>
                <Formula latex="\langle t, T_u, \sigma, uid, SID, w_r \rangle" displayMode={false} className="text-[11px] leading-6" />
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-5">
            <div className="mb-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Derived State</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="mb-1 text-slate-500">Identity</div>
                <div className={`font-mono ${identityVerified ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {identityVerified ? 'verified' : 'pending'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="mb-1 text-slate-500">T_u</div>
                <div className="font-mono text-slate-200">
                  {dedupResult ? dedupResult.uniqueTags.join(', ') : 'waiting'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="mb-1 text-slate-500">Duplicate</div>
                <div className="font-mono text-rose-300">
                  {duplicateBlocks.length ? duplicateBlocks.map((block) => block.id).join(', ') : 'none'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="mb-1 text-slate-500">MHT Root</div>
                <div className="font-mono text-cyan-300">{storedRoot ?? 'not committed'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
          <div className="glass-panel rounded-3xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="mb-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Upload Intent</div>
                <div className="text-sm text-slate-300">
                  公开块保留明文，私密块只显示处理后的密文载荷；只有唯一块进入第二次上传与认证器提交。
                </div>
              </div>
              <div className={`rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest ${escrowLocked ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-300' : 'border-white/10 text-slate-500'}`}>
                {escrowLocked ? `fee1 locked: ${contract.fee1} ETH` : 'fee1 pending'}
              </div>
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden rounded-[28px] border border-white/5 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.88),_rgba(2,6,23,0.98))] p-8">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:30px_30px]" />

            <div className="relative z-10 flex h-full items-center justify-between gap-8">
              <div className="flex w-[30%] flex-col items-center gap-5">
                <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl border-2 border-indigo-500/40 bg-indigo-500/10">
                  <User className="h-12 w-12 text-indigo-400" />
                  <div className="absolute -bottom-2 rounded-full bg-indigo-500 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest">
                    Client
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {blocks.map((block) => {
                    const isPrivate = block.type === 'private';
                    const uploaded = block.status === 'uploaded';
                    const unique = block.status === 'unique';
                    const duplicate = block.status === 'duplicate';
                    const prepared = block.status === 'prepared';

                    return (
                      <motion.div
                        key={block.id}
                        layout
                        className={`relative w-24 rounded-2xl border p-3 transition-all duration-500 ${
                          duplicate
                            ? 'border-rose-500/40 bg-rose-500/10 opacity-50'
                            : uploaded
                              ? 'border-emerald-500/60 bg-emerald-500/10 opacity-40'
                              : unique
                                ? 'border-emerald-500/60 bg-emerald-500/10'
                                : prepared
                                  ? 'border-cyan-500/40 bg-cyan-500/10'
                                  : isPrivate
                                    ? 'border-purple-500/30 bg-slate-900'
                                    : 'border-blue-500/30 bg-slate-900'
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between text-[9px] font-mono text-slate-500">
                          <span>{block.id}</span>
                          {isPrivate ? <Lock size={12} className="text-purple-400" /> : <Unlock size={12} className="text-blue-400" />}
                        </div>
                        <Formula latex={block.payload} displayMode={false} className="mb-2 text-[11px] font-black text-white" />
                        <Formula latex={block.tag} displayMode={false} className="text-[9px] text-slate-400" />
                        <div className="mt-2 text-[8px] uppercase tracking-widest text-slate-500">
                          {duplicate ? 'duplicate' : uploaded ? 'committed' : unique ? 'unique' : prepared ? 'prepared' : 'raw'}
                        </div>
                        {(unique || uploaded) && (
                          <div className="absolute -right-1 -top-1 rounded-full bg-emerald-500 p-1 text-white">
                            <Shield size={10} />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="relative flex h-full flex-1 items-center justify-center">
                <div className="absolute left-0 right-0 top-1/2 h-12 -translate-y-1/2 rounded-full border border-white/5 bg-slate-900/40" />

                <AnimatePresence>
                  {requestPacket === 'dedup-check' && (
                    <motion.div
                      initial={{ x: -220, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 220, opacity: 0 }}
                      transition={{ duration: 0.8 }}
                      className="absolute rounded-2xl border border-indigo-400/50 bg-indigo-500/10 px-4 py-3 text-center"
                    >
                      <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-indigo-300">Request 1</div>
                      <Formula latex="\langle t, T, \{Key_i\}, uid, UID, W \rangle" displayMode={false} className="text-[11px] text-white" />
                    </motion.div>
                  )}
                  {requestPacket === 'commit-upload' && (
                    <motion.div
                      initial={{ x: -220, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 220, opacity: 0 }}
                      transition={{ duration: 0.8 }}
                      className="absolute rounded-2xl border border-emerald-400/50 bg-emerald-500/10 px-4 py-3 text-center"
                    >
                      <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">Request 2</div>
                      <Formula latex="\langle C_u, \sigma \rangle" displayMode={false} className="text-[11px] text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {identityVerified && (
                  <div className="absolute top-[28%] rounded-2xl border border-purple-400/50 bg-purple-500/10 px-4 py-3 text-center">
                    <div className="mb-1 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-300">
                      <KeyRound size={12} />
                      Identity Verified
                    </div>
                    <Formula latex="e(UID, g) = e(H_4(uid) \cdot t, W)" displayMode={false} className="text-[11px] text-white" />
                  </div>
                )}

                {dedupResult && (
                  <div className="absolute bottom-[24%] rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-center">
                    <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-amber-300">CSP Dedup Result</div>
                    <Formula latex="T_u = \{tg_1, tg_3, tg_4\}" displayMode={false} className="text-[11px] text-white" />
                  </div>
                )}
              </div>

              <div className="flex w-[30%] flex-col items-center gap-5">
                <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl border-2 border-cyan-500/40 bg-cyan-500/10">
                  <Cloud className="h-12 w-12 text-cyan-400" />
                  <div className="absolute -bottom-2 rounded-full bg-cyan-500 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-950">
                    CSP
                  </div>
                </div>

                <div className="w-full rounded-3xl border border-white/10 bg-slate-950/75 p-4">
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                    <Database size={12} />
                    Cloud Storage
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {cspStoredBlocks.length > 0 ? (
                      cspStoredBlocks.map((block) => (
                        <motion.div
                          key={block.id}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-center"
                        >
                          <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-emerald-300">{block.id}</div>
                          <Formula latex={block.tag} displayMode={false} className="text-[11px] text-white" />
                        </motion.div>
                      ))
                    ) : (
                      <div className="col-span-3 py-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-700">
                        storage pool empty
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="glass-panel rounded-3xl p-5">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                <Hash size={12} />
                Local Metadata
              </div>
              <div className="space-y-2 font-mono text-[11px] text-slate-300">
                <div>t: 0x8f2a...91e</div>
                <div>UID: 0xuid...a19</div>
                <Formula latex="W = g^{\mu}" displayMode={false} className="text-[11px] text-slate-300" />
                <div>sk: secp256k1</div>
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-5">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                <Upload size={12} />
                Unique Payload
              </div>
              <div className="space-y-2 font-mono text-[11px] text-slate-300">
                <div>C_u: {uniqueBlocks.map((block) => block.id).join(', ') || 'pending'}</div>
                <div className="text-[11px] text-slate-300">σ: {phase === 'commit' || phase === 'done' ? <Formula latex="\{\sigma_1, \sigma_3, \sigma_4\}" displayMode={false} className="inline text-[11px] text-slate-300" /> : 'waiting'}</div>
                <div>Keys: {'{Key_1...Key_4}'}</div>
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-5">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                <Wallet size={12} />
                On-chain Effects
              </div>
              <div className="space-y-2 font-mono text-[11px] text-slate-300">
                <div>fee1: {escrowLocked ? `${contract.fee1} ETH paid` : 'pending'}</div>
                <div>Fee1: {escrowLocked ? `${(contract.fee1 * 2).toFixed(2)} ETH` : 'not deposited'}</div>
                <div>w_r: {storedRoot ? 'committed' : 'waiting'}</div>
                <div>SID: AWS_ASIA_EAST_01</div>
              </div>
            </div>
          </div>

          {phase === 'done' && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-5"
            >
              <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300">
                <CheckCircle2 size={12} />
                Upload Completed
              </div>
              <div className="text-sm leading-7 text-slate-200">
                <Formula latex="\text{这一轮演示结束后，前端保留的最小元数据应是 } t \;/\; sk \;/\; uid \;/\; \mu\text{(或 } UID, W\text{) } \;/\; w_r\text{，而不再继续持有大文件本体。}" displayMode={false} className="inline text-sm leading-7 text-slate-200" />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
