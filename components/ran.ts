import {
  web3Accounts,
  web3Enable,
  web3FromAddress,
} from "@polkadot/extension-dapp";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { createState, useState } from "@hookstate/core";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import type { AccountInfo } from "@polkadot/types/interfaces/system";
import type { AnyJson } from "@polkadot/types/types";
import cloneDeep from "lodash/cloneDeep";
import polkadotTypes from "./polkadot-types.json";

import { combineNftTokenArgs, getClassIdArgsForTokens } from "../Utils/util";
import { TokenIdQueryTuple } from "../../Types/types";

export async function polkadotInit(useStore: IUseStore): Promise<void> {
  if (useStore.state.isPolkadotInitialized) {
    return;
  }

  await web3Enable("Anmol");

  try {
    const accounts = await web3Accounts();

    if (accounts.length > 0) {
      useStore.setIsPolkadotInitialized(true);
      useStore.setAvailableAccounts(accounts);
      await useStore.updateAccountsInfo();
    }
  } catch (err) {
    console.error("Could not initialize acccounts. Please see error", err);
  }
}

// Polkadot store
const initialState: InitialState = {
  isPolkadotInitialized: false,
  selectedAccount: undefined,
  availableAccounts: [],
  showAccountSwitcher: false,
  lastTransaction: "",
  nftTokens: [],
};

const store = createState(initialState);

export async function getApi(): Promise<ApiPromise> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise<ApiPromise>(async (resolve, reject) => {
    if (polkadotApi) {
      return resolve(polkadotApi);
    }
    try {
      const provider = new WsProvider(process.env.REACT_APP_RPC_WS);
      const api = await ApiPromise.create({ provider, types: polkadotTypes });
      resolve(api);
    } catch (err) {
      reject(err);
    }
  });
}

async function getAccountsInfo(
  accounts: InjectedAccountWithMeta[]
): Promise<AccountInfo[]> {
  const api = await getApi();
  const accountInfoPromises = accounts.map((x) => {
    return api.query.system.account(x.address);
  });

  return Promise.all(accountInfoPromises);
}

