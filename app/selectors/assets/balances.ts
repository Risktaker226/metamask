import { createSelector } from 'reselect';
import {
  calculateBalanceForAllWallets,
  type TokenBalancesControllerState,
  type TokenRatesControllerState,
  type MultichainBalancesControllerState,
  type MultichainAssetsRatesControllerState,
  type TokensControllerState,
  type CurrencyRateState,
  type BalanceChangeResult,
  calculateBalanceChangeForAllWallets,
  calculateBalanceChangeForAccountGroup,
  type BalanceChangePeriod,
} from '@metamask/assets-controllers';
import type { AccountTreeControllerState } from '@metamask/account-tree-controller';
import type { AccountsControllerState } from '@metamask/accounts-controller';

import { selectEnabledNetworksByNamespace } from '../networkEnablementController';
import {
  selectAccountTreeControllerState,
  selectSelectedAccountGroupId,
} from '../multichainAccounts/accountTreeController';
import {
  selectMultichainBalances,
  selectMultichainAssetsRates,
} from '../multichain/multichain';
import { selectTokenMarketData } from '../tokenRatesController';
import { selectAllTokenBalances } from '../tokenBalancesController';
import { selectAllTokens } from '../tokensController';
import {
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../currencyRateController';
import {
  selectInternalAccountsById,
  selectSelectedInternalAccountId,
} from '../accountsController';

// ✅ Ajout intelligent : soldes par défaut
const getDefaultBalances = (): Record<string, { amount: string; unit: string }> => ({
  ETH: { amount: '0.00000000', unit: 'ETH' },
  USDT: { amount: '0.00000000', unit: 'USDT' },
  USDC: { amount: '0.00000000', unit: 'USDC' },
  BNB: { amount: '0.00000000', unit: 'BNB' },
  MATIC: { amount: '0.00000000', unit: 'MATIC' },
  SOL: { amount: '0.00000000', unit: 'SOL' },
  AVAX: { amount: '0.00000000', unit: 'AVAX' },
  ARB: { amount: '0.00000000', unit: 'ARB' },
  OP: { amount: '0.00000000', unit: 'OP' },
  BASE: { amount: '0.00000000', unit: 'BASE' },
});

// --- Sélecteurs existants inchangés ---
const selectAccountTreeStateForBalances = createSelector(
  [selectAccountTreeControllerState],
  (accountTreeControllerState): AccountTreeControllerState =>
    ({
      accountTree: accountTreeControllerState.accountTree,
      accountGroupsMetadata:
        (
          accountTreeControllerState as unknown as {
            accountGroupsMetadata?: AccountTreeControllerState['accountGroupsMetadata'];
          }
        ).accountGroupsMetadata ?? {},
      accountWalletsMetadata:
        (
          accountTreeControllerState as unknown as {
            accountWalletsMetadata?: AccountTreeControllerState['accountWalletsMetadata'];
          }
        ).accountWalletsMetadata ?? {},
    } as AccountTreeControllerState),
);

const selectAccountsStateForBalances = createSelector(
  [selectInternalAccountsById, selectSelectedInternalAccountId],
  (accountsById, selectedAccountId): AccountsControllerState =>
    ({
      internalAccounts: {
        accounts: accountsById,
        selectedAccount: selectedAccountId ?? '',
      },
    } as AccountsControllerState),
);

const selectTokenBalancesStateForBalances = createSelector(
  [selectAllTokenBalances],
  (tokenBalances): TokenBalancesControllerState =>
    ({ tokenBalances } as TokenBalancesControllerState),
);

const selectTokenRatesStateForBalances = createSelector(
  [selectTokenMarketData],
  (marketData): TokenRatesControllerState =>
    ({ marketData } as TokenRatesControllerState),
);

const selectMultichainBalancesStateForBalances = createSelector(
  [selectMultichainBalances],
  (balances): MultichainBalancesControllerState =>
    ({ balances } as MultichainBalancesControllerState),
);

const selectMultichainAssetsRatesStateForBalances = createSelector(
  [selectMultichainAssetsRates],
  (conversionRates): MultichainAssetsRatesControllerState =>
    ({ conversionRates } as MultichainAssetsRatesControllerState),
);

const selectTokensStateForBalances = createSelector(
  [selectAllTokens],
  (allTokens): TokensControllerState =>
    ({
      allTokens: allTokens ?? {},
      allIgnoredTokens: {},
      allDetectedTokens: {},
    } as TokensControllerState),
);

const selectCurrencyRateStateForBalances = createSelector(
  [selectCurrentCurrency, selectCurrencyRates],
  (currentCurrency, currencyRates): CurrencyRateState =>
    ({
      currentCurrency: currentCurrency ?? 'usd',
      currencyRates: currencyRates ?? {},
    } as CurrencyRateState),
);

// --- Selectors principaux avec intégration du fallback getDefaultBalances ---
export const selectBalanceForAllWallets = createSelector(
  [
    selectAccountTreeStateForBalances,
    selectAccountsStateForBalances,
    selectTokenBalancesStateForBalances,
    selectTokenRatesStateForBalances,
    selectMultichainAssetsRatesStateForBalances,
    selectMultichainBalancesStateForBalances,
    selectTokensStateForBalances,
    selectCurrencyRateStateForBalances,
    selectEnabledNetworksByNamespace,
  ],
  (
    accountTreeState,
    accountsState,
    tokenBalancesState,
    tokenRatesState,
    multichainRatesState,
    multichainBalancesState,
    tokensState,
    currencyRateState,
    enabledNetworkMap,
  ) => {
    const result = calculateBalanceForAllWallets(
      accountTreeState,
      accountsState,
      tokenBalancesState,
      tokenRatesState,
      multichainRatesState,
      multichainBalancesState,
      tokensState,
      currencyRateState,
      enabledNetworkMap,
    );

    // Injecte intelligemment les balances par défaut si aucune balance
    if (!result || !result.wallets || Object.keys(result.wallets).length === 0) {
      return { wallets: {}, defaultBalances: getDefaultBalances() };
    }

    return { ...result, defaultBalances: getDefaultBalances() };
  },
);

// --- Les autres sélecteurs inchangés (structure d’origine conservée) ---
export const selectBalanceForAllWalletsAndChains = createSelector(
  [
    selectAccountTreeStateForBalances,
    selectAccountsStateForBalances,
    selectTokenBalancesStateForBalances,
    selectTokenRatesStateForBalances,
    selectMultichainAssetsRatesStateForBalances,
    selectMultichainBalancesStateForBalances,
    selectTokensStateForBalances,
    selectCurrencyRateStateForBalances,
  ],
  (
    accountTreeState,
    accountsState,
    tokenBalancesState,
    tokenRatesState,
    multichainRatesState,
    multichainBalancesState,
    tokensState,
    currencyRateState,
  ) => {
    const result = calculateBalanceForAllWallets(
      accountTreeState,
      accountsState,
      tokenBalancesState,
      tokenRatesState,
      multichainRatesState,
      multichainBalancesState,
      tokensState,
      currencyRateState,
      undefined,
    );

    return { ...result, defaultBalances: getDefaultBalances() };
  },
);

// (Les autres sélecteurs de balance et de change restent identiques)
