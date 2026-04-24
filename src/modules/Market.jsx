import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { CheckCircle2, CircleDollarSign, Database, KeyRound, Package, RefreshCcw, Shield, Siren, User, Wallet } from 'lucide-react';
import Formula from '../components/Formula';

const STEPS = [
  {
    id: 'buyer',
    title: 'Step 1 · Buyer Request',
    summary: '\\text{买家 } U_2 \\text{ 向合约提交 } \\langle uid_1, uid_2 \\rangle \\text{ 并支付交易费 } fee_3\\text{。}',
    formula: '\\langle uid_1, uid_2 \\rangle + \\text{pay } fee_3',
  },
  {
    id: 'seller',
    title: 'Step 2 · Seller Proof',
    summary: '\\text{卖家 } U_1 \\text{ 提交 } \\langle UID_1, W_1, t \\rangle \\text{ 并存入保证金 } Fee_3 = 2 \\times fee_3\\text{。}',
    formula: '\\langle UID_1, W_1, t \\rangle + Fee_3',
  },
  {
    id: 'csp',
    title: 'Step 3 · Owner Update',
    summary: '\\text{合约把 } \\langle UID_1, W_1, t, uid_1, uid_2 \\rangle \\text{ 转发给 CSP，CSP 验证身份后更新 owner。}',
    formula: 'e(UID_1, g) = e(H_4(uid_1) \\cdot t, W_1)',
  },
  {
    id: 'key',
    title: 'Step 4 · Secret Key Transfer',
    summary: '\\text{owner 更新完成后，} U_1 \\text{ 经安全信道发送 } sk\\text{，合约同时把 } fee_3 \\text{ 转给 } U_1\\text{。}',
    formula: 'U_1 \\to U_2 : sk',
  },
  {
    id: 'verify',
    title: 'Step 5 · Buyer Verification',
    summary: '\\text{买家 } U_2 \\text{ 生成 } UID_2\\;/\\;W_2\\text{，请求检索并尝试用 } sk \\text{ 解密返回的 } C \\text{ 与 } Key_i\\text{。}',
    formula: 'UID_2 = (H_4(uid_2) \\cdot t)^{\\mu_2},\\quad W_2 = g^{\\mu_2}',
  },
  {
    id: 'settle',
    title: 'Step 6 · Final Settlement',
    summary: '\\text{成功则退还 } Fee_3 \\text{ 给 } U_1\\text{；失败则把 } Fee_3 \\text{ 赔给 } U_2\\text{。}',
    formula: '\\text{success} \\to Fee_3 \\to U_1,\\quad \\text{fail} \\to Fee_3 \\to U_2',
  },
];

