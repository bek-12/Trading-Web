import { createContext, useContext, useState, useCallback } from 'react';
import {
  getAccounts, getActiveAccount, getActiveAccountId,
  setActiveAccountId, calcAccountMeta,
} from './store';

const AccountContext = createContext(null);

export function AccountProvider({ children }) {
  // Re-render trigger — increment to force consumers to re-read from localStorage
  const [rev, setRev] = useState(0);
  const refresh = useCallback(() => setRev(r => r + 1), []);

  const accounts = getAccounts();
  const activeAccount = getActiveAccount();
  const meta = calcAccountMeta(activeAccount);

  function switchAccount(id) {
    setActiveAccountId(id);
    refresh();
  }

  return (
    <AccountContext.Provider value={{ accounts, activeAccount, meta, switchAccount, refresh, rev }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used inside AccountProvider');
  return ctx;
}
