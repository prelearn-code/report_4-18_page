import React, { createContext, useContext, useReducer } from 'react';

const StoreContext = createContext();

const initialState = {
  activeTab: 'dedup',
  logs: ["D-Storage Sandbox Initialized.", "System ready."],
  currentFile: {
    id: 'F_0x1A2B',
    name: 'Research_Paper.pdf',
    owner: 'UID_ALICE',
    uid: 'uid_alice',
    mu: 'μ_a9',
    uidProof: '0xbc51...8a1',
    witness: 'g^μ',
    fileTag: '0x8f2a...91e',
    rootHash: 'w_r',
    status: 'LOCAL_PREPROCESSING',
    transferStatus: 'IDLE',
    authVerified: false,
    blocks: [
      { id: 'b1', type: 'public', status: 'pending', hash: 'h1' },
      { id: 'b2', type: 'private', status: 'pending', hash: 'h2' },
      { id: 'b3', type: 'private', status: 'pending', hash: 'h3' },
      { id: 'b4', type: 'public', status: 'pending', hash: 'h4' },
    ]
  },
  cspStorage: {
    blocks: [],
    hvt: null
  },
  protocol: {
    availableStages: [
      'LOCAL_PREPROCESSING',
      'AUTH_CHECKING',
      'DEDUP_PROBING',
      'DEDUP_DONE',
      'STORED',
      'AUDIT_REQUESTED',
      'CHALLENGE_PUBLISHED',
      'PROOF_SUBMITTED',
      'AUDIT_VERIFIED',
      'RETRIEVING',
      'DECRYPTING',
      'UPDATING',
      'TRANSFER_PENDING',
      'TRANSFER_OWNER_UPDATED',
      'TRANSFER_KEY_VERIFYING',
      'TRANSFER_SUCCESS',
      'TRANSFER_FAILED'
    ],
  },
  contract: {
    fee1: 0.1,    // Storage fee
    fee2: 0.05,   // Audit fee
    fee3: 0.2,    // Transfer fee
    Fee1: 10.0,   // CSP Security Deposit
    Fee3: 0.4,    // Seller Security Deposit
    cspVaultBalance: 10.0,
    escrowBalance: 0,
    auditChallenge: null,
    auditResult: null,
    isSlashing: false
  }
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, activeTab: action.payload };
    case 'ADD_LOG':
      return { 
        ...state, 
        logs: [...state.logs, `[${new Date().toISOString().substring(11, 19)}] ${action.payload}`] 
      };
    case 'UPDATE_FILE_STATUS':
      return {
        ...state,
        currentFile: { ...state.currentFile, status: action.payload }
      };
    case 'TOGGLE_BLOCK_TYPE':
      return {
        ...state,
        currentFile: {
          ...state.currentFile,
          blocks: state.currentFile.blocks.map(b => 
            b.id === action.payload ? { ...b, type: b.type === 'public' ? 'private' : 'public' } : b
          )
        }
      };
    case 'SET_BLOCK_STATUS':
        return {
          ...state,
          currentFile: {
            ...state.currentFile,
            blocks: state.currentFile.blocks.map(b => 
              b.id === action.id ? { ...b, status: action.status } : b
            )
          }
        };
    case 'SET_AUDIT_CHALLENGE':
      return {
        ...state,
        contract: { ...state.contract, auditChallenge: action.payload }
      };
    case 'SET_AUDIT_RESULT':
      return {
        ...state,
        contract: { ...state.contract, auditResult: action.payload }
      };
    case 'SET_SLASHING':
      return {
        ...state,
        contract: { ...state.contract, isSlashing: action.payload }
      };
    case 'SET_TRANSFER_STATUS':
      return {
        ...state,
        currentFile: { ...state.currentFile, transferStatus: action.payload }
      };
    case 'SET_FILE_OWNER':
      return {
        ...state,
        currentFile: { ...state.currentFile, owner: action.payload }
      };
    case 'SET_FILE_METADATA':
      return {
        ...state,
        currentFile: { ...state.currentFile, ...action.payload }
      };
    case 'UPDATE_CONTRACT_BALANCES':
      return {
        ...state,
        contract: { ...state.contract, ...action.payload }
      };
    case 'SET_DEDUP_AUTH':
      return {
        ...state,
        currentFile: { ...state.currentFile, authVerified: action.payload }
      };
    default:
      return state;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
