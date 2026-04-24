import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { ArrowUpCircle, Edit3, GitBranch, Hash, Layers, Plus, RefreshCcw, ShieldCheck, Trash2 } from 'lucide-react';
import Formula from '../components/Formula';

const clone = (value) => JSON.parse(JSON.stringify(value));

const INITIAL_TREE = {
  id: 'root',
  hash: 'w_r',
  weight: 4,
  index: 0,
  children: [
    {
      id: 'n_a',
      hash: 'h_a',
      weight: 2,
      index: 1,
      children: [
        { id: 'm1', hash: 'h_1', weight: 1, index: 1, isLeaf: true, tag: 'tg_1', block: 'm_1' },
        { id: 'm2', hash: 'h_2', weight: 1, index: 2, isLeaf: true, tag: 'tg_2', block: 'm_2' },
      ],
    },
    {
      id: 'n_b',
      hash: 'h_b',
      weight: 2,
      index: 2,
      children: [
        { id: 'm3', hash: 'h_3', weight: 1, index: 3, isLeaf: true, tag: 'tg_3', block: 'm_3' },
        { id: 'm4', hash: 'h_4', weight: 1, index: 4, isLeaf: true, tag: 'tg_4', block: 'm_4' },
      ],
    },
  ],
};

const MODIFY_TREE = {
  id: 'root',
  hash: 'w_r*',
  weight: 4,
  index: 0,
  children: [
    {
      id: 'n_a',
      hash: 'h_a*',
      weight: 2,
      index: 1,
      children: [
        { id: 'm1', hash: 'h_1*', weight: 1, index: 1, isLeaf: true, tag: 'tg_1*', block: 'm_1*' },
        { id: 'm2', hash: 'h_2', weight: 1, index: 2, isLeaf: true, tag: 'tg_2', block: 'm_2' },
      ],
    },
    {
      id: 'n_b',
      hash: 'h_b',
      weight: 2,
      index: 2,
      children: [
        { id: 'm3', hash: 'h_3', weight: 1, index: 3, isLeaf: true, tag: 'tg_3', block: 'm_3' },
        { id: 'm4', hash: 'h_4', weight: 1, index: 4, isLeaf: true, tag: 'tg_4', block: 'm_4' },
      ],
    },
  ],
};

const DELETE_TREE = {
  id: 'root',
  hash: 'w_r*',
  weight: 3,
  index: 0,
  children: [
    { id: 'm2', hash: 'h_2', weight: 1, index: 2, isLeaf: true, tag: 'tg_2', block: 'm_2' },
    {
      id: 'n_b',
      hash: 'h_b',
      weight: 2,
      index: 2,
      children: [
        { id: 'm3', hash: 'h_3', weight: 1, index: 3, isLeaf: true, tag: 'tg_3', block: 'm_3' },
        { id: 'm4', hash: 'h_4', weight: 1, index: 4, isLeaf: true, tag: 'tg_4', block: 'm_4' },
      ],
    },
  ],
};

const INSERT_TREE = {
  id: 'root',
  hash: 'w_r*',
  weight: 5,
  index: 0,
  children: [
    {
      id: 'n_a',
      hash: 'h_a*',
      weight: 3,
      index: 1,
      children: [
        {
          id: 'h_c',
          hash: 'h_c*',
          weight: 2,
          index: 1,
          children: [
            { id: 'm1', hash: 'h_1', weight: 1, index: 1, isLeaf: true, tag: 'tg_1', block: 'm_1' },
            { id: 'm_new', hash: 'h_*', weight: 1, index: 2, isLeaf: true, tag: 'tg_*', block: 'm_*' },
          ],
        },
        { id: 'm2', hash: 'h_2', weight: 1, index: 3, isLeaf: true, tag: 'tg_2', block: 'm_2' },
      ],
    },
    {
      id: 'n_b',
      hash: 'h_b',
      weight: 2,
      index: 2,
      children: [
        { id: 'm3', hash: 'h_3', weight: 1, index: 4, isLeaf: true, tag: 'tg_3', block: 'm_3' },
        { id: 'm4', hash: 'h_4', weight: 1, index: 5, isLeaf: true, tag: 'tg_4', block: 'm_4' },
      ],
    },
  ],
};

