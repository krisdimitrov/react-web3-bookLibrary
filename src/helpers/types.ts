export interface IAssetData {
  symbol: string;
  name: string;
  decimals: string;
  contractAddress: string;
  balance?: string;
}

export interface IChainData {
  name: string;
  short_name: string;
  chain: string;
  network: string;
  chain_id: number;
  network_id: number;
  rpc_url: string;
  native_currency: IAssetData;
  explorer?: string;
}

export enum TransactionStatus {
  SUCCESSFUL = 1,
  UNSUCCESSFUL = 0
}

export enum NotificationType {
  ERROR = 'error',
  INFO = 'info',
  ALERT = 'alert'
} 