export function useStore(): IUseStore {
  const withState = useState(store);

  return {
    get state() {
      return withState.get();
    },

    setIsPolkadotInitialized(value) {
      store.isPolkadotInitialized.set(value);
    },

    setSelectedAccount(address: string) {
      const account = this.state.availableAccounts.find(
        (x) => x.address === address
      );
      store.selectedAccount.set(JSON.parse(JSON.stringify(account)));
    },

    setAvailableAccounts(accounts: InjectedAccountWithMetaAndAccountInfo[]) {
      store.availableAccounts.set(accounts);
    },

    async updateAccountsInfo() {
      const accountsInfo = await getAccountsInfo(this.state.availableAccounts);
      this.setAccountsInfo(accountsInfo);

      if (this.state.selectedAccount) {
        this.setSelectedAccount(this.state.selectedAccount.address);
      }
    },

    setAccountsInfo(accountsInfo: AccountInfo[]) {
      const accountsWithInfo = this.state.availableAccounts.map((x, i) => {
        const account = cloneDeep(x);
        account.free_balance = accountsInfo[i].data.free.toHuman();
        return account;
      });

      this.setAvailableAccounts(accountsWithInfo);
    },

    setShowAccountSwitcher(value: boolean) {
      store.showAccountSwitcher.set(value);
    },

    setLastTransaction(transaction: string) {
      store.lastTransaction.set(transaction);
    },

    async extrinsicMintIpfsNft(ipfsCid: string): Promise<boolean> {
      // eslint-disable-next-line no-async-promise-executor
      return new Promise(async (resolve, reject) => {
        if (!this.state.selectedAccount) {
          return reject(new Error("No account selected"));
        }

        try {
          const api = await getApi();
          const injector = await web3FromAddress(
            this.state.selectedAccount.address
          );

          await api.tx.nftModule
            .mintIpfsNft(ipfsCid)
            .signAndSend(
              this.state.selectedAccount.address,
              { signer: injector.signer },
              async (result) => {
                if (result.status.type === "InBlock") {
                  const { InBlock: transaction } =
                    result.status.toHuman() as ExtrinsicStatus;
                  resolve(true);
                  this.setLastTransaction(transaction);
                  // This will update accounts balances
                  await this.updateAccountsInfo();
                }
              }
            );
        } catch (e) {
          reject(e);
        }
      });
    },

    async extrinsicFractionalTransfer(
      to: string,
      token: string,
      percentage: number
    ): Promise<AnyJson> {
      // eslint-disable-next-line no-async-promise-executor
      return new Promise(async (resolve, reject) => {
        if (!this.state.selectedAccount) {
          return reject(new Error("No account selected"));
        }

        try {
          const api = await getApi();
          const injector = await web3FromAddress(
            this.state.selectedAccount.address
          );
          await api.tx.nftModule
            .transfer(
              this.state.selectedAccount.address,
              to,
              // Pass with tuple of first class id of 0 and given token
              [0, token],
              percentage
            )
            .signAndSend(
              this.state.selectedAccount.address,
              { signer: injector.signer },
              async (result) => {
                if (result.status.type === "InBlock") {
                  const { InBlock: transaction } =
                    result.status.toHuman() as ExtrinsicStatus;
                  resolve(result.toHuman());
                  this.setLastTransaction(transaction);
                  // This will update accounts balances
                  await this.updateAccountsInfo();
                }
              }
            );
        } catch (e) {
          reject(e);
        }
      });
    },

    /**
     * Get token information by user by querying all tokens via the `Tokens` Storage map.
     * @returns Promise<{ data: {}, metadata: string, owners: string[] }[]>
     */
    async queryByTokens(tokenIds: number[]): Promise<AnyJson[]> {
      // eslint-disable-next-line no-async-promise-executor
      return new Promise(async (resolve, reject) => {
        if (!this.state.selectedAccount) {
          return reject(new Error("No account selected"));
        }

        try {
          const api = await getApi();
          const defaultClassArgs = getClassIdArgsForTokens(tokenIds);
          const queryArgsByClassAndTokenIds = combineNftTokenArgs(
            tokenIds,
            defaultClassArgs
          );

          const result = await api.query.baseNft.tokens.multi(
            queryArgsByClassAndTokenIds
          );

          const decodedValues = result.map((item) => item.toHuman());
          resolve(decodedValues);
        } catch (e) {
          reject(e);
        }
      });
    },

    async queryTokensByOwner(): Promise<AnyJson[]> {
      // eslint-disable-next-line no-async-promise-executor
      return new Promise(async (resolve, reject) => {
        if (!this.state.selectedAccount) {
          return reject(new Error("No account selected"));
        }

        try {
          const api = await getApi();
          const tokensForUser = await api.query.baseNft.tokensByOwner.entries(
            this.state.selectedAccount?.address
          );
          const result = tokensForUser.map((token) => token[1].toHuman());
          console.log("result", result);

          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    },

    async estimateFees(
      pallet: string,
      extrinsic: string,
      args: (number | string | TokenIdQueryTuple)[]
    ) {
      // eslint-disable-next-line no-async-promise-executor
      return new Promise(async (resolve, reject) => {
        if (!this.state.selectedAccount) {
          return reject(new Error("No account selected"));
        }

        try {
          const api = await getApi();
          const estimate = await api.tx[pallet][extrinsic](
            this.state.selectedAccount.address,
            ...args
          ).paymentInfo(this.state.selectedAccount.address);

          resolve(estimate.toHuman());
        } catch (e) {
          reject(e);
        }
      });
    },
  } as IUseStore;
}

let polkadotApi: undefined | ApiPromise;

type ExtrinsicStatus = AnyJson & {
  InBlock: string;
};

interface InitialState {
  isPolkadotInitialized: boolean;
  selectedAccount: InjectedAccountWithMetaAndAccountInfo | undefined;
  availableAccounts: InjectedAccountWithMetaAndAccountInfo[];
  showAccountSwitcher: boolean;
  lastTransaction: string;
  nftTokens: string[];
}
export interface IUseStore {
  state: InitialState;
  setIsPolkadotInitialized: (value: boolean) => void;
  setSelectedAccount: (address: string) => void;
  setAvailableAccounts: (accounts: InjectedAccountWithMeta[]) => void;
  updateAccountsInfo: () => Promise<void>;
  setAccountsInfo: (accountsInfo: AccountInfo[]) => void;
  setShowAccountSwitcher: (value: boolean) => void;
  setLastTransaction: (transaction: string) => void;
  extrinsicMintIpfsNft: (ipfsCid: string) => Promise<boolean>;
  extrinsicFractionalTransfer: (
    to: string,
    token: string,
    percentage: number
  ) => Promise<AnyJson>;
  queryByTokens: (tokenIds: number[]) => Promise<AnyJson[]>;
  queryTokensByOwner: () => Promise<AnyJson[]>;
  estimateFees: (
    pallet: string,
    extrinsic: string,
    args: (number | string | TokenIdQueryTuple)[]
  ) => Promise<Record<string, AnyJson>>;
}

export interface InjectedAccountWithMetaAndAccountInfo
  extends InjectedAccountWithMeta {
  // eslint-disable-next-line camelcase
  free_balance?: string;
}

export interface TokenStorageValues {
  data: Record<string, string>;
  metadata: string;
  owners: string[];
}