const accentMap = {
  initial: {
    border: 'border-slate-500/40',
    soft: 'bg-slate-500/10 text-slate-300',
    strong: 'border-slate-300/70 text-slate-100 shadow-[0_0_24px_rgba(148,163,184,0.15)]',
    line: '#94a3b8',
    glow: 'shadow-[0_0_30px_rgba(148,163,184,0.18)]',
  },
  modify: {
    border: 'border-sky-500/50',
    soft: 'bg-sky-500/10 text-sky-300',
    strong: 'border-sky-400 text-sky-100 shadow-[0_0_24px_rgba(56,189,248,0.22)]',
    line: '#38bdf8',
    glow: 'shadow-[0_0_30px_rgba(56,189,248,0.18)]',
  },
  delete: {
    border: 'border-rose-500/50',
    soft: 'bg-rose-500/10 text-rose-300',
    strong: 'border-rose-400 text-rose-100 shadow-[0_0_24px_rgba(251,113,133,0.22)]',
    line: '#fb7185',
    glow: 'shadow-[0_0_30px_rgba(251,113,133,0.18)]',
  },
  insert: {
    border: 'border-emerald-500/50',
    soft: 'bg-emerald-500/10 text-emerald-300',
    strong: 'border-emerald-400 text-emerald-100 shadow-[0_0_24px_rgba(52,211,153,0.22)]',
    line: '#34d399',
    glow: 'shadow-[0_0_30px_rgba(52,211,153,0.18)]',
  },
};

