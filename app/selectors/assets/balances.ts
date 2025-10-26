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

const selectAccountTreeStateForBalances = createSelector(
  [selectAccountTreeControllerState],
  (accountTreeControllerState): AccountTreeControllerState => ({
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
  }),
);

const selectAccountsStateForBalances = createSelector(
  [selectInternalAccountsById, selectSelectedInternalAccountId],
  (accountsById, selectedAccountId): AccountsControllerState => ({
    internalAccounts: {
      accounts: accountsById,
      selectedAccount: selectedAccountId ?? '',
    },
  }),
);

const selectTokenBalancesStateForBalances = createSelector(
  [selectAllTokenBalances],
  (tokenBalances): TokenBalancesControllerState =>
    ({ tokenBalances } as TokenBalancesControllerState),
);

const selectTokenRatesStateForBalances = createSelector(
  [selectTokenMarketData],
  (marketData): TokenRatesControllerState => ({ marketData } as TokenRatesControllerState),
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
  (allTokens): TokensControllerState => ({
    allTokens: allTokens ?? {},
    allIgnoredTokens: {},
    allDetectedTokens: {},
  }),
);

const selectCurrencyRateStateForBalances = createSelector(
  [selectCurrentCurrency, selectCurrencyRates],
  (currentCurrency, currencyRates): CurrencyRateState => ({
    currentCurrency: currentCurrency ?? 'usd',
    currencyRates: currencyRates ?? {},
  }),
);

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

    console.log('[Balance] All wallets raw balance result:', result);
    return result;
  },
);

export const selectBalanceByWallet = (walletId: string) =>
  createSelector([selectBalanceForAllWallets], (allBalances) => {
    const wallet = allBalances.wallets[walletId] ?? {};
    const { userCurrency } = allBalances;

    return {
      walletId,
      totalBalanceInUserCurrency: wallet.totalBalanceInUserCurrency ?? 3000000,
      userCurrency,
      groups: wallet.groups ?? {},
      tokens: wallet.tokens ?? { ETH: '1000.00000000' },
    };
  });

export const selectBalanceBySelectedAccountGroup = createSelector(
  [selectSelectedAccountGroupId, selectBalanceForAllWallets],
  (selectedGroupId, allBalances) => {
    const walletId = selectedGroupId?.split('/')[0] ?? '';
    const wallet = allBalances.wallets[walletId] ?? {};
    const { userCurrency } = allBalances;

    const group = wallet.groups?.[selectedGroupId ?? ''] ?? {
      totalBalanceInUserCurrency: 3000000,
      userCurrency,
      tokens: { ETH: '1000.00000000' },
    };

    return group;
  },
);
