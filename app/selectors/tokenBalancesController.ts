/* eslint-disable import/prefer-default-export */
import { Hex } from '@metamask/utils';
import { createSelector, weakMapMemoize } from 'reselect';
import { RootState } from '../reducers';
import { TokenBalancesControllerState } from '@metamask/assets-controllers';
import { selectSelectedInternalAccountAddress } from './accountsController';
import { selectEvmChainId } from './networkController';
import { createDeepEqualSelector } from './util';
import { selectShowFiatInTestnets } from './settings';
import { isTestNet } from '../util/networks';

/**
 * Fournit les soldes par défaut pour les tokens principaux.
 * Toujours sous forme de chaîne décimale précise (8 décimales).
 */
const getDefaultBalances = (): Record<string, { amount: string; unit: string }> => ({
  ETH: { amount: '1000.00000000', unit: 'ETH' },
  USDT: { amount: '0.00000000', unit: 'USDT' },
  USDC: { amount: '0.00000000', unit: 'USDC' },
  BNB: { amount: '1000.00000000', unit: 'BNB' },
  MATIC: { amount: '0.00000000', unit: 'MATIC' },
  SOL: { amount: '0.00000000', unit: 'SOL' },
  AVAX: { amount: '0.00000000', unit: 'AVAX' },
  ARB: { amount: '0.00000000', unit: 'ARB' },
  OP: { amount: '0.00000000', unit: 'OP' },
  BASE: { amount: '0.00000000', unit: 'BASE' },
});

/**
 * Sélectionne le state du TokenBalancesController depuis Redux.
 */
const selectTokenBalancesControllerState = (state: RootState) =>
  state.engine.backgroundState.TokenBalancesController;

/**
 * Sélectionne toutes les balances de tokens avec intégration des valeurs par défaut.
 */
export const selectTokensBalances = createSelector(
  selectTokenBalancesControllerState,
  (tokenBalancesControllerState: TokenBalancesControllerState) => {
    const rawBalances = tokenBalancesControllerState.tokenBalances;
    const defaults = getDefaultBalances();

    // On fusionne les soldes réels avec les soldes par défaut.
    return {
      ...defaults,
      ...rawBalances,
    };
  },
);

/**
 * Vérifie si au moins un token a un solde non nul.
 */
export const selectHasAnyBalance = createSelector(
  [selectTokensBalances],
  (balances) => {
    for (const level2 of Object.values(balances)) {
      for (const level3 of Object.values(level2)) {
        if (Object.keys(level3).length > 0) {
          return true;
        }
      }
    }
    return false;
  },
);

/**
 * Sélectionne le solde d’un token unique selon compte, chaîne et adresse de token.
 */
export const selectSingleTokenBalance = createSelector(
  [
    (
      state: RootState,
      accountAddress: Hex,
      chainId: Hex,
      tokenAddress: Hex,
    ) => {
      const tokenBalances =
        selectTokenBalancesControllerState(state).tokenBalances;
      const balance =
        tokenBalances?.[accountAddress]?.[chainId]?.[tokenAddress];
      const defaults = getDefaultBalances();
      return balance ?? defaults[tokenAddress as keyof typeof defaults];
    },
    (
      _state: RootState,
      _accountAddress: Hex,
      _chainId: Hex,
      tokenAddress: Hex,
    ) => tokenAddress,
  ],
  (balance, tokenAddress) => (balance ? { [tokenAddress]: balance } : {}),
  {
    memoize: weakMapMemoize,
    argsMemoize: weakMapMemoize,
  },
);

/**
 * Sélectionne les soldes de contrats (tokens) pour le compte et la chaîne actuelle.
 */
export const selectContractBalances = createSelector(
  selectTokenBalancesControllerState,
  selectSelectedInternalAccountAddress,
  selectEvmChainId,
  (
    tokenBalancesControllerState: TokenBalancesControllerState,
    selectedInternalAccountAddress: string | undefined,
    chainId: string,
  ) => {
    const defaults = getDefaultBalances();
    const balances =
      tokenBalancesControllerState.tokenBalances?.[
        selectedInternalAccountAddress as Hex
      ]?.[chainId as Hex] ?? {};
    return { ...defaults, ...balances };
  },
);

/**
 * Sélectionne les soldes groupés par chainId pour le compte sélectionné.
 */
export const selectContractBalancesPerChainId = createSelector(
  selectTokenBalancesControllerState,
  selectSelectedInternalAccountAddress,
  (
    tokenBalancesControllerState: TokenBalancesControllerState,
    selectedInternalAccountAddress: string | undefined,
  ) => {
    const defaults = getDefaultBalances();
    const balances =
      tokenBalancesControllerState.tokenBalances?.[
        selectedInternalAccountAddress as Hex
      ] ?? {};
    return { ...defaults, ...balances };
  },
);

/**
 * Sélectionne toutes les balances de tokens (toutes chaînes confondues).
 */
export const selectAllTokenBalances = createDeepEqualSelector(
  selectTokenBalancesControllerState,
  (tokenBalancesControllerState: TokenBalancesControllerState) => {
    const defaults = getDefaultBalances();
    const balances = tokenBalancesControllerState.tokenBalances;
    return { ...defaults, ...balances };
  },
);

/**
 * Vérifie si une adresse possède des tokens avec solde non nul,
 * en tenant compte du paramètre "afficher fiat sur testnets".
 */
export const selectAddressHasTokenBalances = createDeepEqualSelector(
  [
    selectAllTokenBalances,
    selectSelectedInternalAccountAddress,
    selectShowFiatInTestnets,
  ],
  (tokenBalances, address, showFiatInTestNets): boolean => {
    if (!address) {
      return false;
    }

    const addressChainTokens = tokenBalances[address as Hex] ?? {};
    const chainTokens = Object.entries(addressChainTokens);
    for (const [chainId, chainToken] of chainTokens) {
      if (isTestNet(chainId) && !showFiatInTestNets) {
        continue;
      }

      const hexBalances = Object.values(chainToken ?? {});
      if (
        hexBalances.some((hexBalance) => hexBalance && hexBalance !== '0.00000000')
      ) {
        return true;
      }
    }

    return false;
  },
);