const SCENARIOS = {
  initial: {
    key: 'initial',
    label: 'Initial State',
    icon: Layers,
    finalTree: INITIAL_TREE,
    title: 'Improved MHT Baseline',
    summary: '\\text{论文 Fig.2 的初始 HVT：每个节点展示 } (hash, lN, p) \\text{ 三元组，根节点固定为 } (w_r, 4, 0)\\text{。}',
    steps: [
      {
        title: '加载增强 MHT',
        description: '\\text{CSP 保存块标签作为叶子结点，内部结点按子结点哈希聚合生成。}',
        formula: 'h = H_1(h_{left} \\parallel h_{right})',
        highlightNodes: ['m1', 'm2', 'm3', 'm4'],
        mutateTree: INITIAL_TREE,
        log: 'Loaded the improved MHT baseline from Fig.2.',
      },
      {
        title: '记录可访问叶子数',
        description: '\\text{lN 表示该子树下可访问叶子数量，初始时根节点 } weight = 4\\text{。}',
        formula: 'lN = l_{left} + l_{right}',
        highlightNodes: ['n_a', 'n_b', 'root'],
        log: 'Accessible leaf counts are propagated to internal nodes.',
      },
      {
        title: '准备动态更新',
        description: '\\text{后续 Modify / Delete / Insert 都围绕目标叶子和自底向上的路径重算进行。}',
        formula: '\\text{path: } leaf \\to parent \\to root',
        highlightNodes: ['m1', 'n_a', 'root'],
        log: 'The HVT is ready for modify, delete, and insert operations.',
      },
    ],
  },
  modify: {
    key: 'modify',
    label: 'Modify m1',
    icon: Edit3,
    finalTree: MODIFY_TREE,
    title: 'Leaf Rewrite Without Weight Change',
    summary: '\\text{修改只会让目标叶子及其祖先哈希变为带 } * \\text{ 的新版本，weight 不变，这正是 Fig.2 右上角展示的效果。}',
    steps: [
      {
        title: '提交修改请求',
        description: '\\text{用户选择 } m_1 \\text{ 并发送动态更新请求，目标位置保持不变。}',
        formula: '\\langle Modify, UID, W, t, i \\rangle',
        highlightNodes: ['m1'],
        mutateTree: INITIAL_TREE,
        log: 'User submitted a modify request for m1.',
      },
      {
        title: '身份校验',
        description: '\\text{CSP 先验证数据所有者身份，防止未授权修改。}',
        formula: 'e(UID, g) = e(H_4(uid) \\cdot t, W)',
        highlightNodes: ['m1', 'n_a'],
        log: 'CSP verified owner identity before rewriting the target block.',
      },
      {
        title: '覆盖叶子内容',
        description: '\\text{将 } m_1 \\text{ 更新为 } m_1^*\\text{，新的块标签和叶子哈希出现星号。}',
        formula: 'h_1 \\to h_1^*',
        highlightNodes: ['m1'],
        mutateTree: MODIFY_TREE,
        log: 'Leaf m1 was rewritten and received a refreshed tag tg1*.',
      },
      {
        title: '沿路径重算哈希',
        description: '\\text{只重算受影响路径 } h_a \\to w_r\\text{，根节点仍然保持 4 个可访问叶子。}',
        formula: 'w_r: (4,0) \\text{ unchanged in weight}',
        highlightNodes: ['m1', 'n_a', 'root'],
        log: 'The affected path was rehashed upward while weights stayed constant.',
      },
    ],
  },
  delete: {
    key: 'delete',
    label: 'Delete m1',
    icon: Trash2,
    finalTree: DELETE_TREE,
    title: 'Leaf Removal With Topology Compression',
    summary: '\\text{删除操作除了移除叶子外，还会压缩左子树结构，使兄弟叶子上移，并让根节点的可访问叶子数减 1。}',
    steps: [
      {
        title: '提交删除请求',
        description: '\\text{用户发起删除 } m_1 \\text{ 的动态请求，CSP 锁定目标叶子及其兄弟关系。}',
        formula: '\\langle Delete, UID, W, t, i \\rangle',
        highlightNodes: ['m1'],
        mutateTree: INITIAL_TREE,
        log: 'User submitted a delete request for m1.',
      },
      {
        title: '验证所有权',
        description: '\\text{删除之前仍然需要做身份验证，确保只有当前 owner 可以发起结构更新。}',
        formula: '\\text{verify}(UID, W, t)',
        highlightNodes: ['m1', 'n_a'],
        log: 'CSP authenticated the owner for the delete operation.',
      },
      {
        title: '移除叶子并压缩子树',
        description: '\\text{将 } m_1 \\text{ 删除后，} m_2 \\text{ 直接上移为根的左孩子，左侧中间结点被折叠。}',
        formula: '\\text{delete leaf} \\to \\text{promote sibling}',
        highlightNodes: ['m2', 'root'],
        mutateTree: DELETE_TREE,
        log: 'Leaf m1 was deleted and m2 was promoted to compress the topology.',
      },
      {
        title: '更新根节点计数',
        description: '\\text{路径重算后根节点从 } (w_r, 4, 0) \\text{ 变为 } (w_r^*, 3, 0)\\text{。}',
        formula: 'lN: 4 \\to 3',
        highlightNodes: ['root'],
        log: 'The root count decreased from 4 to 3 and the new root was recorded.',
      },
    ],
  },
  insert: {
    key: 'insert',
    label: 'Insert m*',
    icon: Plus,
    finalTree: INSERT_TREE,
    title: 'Unique Block Insertion With New Internal Node',
    summary: '\\text{插入操作在论文正文里最完整：先身份校验、再去重、再计算 } y^*\\;/\\;Y^*\\;/\\;\\sigma^*\\text{，最后把新叶子插到 } i \\text{ 之后并新增内部结点 } h_c^*\\text{。}',
    steps: [
      {
        title: '准备新块',
        description: '\\text{用户在 } m_1 \\text{ 之后插入新块 } m^*\\text{，本地先生成新块标签 } tg^*\\text{。}',
        formula: 'tg^* = H_1(c^*)',
        highlightNodes: ['m1'],
        mutateTree: INITIAL_TREE,
        log: 'User prepared a new block m* after m1 and derived tg*.',
      },
      {
        title: '身份验证与去重',
        description: '\\text{CSP 先验证身份，再对 } tg^* \\text{ 执行重复性检查；只有唯一块才允许继续。}',
        formula: '\\text{dedup}(tg^*) \\to unique',
        highlightNodes: ['m1', 'n_a'],
        log: 'CSP authenticated the request and confirmed tg* is unique.',
      },
      {
        title: '生成公开值与认证器',
        description: '\\text{用户仅为唯一块计算 } y^*\\text{、}Y^*\\text{、}\\sigma^*\\text{，这一步对应论文插入流程正文。}',
        formula: 'Y^* = g^{y^*},\\quad \\sigma^* = (\\dots)^{y^*}',
        highlightNodes: ['m1'],
        log: 'The client generated y*, Y*, and σ* for the unique inserted block.',
      },
      {
        title: '插入新叶子并创建 h_c*',
        description: '\\text{CSP 在位置 1 之后插入新叶子，同时新增内部结点 } h_c^* \\text{ 来承接 } m_1 \\text{ 与 } m^*\\text{。}',
        formula: '\\text{Insert after } i \\to \\text{new leaf} + \\text{new parent}',
        highlightNodes: ['h_c', 'm1', 'm_new'],
        mutateTree: INSERT_TREE,
        log: 'CSP inserted the new leaf after m1 and created a new internal node h_c*.',
      },
      {
        title: '自底向上重算根',
        description: 'h_c^* \\to h_a^* \\to w_r^* \\text{ 依次更新，根节点 leaf count 从 4 增加到 5。}',
        formula: 'lN: 4 \\to 5',
        highlightNodes: ['h_c', 'n_a', 'root'],
        log: 'The updated path was rehashed upward and the root leaf count increased to 5.',
      },
    ],
  },
};

