import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { CheckCircle2, CircleDollarSign, Cloud, Database, FileSearch, Scale, Shield, Siren, User, Zap } from 'lucide-react';
import Formula from '../components/Formula';

const STEPS = [
  {
    id: 'request',
    title: 'Step 1 · Audit Request',
    summary: '\\text{用户向链上合约提交 } req \\text{ 并预付审计费 } fee_2\\text{。}',
    formula: '\\text{AuditReq}(req) + \\text{pay } fee_2',
  },
  {
    id: 'challenge',
    title: 'Step 2 · Challenge Generation',
    summary: '\\text{智能合约自动生成 } Chal = (z, \\theta_1, \\theta_2) \\text{ 并广播到链上。}',
    formula: 'Chal = (z, \\theta_1, \\theta_2)',
  },
  {
    id: 'proof',
    title: 'Step 3 · Proof Generation',
    summary: '\\text{CSP 读取 challenge，按 Algorithm 1 聚合每个 sector 的 } P_j\\text{。}',
    formula: 'P_j = \\sum v_i \\cdot c(x_i, j)',
  },
  {
    id: 'verify',
    title: 'Step 4 · VerifyProof',
    summary: '\\text{合约先聚合 } \\sigma_c\\text{，再按公式 (8) 验证 } P \\text{ 是否成立。}',
    formula: '\\sigma_c = \\prod \\sigma_{x_i}^{v_i}',
  },
  {
    id: 'settle',
    title: 'Step 5 · Settlement',
    summary: '\\text{成功则 } fee_2 \\text{ 释放给 CSP；失败则 } Fee_1 \\text{ 赔付给用户。}',
    formula: '\\text{result}=1 \\to fee_2 \\to CSP,\\quad \\text{result}=0 \\to Fee_1 \\to User',
  },
];

