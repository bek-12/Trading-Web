import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { calcAccountMeta } from './store';
import { useAccounts } from './hooks/useAccounts';
import { useTrades } from './hooks/useTrades';
import { useCheckins } from './hooks/useCheckins';
import { useJournal } from './hooks/useJournal';

const AccountContext = createContext(null);

export function AccountProvider({ children, user }) {
  // Active account ID persisted in localStorage (just a preference, not data)
  const [activeAccountId, setActiveAccountIdState] = useState(
    () => localStorage.getItem('tradeos_active_account') || null
  );

  const { accounts, loading: accountsLoading, fetchAccounts,
          addAccount, updateAccount, deleteAccount } = useAccounts(user);

  // Derive active account from the list
  const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0] || null;
  const meta = calcAccountMeta(activeAccount);

  // Trades and checkins scoped to active account
  const { trades, loading: tradesLoading, fetchTrades, addTrade, updateTrade, completePunishment } =
    useTrades(user, activeAccount?.id);

  const { checkins, loading: checkinsLoading, fetchCheckins, addCheckin } =
    useCheckins(user, activeAccount?.id);

  const { entries: journalEntries, fetchEntries: fetchJournal, saveEntry: saveJournalEntry } =
    useJournal(user, activeAccount?.id);

  function switchAccount(id) {
    setActiveAccountIdState(id);
    localStorage.setItem('tradeos_active_account', id);
  }

  // Refresh everything for the active account
  const refresh = useCallback(() => {
    fetchTrades();
    fetchCheckins();
    fetchJournal();
  }, [fetchTrades, fetchCheckins, fetchJournal]);

  // When active account changes, re-fetch scoped data
  useEffect(() => {
    if (activeAccount?.id) {
      fetchTrades();
      fetchCheckins();
      fetchJournal();
    }
  }, [activeAccount?.id]);

  return (
    <AccountContext.Provider value={{
      // Account management
      accounts, activeAccount, meta,
      switchAccount, fetchAccounts,
      addAccount, updateAccount, deleteAccount,

      // Trades
      trades, tradesLoading, fetchTrades, addTrade, updateTrade, completePunishment,

      // Checkins
      checkins, checkinsLoading, fetchCheckins, addCheckin,

      // Journal
      journalEntries, fetchJournal, saveJournalEntry,

      // General
      refresh,
      loading: accountsLoading,
    }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used inside AccountProvider');
  return ctx;
}