function countLevels(node) {
  if (!node.children?.length) return 1;
  return 1 + Math.max(...node.children.map(countLevels));
}

function findNode(root, targetId) {
  if (root.id === targetId) return root;
  if (!root.children) return null;
  for (const child of root.children) {
    const result = findNode(child, targetId);
    if (result) return result;
  }
  return null;
}

function flattenLeaves(node, acc = []) {
  if (node.isLeaf) acc.push(node);
  node.children?.forEach((child) => flattenLeaves(child, acc));
  return acc;
}

export default function HVTUpdate() {
  const { dispatch } = useStore();
  const [scenarioKey, setScenarioKey] = useState('initial');
  const [displayTree, setDisplayTree] = useState(clone(INITIAL_TREE));
  const [currentStep, setCurrentStep] = useState(-1);
  const [highlightedNodes, setHighlightedNodes] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const scenario = SCENARIOS[scenarioKey];
  const accent = accentMap[scenarioKey];
  const treeDepth = useMemo(() => countLevels(displayTree), [displayTree]);
  const leafList = useMemo(() => flattenLeaves(displayTree), [displayTree]);
  const rootNode = findNode(displayTree, 'root');

  const addLog = (message) => dispatch({ type: 'ADD_LOG', payload: message });

  const selectScenario = (key) => {
    setScenarioKey(key);
    setDisplayTree(clone(INITIAL_TREE));
    setCurrentStep(-1);
    setHighlightedNodes([]);
  };

  const runScenario = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    dispatch({ type: 'UPDATE_FILE_STATUS', payload: 'UPDATING' });
    setDisplayTree(clone(INITIAL_TREE));
    setCurrentStep(-1);
    setHighlightedNodes([]);
    addLog(`Loaded HVT scenario: ${scenario.label}.`);

    for (let index = 0; index < scenario.steps.length; index += 1) {
      const step = scenario.steps[index];
      setCurrentStep(index);
      if (step.mutateTree) {
        setDisplayTree(clone(step.mutateTree));
      }
      setHighlightedNodes(step.highlightNodes);
      addLog(step.log);
      await new Promise((resolve) => setTimeout(resolve, 900));
    }

    dispatch({
      type: 'SET_FILE_METADATA',
      payload: {
        rootHash: scenario.finalTree.hash,
      },
    });
    dispatch({ type: 'UPDATE_FILE_STATUS', payload: 'STORED' });
    addLog(`Global root hash synchronized to ${scenario.finalTree.hash}.`);
    setIsProcessing(false);
  };

  const resetScenario = () => {
    setDisplayTree(clone(INITIAL_TREE));
    setCurrentStep(-1);
    setHighlightedNodes([]);
    setIsProcessing(false);
    dispatch({
      type: 'SET_FILE_METADATA',
      payload: {
        rootHash: INITIAL_TREE.hash,
      },
    });
    dispatch({ type: 'UPDATE_FILE_STATUS', payload: 'STORED' });
    addLog('HVT scene reset to the initial topology.');
  };

  const renderNode = (node, depth = 0) => {
    const isHighlighted = highlightedNodes.includes(node.id);
    const isMutated = node.hash.includes('*');
    const childGap = node.children?.length > 2 ? 'gap-8' : depth === 0 ? 'gap-12' : 'gap-8';

    return (
      <div className="flex flex-col items-center relative" key={node.id}>
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          className={`min-w-[126px] rounded-2xl border px-4 py-3 text-center backdrop-blur-md transition-all duration-500 ${
            isHighlighted
              ? `bg-slate-900/95 ${accent.strong}`
              : isMutated
                ? `bg-slate-900/90 ${accent.border} ${accent.glow}`
                : 'border-white/10 bg-slate-950/80 text-slate-300'
          }`}
        >
          <div className="mb-1 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
            {node.isLeaf ? node.block : 'internal'}
          </div>
          <Formula latex={`(${node.hash}, ${node.weight}, ${node.index})`} displayMode={false} className={`text-[13px] tracking-wide ${isMutated ? 'text-white font-bold' : 'text-slate-200'}`} />
        </motion.div>

        {node.isLeaf && (
          <motion.div layout className="mt-2 flex flex-col items-center">
            <div className="h-4 border-l border-dashed border-slate-600" />
            <Formula latex={`${node.hash} = ${node.tag}`} displayMode={false} className={`text-[10px] ${isMutated ? accent.soft : 'text-slate-400'}`} />
          </motion.div>
        )}

        {node.children?.length > 0 && (
          <motion.div layout className={`relative mt-16 flex ${childGap}`}>
            <svg className="pointer-events-none absolute left-0 top-[-58px] h-[58px] w-full overflow-visible">
              {node.children.map((child, childIndex) => {
                const step = 100 / (node.children.length + 1);
                const x1 = '50%';
                const x2 = `${(childIndex + 1) * step}%`;
                const activeLine = highlightedNodes.includes(child.id) || highlightedNodes.includes(node.id);

                return (
                  <motion.line
                    key={`${node.id}-${child.id}`}
                    layout
                    x1={x1}
                    y1="0"
                    x2={x2}
                    y2="100%"
                    stroke={activeLine ? accent.line : '#334155'}
                    strokeWidth="1.8"
                    strokeDasharray={activeLine ? '0' : '4 4'}
                  />
                );
              })}
            </svg>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-emerald-400" />
            <h2 className="text-2xl font-black uppercase tracking-tight text-white">HVT Dynamic Update</h2>
          </div>
          <p className="max-w-3xl text-sm font-medium tracking-tight text-slate-400">
            依据论文 Fig.2 与第 8 页更新流程重构：把 HVT 的 Modify / Delete / Insert 都拆成可执行的前端步骤，
            展示身份校验、唯一块检查、认证器生成和自底向上的根重算。
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/30 p-1.5 backdrop-blur-xl">
          <button
            onClick={runScenario}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:bg-indigo-500 disabled:opacity-40"
          >
            <ArrowUpCircle size={14} />
            {isProcessing ? 'Running...' : 'Run Scenario'}
          </button>
          <button
            onClick={resetScenario}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-300 transition-all hover:border-white/20 hover:bg-slate-800"
          >
            <RefreshCcw size={14} />
            Reset
          </button>
        </div>
      </div>

      <div className="grid flex-1 min-h-0 grid-cols-[360px_minmax(0,1fr)] gap-6">
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
          <div className="glass-panel rounded-3xl p-5">
            <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
              <Layers size={12} />
              Scenario Switch
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(SCENARIOS).map((item) => {
                const Icon = item.icon;
                const active = item.key === scenarioKey;
                const itemAccent = accentMap[item.key];

                return (
                  <button
                    key={item.key}
                    onClick={() => selectScenario(item.key)}
                    className={`rounded-2xl border px-4 py-4 text-left transition-all overflow-x-auto ${
                      active
                        ? `${itemAccent.strong} bg-slate-900/95`
                        : 'border-white/10 bg-slate-950/60 text-slate-400 hover:border-white/20 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Icon size={14} />
                      <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                    </div>
                    <div className="text-[11px] leading-relaxed text-slate-400">{item.title}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-5">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
              <Hash size={12} />
              Paper Logic
            </div>
            <h3 className="mb-2 text-lg font-black text-white">{scenario.title}</h3>
            <Formula latex={scenario.summary} displayMode={false} className="text-sm leading-6 text-slate-400" />

            <div className={`mt-4 rounded-2xl border px-4 py-3 ${accent.border} bg-slate-950/80`}>
              <div className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Current Root</div>
              <div className="font-mono text-sm text-white">
                ({rootNode.hash}, {rootNode.weight}, {rootNode.index})
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Tree depth: {treeDepth} levels · Accessible leaves: {leafList.length}
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-5">
            <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
              <ShieldCheck size={12} />
              Guided Steps
            </div>
            <div className="space-y-3">
              {scenario.steps.map((step, index) => {
                const active = currentStep === index;
                const done = currentStep > index;

                return (
                  <div
                    key={step.title}
                    className={`rounded-2xl border p-4 transition-all overflow-x-auto ${
                      active
                        ? `${accent.strong} bg-slate-900/95`
                        : done
                          ? `${accent.border} bg-slate-900/70`
                          : 'border-white/10 bg-slate-950/70'
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-3">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-black ${active || done ? accent.soft : 'bg-slate-800 text-slate-500'}`}>
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div className="text-sm font-black text-white">{step.title}</div>
                    </div>
                    <Formula latex={step.description} displayMode={false} className="mb-2 text-xs leading-6 text-slate-400" />
                    <Formula latex={step.formula} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
          <div className="glass-panel rounded-3xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Figure Alignment</div>
                <Formula latex="\text{结点三元组为 } (hash, lN, p)\text{，插入场景额外显示新内部结点 } h_c^*\text{。}" displayMode={false} className="text-sm text-slate-300" />
              </div>
              <div className="flex flex-wrap gap-2">
                {leafList.map((leaf) => (
                  <div
                    key={leaf.id}
                    className={`rounded-full border px-3 py-1 text-[10px] font-mono ${
                      highlightedNodes.includes(leaf.id) ? `${accent.border} ${accent.soft}` : 'border-white/10 text-slate-500'
                    }`}
                  >
                    {leaf.block}:{leaf.tag}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative flex-1 overflow-auto rounded-[28px] border border-white/5 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.85),_rgba(2,6,23,0.98))] p-8">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:30px_30px]" />
            <div className="relative z-10 flex min-h-full min-w-fit items-start justify-center px-12 py-8">
              {renderNode(displayTree)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