const phaseAccent = {
  idle: 'border-slate-700 text-slate-400',
  active: 'border-indigo-400 bg-indigo-500/10 text-indigo-100 shadow-[0_0_24px_rgba(99,102,241,0.18)]',
  done: 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100',
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Audit() {
  const { state, dispatch } = useStore();
  const { contract } = state;
  const [currentStep, setCurrentStep] = useState(0);
  const [auditPhase, setAuditPhase] = useState('request');
  const [isProcessing, setIsProcessing] = useState(false);
  const [tamperMode, setTamperMode] = useState(false);
  const [flowObject, setFlowObject] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [proof, setProof] = useState(null);
  const [sigmaC, setSigmaC] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [timeline, setTimeline] = useState([
    { label: 'Audit request submitted', done: false },
    { label: 'Challenge published', done: false },
    { label: 'Proof submitted', done: false },
    { label: 'Verify finished', done: false },
    { label: 'Funds settled', done: false },
  ]);

  const addLog = (message) => dispatch({ type: 'ADD_LOG', payload: message });

  const settlementText = useMemo(() => {
    if (verificationResult === true) return `fee2 -> CSP (${contract.fee2} ETH)`;
    if (verificationResult === false) return `Fee1 -> User (${contract.Fee1.toFixed(2)} ETH)`;
    return 'pending';
  }, [verificationResult, contract.fee2, contract.Fee1]);

  const markTimeline = (index) => {
    setTimeline((prev) => prev.map((item, idx) => (idx === index ? { ...item, done: true } : item)));
  };

  const resetAuditScene = () => {
    setCurrentStep(0);
    setAuditPhase('request');
    setFlowObject(null);
    setChallenge(null);
    setProof(null);
    setSigmaC(null);
    setVerificationResult(null);
    setTimeline([
      { label: 'Audit request submitted', done: false },
      { label: 'Challenge published', done: false },
      { label: 'Proof submitted', done: false },
      { label: 'Verify finished', done: false },
      { label: 'Funds settled', done: false },
    ]);
    dispatch({ type: 'SET_AUDIT_CHALLENGE', payload: null });
    dispatch({ type: 'SET_AUDIT_RESULT', payload: null });
    dispatch({ type: 'SET_SLASHING', payload: false });
    dispatch({ type: 'UPDATE_CONTRACT_BALANCES', payload: { escrowBalance: 0, cspVaultBalance: 10.0 } });
    dispatch({ type: 'UPDATE_FILE_STATUS', payload: 'STORED' });
    addLog('Audit scene reset to the pre-request state.');
  };

  const runCurrentStep = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (auditPhase === 'request') {
      dispatch({ type: 'SET_AUDIT_RESULT', payload: null });
      dispatch({ type: 'SET_SLASHING', payload: false });
      setVerificationResult(null);
      setSigmaC(null);
      setProof(null);

      setFlowObject('req');
      addLog(`User submitted req and prepaid fee2=${contract.fee2} ETH to the smart contract.`);
      await wait(900);
      setFlowObject(null);
      dispatch({ type: 'UPDATE_CONTRACT_BALANCES', payload: { escrowBalance: contract.fee2, cspVaultBalance: 10.0 } });
      dispatch({ type: 'UPDATE_FILE_STATUS', payload: 'AUDIT_REQUESTED' });
      markTimeline(0);
      setAuditPhase('challenge');
      setCurrentStep(1);
    } else if (auditPhase === 'challenge') {
      const nextChallenge = { z: 3, theta1: '0x1A7', theta2: '0x2B9', sample: ['x1=2', 'x2=4', 'x3=1'] };
      setChallenge(nextChallenge);
      dispatch({ type: 'SET_AUDIT_CHALLENGE', payload: nextChallenge });
      setFlowObject('chal');
      addLog('Smart contract generated Chal=(z, θ1, θ2) and published it on-chain.');
      await wait(900);
      setFlowObject(null);
      dispatch({ type: 'UPDATE_FILE_STATUS', payload: 'CHALLENGE_PUBLISHED' });
      markTimeline(1);
      setAuditPhase('proof');
      setCurrentStep(2);
    } else if (auditPhase === 'proof') {
      const nextProof = {
        p1: tamperMode ? 'P1*' : 'P1',
        p2: tamperMode ? 'P2*' : 'P2',
        p3: tamperMode ? 'P3*' : 'P3',
      };
      setProof(nextProof);
      setFlowObject('proof');
      addLog('CSP executed Algorithm 1: computed x_i, v_i, then aggregated sector proof set P={P_j}.');
      await wait(900);
      setFlowObject(null);
      dispatch({ type: 'UPDATE_FILE_STATUS', payload: 'PROOF_SUBMITTED' });
      markTimeline(2);
      setAuditPhase('verify');
      setCurrentStep(3);
    } else if (auditPhase === 'verify') {
      const nextSigma = tamperMode ? 'σ_c*' : 'σ_c';
      const success = !tamperMode;
      setSigmaC(nextSigma);
      setFlowObject('verify');
      addLog('Smart contract aggregated σ_c and ran VerifyProof with equation (8).');
      await wait(900);
      setFlowObject(null);

      dispatch({ type: 'SET_AUDIT_RESULT', payload: success });
      setVerificationResult(success);
      dispatch({ type: 'UPDATE_FILE_STATUS', payload: 'AUDIT_VERIFIED' });
      markTimeline(3);

      if (success) {
        addLog('Verification succeeded: e(σ_c, g) matched the right-hand side of equation (8).');
      } else {
        addLog('Verification failed: proof mismatch detected, data integrity cannot be confirmed.');
      }

      setAuditPhase('settle');
      setCurrentStep(4);
    } else if (auditPhase === 'settle') {
      if (verificationResult) {
        setFlowObject('fee_out');
        addLog('Audit passed, so the smart contract released fee2 to CSP.');
        dispatch({ type: 'UPDATE_CONTRACT_BALANCES', payload: { escrowBalance: 0 } });
        dispatch({ type: 'SET_SLASHING', payload: false });
      } else {
        setFlowObject('slash');
        addLog('Audit failed, so the smart contract transferred Fee1 to the user as compensation.');
        dispatch({
          type: 'UPDATE_CONTRACT_BALANCES',
          payload: { escrowBalance: 0, cspVaultBalance: Math.max(0, contract.cspVaultBalance - contract.Fee1) },
        });
        dispatch({ type: 'SET_SLASHING', payload: true });
      }

      await wait(900);
      setFlowObject(null);
      markTimeline(4);
      addLog(`Blockchain recorded <σ_c, P, result=${verificationResult ? 1 : 0}>.`);
      setAuditPhase('done');
    }

    setIsProcessing(false);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Shield size={20} className="text-emerald-400" />
            <h2 className="text-2xl font-black uppercase tracking-tight text-white">Mixed Data Auditing</h2>
          </div>
          <Formula latex="\text{按论文第 7-8 页细化为时间线：请求、挑战、证明、验证、结算。页面直接展示 } Chal\text{、}P\text{、}\sigma_c \text{ 和最终 } result\text{，并保留正常结算与罚没两条结果支路。}" displayMode={false} className="max-w-4xl text-sm font-medium tracking-tight text-slate-400" />
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/30 p-1.5 backdrop-blur-xl">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-3 py-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tamper Sim</span>
            <button
              onClick={() => setTamperMode((prev) => !prev)}
              className={`relative h-5 w-10 rounded-full transition-colors ${tamperMode ? 'bg-red-600' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-all ${tamperMode ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
          <button
            onClick={runCurrentStep}
            disabled={isProcessing || auditPhase === 'done'}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:bg-indigo-500 disabled:opacity-40"
          >
            {isProcessing ? 'Running...' : auditPhase === 'done' ? 'Completed' : STEPS[currentStep].title}
          </button>
          <button
            onClick={resetAuditScene}
            className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-300 transition-all hover:border-white/20 hover:bg-slate-800"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid flex-1 min-h-0 grid-cols-[360px_minmax(0,1fr)] gap-6">
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
          <div className="glass-panel rounded-3xl p-5">
            <div className="mb-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Audit Steps</div>
            <div className="space-y-3">
              {STEPS.map((step, index) => {
                const stateKey = currentStep === index ? 'active' : currentStep > index || auditPhase === 'done' ? 'done' : 'idle';
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
              <FileSearch size={12} />
              Audit Timeline
            </div>
            <div className="space-y-3">
              {timeline.map((item, index) => (
                <div key={item.label} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 overflow-x-auto ${item.done ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-slate-950/70 text-slate-400'}`}>
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full ${item.done ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                    {item.done ? <CheckCircle2 size={12} /> : <span className="text-[10px] font-black">{index + 1}</span>}
                  </div>
                  <div className="text-sm">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-5">
            <div className="mb-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Protocol State</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="mb-1 text-slate-500">Chal</div>
                <div className="font-mono text-slate-200">
                  {challenge ? `(${challenge.z}, ${challenge.theta1}, ${challenge.theta2})` : 'waiting'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="mb-1 text-slate-500">Proof P</div>
                <div className="font-mono text-slate-200">
                  {proof ? `{${proof.p1}, ${proof.p2}, ${proof.p3}}` : 'waiting'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="mb-1 text-slate-500">σ_c</div>
                <div className="font-mono text-cyan-300">{sigmaC ?? 'waiting'}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="mb-1 text-slate-500">Result</div>
                <div className={`font-mono ${verificationResult === true ? 'text-emerald-400' : verificationResult === false ? 'text-rose-400' : 'text-slate-300'}`}>
                  {verificationResult === true ? 'result = 1' : verificationResult === false ? 'result = 0' : 'waiting'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
          <div className="glass-panel rounded-3xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="mb-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Verification Equation</div>
                <Formula latex="\text{合约验证的核心是论文公式 (8)，页面里用 } \sigma_c \text{ 与 } P \text{ 的聚合结果驱动这条式子。}" displayMode={false} className="text-sm text-slate-300" />
              </div>
              <div className={`rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest ${tamperMode ? 'border-rose-400/50 bg-rose-500/10 text-rose-300' : 'border-emerald-400/50 bg-emerald-500/10 text-emerald-300'}`}>
                {tamperMode ? 'tampered proof branch' : 'honest proof branch'}
              </div>
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden rounded-[28px] border border-white/5 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.88),_rgba(2,6,23,0.98))] p-8">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:30px_30px]" />

            <div className="relative z-10 flex h-full items-center justify-between px-8">
              <div className="flex flex-col items-center gap-4">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-slate-700 bg-slate-900">
                  <User className="h-10 w-10 text-slate-500" />
                  <div className="absolute -bottom-2 rounded-full bg-slate-800 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-300">
                    User
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-center">
                  <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Audit Fee</div>
                  <div className="font-mono text-sm text-amber-300">{contract.fee2} ETH</div>
                </div>
              </div>

              <div className="flex flex-1 items-center justify-center">
                <div className="absolute left-[26%] right-[26%] top-1/2 h-12 -translate-y-1/2 rounded-full border border-white/5 bg-slate-900/40" />

                <AnimatePresence>
                  {flowObject === 'req' && (
                    <motion.div
                      initial={{ x: -220, opacity: 0 }}
                      animate={{ x: -20, opacity: 1 }}
                      exit={{ x: 120, opacity: 0 }}
                      className="absolute rounded-2xl border border-indigo-400/50 bg-indigo-500/10 px-4 py-3 text-center"
                    >
                      <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-indigo-300">req</div>
                      <Formula latex="\text{AuditReq}(req)" displayMode={false} className="text-[11px] text-white" />
                    </motion.div>
                  )}
                  {flowObject === 'chal' && (
                    <motion.div
                      initial={{ y: -120, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 120, opacity: 0 }}
                      className="absolute rounded-2xl border border-cyan-400/50 bg-cyan-500/10 px-4 py-3 text-center"
                    >
                      <div className="mb-1 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-cyan-300">
                        <Zap size={12} />
                        Chal
                      </div>
                      <Formula latex={challenge ? `(${challenge.z}, \\theta_1, \\theta_2)` : '(z, \\theta_1, \\theta_2)'} displayMode={false} className="text-[11px] text-white" />
                    </motion.div>
                  )}
                  {flowObject === 'proof' && (
                    <motion.div
                      initial={{ x: 220, opacity: 0 }}
                      animate={{ x: 20, opacity: 1 }}
                      exit={{ x: -120, opacity: 0 }}
                      className="absolute rounded-2xl border border-amber-400/50 bg-amber-500/10 px-4 py-3 text-center"
                    >
                      <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-amber-300">Proof P</div>
                      <Formula latex={proof ? `\\{${proof.p1}, ${proof.p2}, ${proof.p3}\\}` : '\\{P_j\\}'} displayMode={false} className="text-[11px] text-white" />
                    </motion.div>
                  )}
                  {flowObject === 'verify' && (
                    <motion.div
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.2, opacity: 0 }}
                      className="absolute rounded-2xl border border-violet-400/50 bg-violet-500/10 px-5 py-4 text-center"
                    >
                      <div className="mb-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-violet-300">
                        <Scale size={12} />
                        VerifyProof
                      </div>
                      <Formula latex="e(\sigma_c, g) \stackrel{?}{=} e(\prod H_2(s \parallel tg_{x_i})^{v_i} \cdot \prod r_j^{P_j}, \prod Y_{x_i})" displayMode={false} className="text-[11px] leading-6 text-white" />
                    </motion.div>
                  )}
                  {flowObject === 'fee_out' && (
                    <motion.div
                      initial={{ x: 0, opacity: 0 }}
                      animate={{ x: 220, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute rounded-full border border-emerald-400/50 bg-emerald-500/10 p-3"
                    >
                      <CircleDollarSign className="h-7 w-7 text-emerald-400" />
                    </motion.div>
                  )}
                  {flowObject === 'slash' && (
                    <motion.div
                      initial={{ x: 0, opacity: 0 }}
                      animate={{ x: -220, opacity: 1, scale: 1.15 }}
                      exit={{ opacity: 0 }}
                      className="absolute rounded-full border border-rose-400/50 bg-rose-500/10 p-3"
                    >
                      <Siren className="h-7 w-7 text-rose-400" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="absolute left-1/2 top-[16%] -translate-x-1/2">
                <motion.div
                  animate={
                    verificationResult === true
                      ? { borderColor: 'rgba(52,211,153,0.8)' }
                      : verificationResult === false
                        ? { borderColor: 'rgba(244,63,94,0.8)' }
                        : {}
                  }
                  className={`relative flex h-28 w-28 flex-col items-center justify-center rounded-3xl border-2 bg-slate-900 shadow-2xl ${
                    verificationResult === true
                      ? 'border-emerald-400 bg-emerald-500/10'
                      : verificationResult === false
                        ? 'border-rose-400 bg-rose-500/10'
                        : 'border-indigo-500/30'
                  }`}
                >
                  <Database className={`mb-2 h-10 w-10 ${verificationResult === true ? 'text-emerald-400' : verificationResult === false ? 'text-rose-400' : 'text-indigo-400/70'}`} />
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                    Vault: {contract.escrowBalance.toFixed(2)} ETH
                  </div>
                  <div className="absolute -top-3 rounded-full bg-indigo-500 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
                    Contract
                  </div>
                </motion.div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-cyan-500/40 bg-cyan-500/10">
                  <Cloud className="h-10 w-10 text-cyan-400" />
                  <div className="absolute -bottom-2 rounded-full bg-cyan-500 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-950">
                    CSP
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-center">
                  <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Deposit Fee1</div>
                  <div className={`font-mono text-sm ${contract.cspVaultBalance < 10 ? 'text-rose-300' : 'text-emerald-300'}`}>
                    {contract.cspVaultBalance.toFixed(2)} ETH
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="glass-panel rounded-3xl p-5">
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Algorithm 1 View</div>
              <div className="space-y-2 text-[11px] text-slate-300">
                <Formula latex="x_i = f_1(i, \theta_1)" displayMode={false} />
                <Formula latex="v_i = f_2(i, \theta_2)" displayMode={false} />
                <Formula latex="P_j = \sum v_i \cdot c(x_i, j)" displayMode={false} />
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-5">
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Algorithm 2 View</div>
              <div className="space-y-2 text-[11px] text-slate-300">
                <Formula latex="\sigma_c = \prod \sigma_{x_i}^{v_i}" displayMode={false} />
                <Formula latex="\text{left} = e(\sigma_c, g)" displayMode={false} />
                <Formula latex="\text{right} = e(H \cdot r^P, \prod Y_{x_i})" displayMode={false} />
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-5">
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Settlement</div>
              <div className="space-y-2 font-mono text-[11px] text-slate-300">
                <div>escrow: {contract.escrowBalance.toFixed(2)} ETH</div>
                <div>branch: {verificationResult === false ? 'slash' : verificationResult === true ? 'release' : 'pending'}</div>
                <div>result: {settlementText}</div>
              </div>
            </div>
          </div>

          {auditPhase === 'done' && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-3xl border p-5 ${verificationResult ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-rose-400/30 bg-rose-500/10'}`}
            >
              <div className={`mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] ${verificationResult ? 'text-emerald-300' : 'text-rose-300'}`}>
                {verificationResult ? <CheckCircle2 size={12} /> : <Siren size={12} />}
                {verificationResult ? 'Audit Passed' : 'Audit Failed'}
              </div>
              <div className="text-sm leading-7 text-slate-200">
                {verificationResult
                  ? <Formula latex="\text{当前路径对应论文里的 } result = 1\text{：proof 通过，} fee_2 \text{ 释放给 CSP，审计记录写入区块链。}" displayMode={false} className="text-sm leading-7 text-slate-200" />
                  : <Formula latex="\text{当前路径对应论文里的 } result = 0\text{：proof 不成立，合约触发赔付，CSP 的 } Fee_1 \text{ 被罚没给用户。}" displayMode={false} className="text-sm leading-7 text-slate-200" />}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