const phaseAccent = {
  idle: 'border-slate-700 text-slate-400',
  active: 'border-indigo-400 bg-indigo-500/10 text-indigo-100 shadow-[0_0_24px_rgba(99,102,241,0.18)]',
  done: 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100',
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Market() {
  const { state, dispatch } = useStore();
  const { currentFile, contract } = state;
  const [currentStep, setCurrentStep] = useState(0);
  const [phase, setPhase] = useState('buyer');
  const [isProcessing, setIsProcessing] = useState(false);
  const [decryptionFailure, setDecryptionFailure] = useState(false);
  const [flowObject, setFlowObject] = useState(null);
  const [ownerUpdateRecord, setOwnerUpdateRecord] = useState(null);
  const [sellerPacket, setSellerPacket] = useState(null);
  const [buyerPacket, setBuyerPacket] = useState(null);
  const [retrievalPacket, setRetrievalPacket] = useState(null);
  const [transferResult, setTransferResult] = useState(null);
  const [timeline, setTimeline] = useState([
    { label: 'Buyer request submitted', done: false },
    { label: 'Seller proof deposited', done: false },
    { label: 'Owner updated at CSP', done: false },
    { label: 'sk delivered to buyer', done: false },
    { label: 'Buyer verification finished', done: false },
    { label: 'Escrow settled', done: false },
  ]);

  const addLog = (message) => dispatch({ type: 'ADD_LOG', payload: message });

  const settlementText = useMemo(() => {
    if (transferResult === 'success') return `Fee3 -> U1 (${contract.Fee3.toFixed(2)} ETH returned)`;
    if (transferResult === 'fail') return `Fee3 -> U2 (${contract.Fee3.toFixed(2)} ETH compensation)`;
    return 'pending';
  }, [transferResult, contract.Fee3]);

  const markTimeline = (index) => {
    setTimeline((prev) => prev.map((item, idx) => (idx === index ? { ...item, done: true } : item)));
  };

  const resetMarketScene = () => {
    setCurrentStep(0);
    setPhase('buyer');
    setFlowObject(null);
    setOwnerUpdateRecord(null);
    setSellerPacket(null);
    setBuyerPacket(null);
    setRetrievalPacket(null);
    setTransferResult(null);
    setTimeline([
      { label: 'Buyer request submitted', done: false },
      { label: 'Seller proof deposited', done: false },
      { label: 'Owner updated at CSP', done: false },
      { label: 'sk delivered to buyer', done: false },
      { label: 'Buyer verification finished', done: false },
      { label: 'Escrow settled', done: false },
    ]);
    dispatch({ type: 'SET_FILE_OWNER', payload: 'UID_ALICE' });
    dispatch({
      type: 'SET_FILE_METADATA',
      payload: {
        owner: 'UID_ALICE',
        uid: 'uid_alice',
        mu: 'μ_a9',
        uidProof: '0xbc51...8a1',
        witness: 'g^μ',
      },
    });
    dispatch({ type: 'UPDATE_CONTRACT_BALANCES', payload: { escrowBalance: 0 } });
    dispatch({ type: 'UPDATE_FILE_STATUS', payload: 'STORED' });
    addLog('Ownership transfer scene reset to the original owner.');
  };

  const runCurrentStep = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (phase === 'buyer') {
      setBuyerPacket('<uid1, uid2>');
      setFlowObject('buyer_fee');
      dispatch({ type: 'UPDATE_CONTRACT_BALANCES', payload: { escrowBalance: contract.fee3 } });
      dispatch({ type: 'UPDATE_FILE_STATUS', payload: 'TRANSFER_PENDING' });
      addLog(`Buyer U2 submitted <uid1, uid2> and locked fee3=${contract.fee3} ETH in the smart contract.`);
      await wait(900);
      setFlowObject(null);
      markTimeline(0);
      setPhase('seller');
      setCurrentStep(1);
    } else if (phase === 'seller') {
      setSellerPacket('<UID1, W1, t>');
      setFlowObject('seller_fee');
      dispatch({ type: 'UPDATE_CONTRACT_BALANCES', payload: { escrowBalance: contract.fee3 + contract.Fee3 } });
      addLog(`Seller U1 submitted <UID1, W1, t> and deposited Fee3=${contract.Fee3} ETH.`);
      await wait(900);
      setFlowObject(null);
      markTimeline(1);
      setPhase('csp');
      setCurrentStep(2);
    } else if (phase === 'csp') {
      setFlowObject('owner_update');
      setOwnerUpdateRecord('<t, T_u, uid2, SID, w_r>');
      dispatch({ type: 'SET_FILE_OWNER', payload: 'UID_BOB' });
      dispatch({
        type: 'SET_FILE_METADATA',
        payload: {
          owner: 'UID_BOB',
          uid: 'uid_bob',
          mu: 'μ_b2',
          uidProof: '0xbd72...c44',
          witness: 'g^μ2',
        },
      });
      dispatch({ type: 'UPDATE_FILE_STATUS', payload: 'TRANSFER_OWNER_UPDATED' });
      addLog('SC forwarded <UID1, W1, t, uid1, uid2>; CSP verified seller identity and flipped the owner record to uid2.');
      await wait(950);
      setFlowObject(null);
      markTimeline(2);
      setPhase('key');
      setCurrentStep(3);
    } else if (phase === 'key') {
      setFlowObject('sk');
      dispatch({ type: 'UPDATE_CONTRACT_BALANCES', payload: { escrowBalance: contract.Fee3 } });
      addLog('After owner update, U1 transmitted sk through a secret channel, and the contract released fee3 to U1.');
      await wait(950);
      setFlowObject(null);
      markTimeline(3);
      setPhase('verify');
      setCurrentStep(4);
    } else if (phase === 'verify') {
      setRetrievalPacket('<UID2, W2, t>');
      setFlowObject('verify');
      dispatch({ type: 'UPDATE_FILE_STATUS', payload: 'TRANSFER_KEY_VERIFYING' });
      addLog('Buyer U2 derived UID2/W2, requested retrieval, and attempted to decrypt returned <C, Key_i> with received sk.');
      await wait(950);
      setFlowObject(null);
      setTransferResult(decryptionFailure ? 'fail' : 'success');
      addLog(
        decryptionFailure
          ? 'Buyer decryption failed, which means the transferred secret key is invalid.'
          : 'Buyer decryption succeeded, confirming the transferred secret key is correct.'
      );
      markTimeline(4);
      setPhase('settle');
      setCurrentStep(5);
    } else if (phase === 'settle') {
      if (transferResult === 'fail') {
        setFlowObject('compensate');
        dispatch({ type: 'UPDATE_CONTRACT_BALANCES', payload: { escrowBalance: 0 } });
        dispatch({ type: 'UPDATE_FILE_STATUS', payload: 'TRANSFER_FAILED' });
        addLog('SC received a failure notification and compensated U2 with seller deposit Fee3.');
      } else {
        setFlowObject('refund');
        dispatch({ type: 'UPDATE_CONTRACT_BALANCES', payload: { escrowBalance: 0 } });
        dispatch({ type: 'UPDATE_FILE_STATUS', payload: 'TRANSFER_SUCCESS' });
        dispatch({
          type: 'SET_FILE_METADATA',
          payload: {
            owner: 'UID_BOB',
            uid: 'uid_bob',
            mu: 'μ_b2',
            uidProof: '0xbd72...c44',
            witness: 'g^μ2',
          },
        });
        addLog('SC received a success notification and refunded Fee3 back to U1.');
      }

      await wait(900);
      setFlowObject(null);
      markTimeline(5);
      addLog('No tag or authenticator was recomputed because they depend on data content, not owner identity.');
      setPhase('done');
    }

    setIsProcessing(false);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Package size={20} className="text-amber-400" />
            <h2 className="text-2xl font-black uppercase tracking-tight text-white">Ownership Market</h2>
          </div>
          <Formula latex="\text{按论文第 9 页图 3 细化：买家提交 } \langle uid_1, uid_2 \rangle\text{，卖家提交 } \langle UID_1, W_1, t \rangle \text{ 与 } Fee_3\text{，CSP 改 owner，随后卖家传 } sk\text{，买家验证后走成功或失败结算分支。}" displayMode={false} className="max-w-4xl text-sm font-medium tracking-tight text-slate-400" />
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/30 p-1.5 backdrop-blur-xl">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-3 py-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Decrypt Fail</span>
            <button
              onClick={() => setDecryptionFailure((prev) => !prev)}
              className={`relative h-5 w-10 rounded-full transition-colors ${decryptionFailure ? 'bg-red-600' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-all ${decryptionFailure ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
          <button
            onClick={runCurrentStep}
            disabled={isProcessing || phase === 'done'}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:bg-indigo-500 disabled:opacity-40"
          >
            {isProcessing ? 'Running...' : phase === 'done' ? 'Completed' : STEPS[currentStep].title}
          </button>
          <button
            onClick={resetMarketScene}
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
            <div className="mb-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Transfer Steps</div>
            <div className="space-y-3">
              {STEPS.map((step, index) => {
                const stateKey = currentStep === index ? 'active' : currentStep > index || phase === 'done' ? 'done' : 'idle';
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
            <div className="mb-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Transfer Timeline</div>
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
            <div className="mb-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">State Trace</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="mb-1 text-slate-500">Buyer Packet</div>
                <div className="font-mono text-slate-200">{buyerPacket ?? 'waiting'}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="mb-1 text-slate-500">Seller Packet</div>
                <div className="font-mono text-slate-200">{sellerPacket ?? 'waiting'}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="mb-1 text-slate-500">Owner Record</div>
                <div className="font-mono text-cyan-300">{ownerUpdateRecord ?? 'waiting'}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="mb-1 text-slate-500">Retrieve Packet</div>
                <div className="font-mono text-slate-200">{retrievalPacket ?? 'waiting'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
          <div className="glass-panel rounded-3xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="mb-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Ownership Rule</div>
                <div className="text-sm text-slate-300">
                  <Formula latex="\text{交易页只处理身份、支付与 } sk \text{ 传递，不重算 tag / authenticator，因为它们只和数据内容有关。}" displayMode={false} className="text-sm text-slate-300" />
                </div>
              </div>
              <div className={`rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest ${decryptionFailure ? 'border-rose-400/50 bg-rose-500/10 text-rose-300' : 'border-emerald-400/50 bg-emerald-500/10 text-emerald-300'}`}>
                {decryptionFailure ? 'failure branch' : 'success branch'}
              </div>
            </div>
          </div>

          <div className="w-full rounded-3xl border border-white/5 bg-slate-900 p-5 relative overflow-hidden">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Database size={12} />
                Global Registry Meta-Database
              </div>
              <div className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[9px] font-black uppercase text-blue-300">
                physical data remains static
              </div>
            </div>

            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="border-b border-white/5 uppercase text-slate-600">
                  <th className="pb-3 text-left font-normal">File ID</th>
                  <th className="pb-3 text-left font-normal">Storage Provider</th>
                  <th className="pb-3 text-left font-normal">Current Owner</th>
                  <th className="pb-3 text-left font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-4 text-cyan-400">{currentFile.id}</td>
                  <td className="py-4 text-slate-400">AWS_ASIA_EAST_01</td>
                  <td className="py-4">
                    <motion.div
                      key={currentFile.owner}
                      initial={{ rotateX: 90 }}
                      animate={{ rotateX: 0 }}
                      transition={{ type: 'spring', damping: 10, stiffness: 100 }}
                      className={`inline-block rounded-lg border px-3 py-1.5 font-bold ${currentFile.owner === 'UID_ALICE' ? 'border-purple-500/30 text-purple-400' : 'border-amber-500/30 text-amber-400'}`}
                    >
                      {currentFile.owner}
                    </motion.div>
                  </td>
                  <td className="py-4 font-bold uppercase text-slate-500">
                    {transferResult === 'success' ? 'verified transfer' : transferResult === 'fail' ? 'disputed transfer' : 'registered'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="relative flex-1 overflow-hidden rounded-[28px] border border-white/5 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.88),_rgba(2,6,23,0.98))] p-8">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:30px_30px]" />

            <div className="relative z-10 flex h-full items-center justify-between px-10">
              <div className="flex flex-col items-center gap-5">
                <div className={`rounded-3xl border-2 p-1 ${currentFile.owner === 'UID_ALICE' || phase !== 'done' ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_30px_rgba(168,85,247,0.15)]' : 'border-slate-800 opacity-40'}`}>
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-slate-900">
                    <User size={36} className="text-purple-400" />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-black uppercase text-slate-200">Seller U1</div>
                  <div className="text-[10px] font-mono text-slate-500">uid1 = UID_ALICE</div>
                </div>
              </div>

              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                <div className="flex h-28 w-28 flex-col items-center justify-center rounded-3xl border-2 border-slate-800 bg-slate-950">
                  <Shield size={28} className="text-amber-400" />
                  <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                    Escrow: {contract.escrowBalance.toFixed(2)} ETH
                  </div>
                </div>
                <span className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Smart Escrow
                </span>
              </div>

              <div className="flex flex-col items-center gap-5">
                <div className={`rounded-3xl border-2 p-1 ${currentFile.owner === 'UID_BOB' ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.15)]' : 'border-slate-800'}`}>
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-slate-900">
                    <User size={36} className={currentFile.owner === 'UID_BOB' ? 'text-emerald-400' : 'text-slate-600'} />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-black uppercase text-slate-200">Buyer U2</div>
                  <div className="text-[10px] font-mono text-slate-500">uid2 = UID_BOB</div>
                </div>
              </div>

              <AnimatePresence>
                {flowObject === 'buyer_fee' && (
                  <motion.div
                    initial={{ left: '72%', opacity: 0 }}
                    animate={{ left: '53%', opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute top-[58%] -translate-y-1/2 -translate-x-full"
                  >
                    <div className="flex items-center gap-2 rounded-full border border-amber-500 bg-amber-500/20 px-3 py-1 text-[10px] font-bold text-amber-300">
                      <CircleDollarSign size={14} />
                      fee3 {contract.fee3}
                    </div>
                  </motion.div>
                )}

                {flowObject === 'seller_fee' && (
                  <motion.div
                    initial={{ left: '28%', opacity: 0 }}
                    animate={{ left: '47%', opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute top-[40%] -translate-y-1/2"
                  >
                    <div className="flex items-center gap-2 rounded-full border border-emerald-500 bg-emerald-500/20 px-3 py-1 text-[10px] font-bold text-emerald-300">
                      <CircleDollarSign size={14} />
                      Fee3 {contract.Fee3}
                    </div>
                  </motion.div>
                )}

                {flowObject === 'owner_update' && (
                  <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -30, opacity: 0 }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2"
                  >
                    <div className="rounded-2xl border border-indigo-400/50 bg-indigo-500/10 px-4 py-3 text-center">
                      <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-indigo-300">CSP Update</div>
                      <Formula latex="\langle UID_1, W_1, t, uid_1, uid_2 \rangle" displayMode={false} className="text-[11px] text-white" />
                    </div>
                  </motion.div>
                )}

                {flowObject === 'sk' && (
                  <motion.div
                    initial={{ left: '18%', opacity: 0 }}
                    animate={{ left: '73%', opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 1.1 }}
                    className="absolute top-[28%] -translate-y-1/2"
                  >
                    <div className="flex items-center gap-2 rounded-xl border-2 border-amber-200 bg-amber-400 px-3 py-1.5 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.4)]">
                      <KeyRound size={18} />
                      <span className="text-[11px] font-black uppercase">sk</span>
                    </div>
                  </motion.div>
                )}

                {flowObject === 'verify' && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.1, opacity: 0 }}
                    className="absolute top-[20%] left-1/2 -translate-x-1/2"
                  >
                    <div className="rounded-2xl border border-cyan-400/50 bg-cyan-500/10 px-4 py-3 text-center">
                      <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">Buyer Verify</div>
                      <Formula latex="\langle UID_2, W_2, t \rangle \to \langle C, Key_i \rangle" displayMode={false} className="text-[11px] text-white" />
                    </div>
                  </motion.div>
                )}

                {flowObject === 'refund' && (
                  <motion.div
                    initial={{ x: 0, opacity: 0 }}
                    animate={{ x: -220, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-1/2 -translate-y-1/2 left-1/2"
                  >
                    <div className="rounded-full border border-emerald-500 bg-emerald-500/20 p-3">
                      <CircleDollarSign className="h-7 w-7 text-emerald-400" />
                    </div>
                  </motion.div>
                )}

                {flowObject === 'compensate' && (
                  <motion.div
                    initial={{ x: 0, opacity: 0 }}
                    animate={{ x: 220, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-1/2 -translate-y-1/2 left-1/2"
                  >
                    <div className="rounded-full border border-rose-500 bg-rose-500/20 p-3">
                      <Siren className="h-7 w-7 text-rose-400" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="glass-panel rounded-3xl p-5">
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Identity Packets</div>
              <div className="space-y-2 text-[11px] text-slate-300">
                <Formula latex="\text{buyer: } \langle uid_1, uid_2 \rangle" displayMode={false} />
                <Formula latex="\text{seller: } \langle UID_1, W_1, t \rangle" displayMode={false} />
                <Formula latex="\text{buyer verify: } \langle UID_2, W_2, t \rangle" displayMode={false} />
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-5">
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Escrow Logic</div>
              <div className="space-y-2 font-mono text-[11px] text-slate-300">
                <div>fee3: {contract.fee3} ETH to U1</div>
                <div>Fee3: {contract.Fee3.toFixed(2)} ETH locked</div>
                <div>settlement: {settlementText}</div>
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-5">
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Static Security Params</div>
              <div className="space-y-2 text-[11px] text-slate-300">
                <div>t: unchanged</div>
                <div>T_u: unchanged</div>
                <Formula latex="\sigma\text{: unchanged}" displayMode={false} />
                <div>w_r: unchanged</div>
              </div>
            </div>
          </div>

          {phase === 'done' && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-3xl border p-5 ${transferResult === 'success' ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-rose-400/30 bg-rose-500/10'}`}
            >
              <div className={`mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] ${transferResult === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}>
                {transferResult === 'success' ? <CheckCircle2 size={12} /> : <Siren size={12} />}
                {transferResult === 'success' ? 'Transfer Success' : 'Transfer Failed'}
              </div>
              <div className="text-sm leading-7 text-slate-200">
                {transferResult === 'success'
                  ? '买家成功解密，说明卖家交付了正确的 sk；Fee3 退还给卖家，owner 保持为 uid2。'
                  : '买家解密失败，说明 sk 错误；合约把 Fee3 赔给买家，但数据标签与认证器仍然无需重算。'}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
