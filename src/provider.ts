import { ChainId } from '@angleprotocol/sdk';
import { providers } from 'ethers';

export const requireEnvVars = <T extends string>(vars: T[]): Record<typeof vars[number], string> => {
  const missingEnvVars = vars.filter((v) => !process.env[v]);
  if (missingEnvVars.length) {
    throw new Error(`Missing env vars: ${missingEnvVars.join(', ')}`);
  }

  return vars.reduce((acc, envVar) => {
    acc[envVar] = process.env[envVar] as string;
    return acc;
  }, {} as Record<typeof vars[number], string>);
};

const { PROVIDER_MAINNET, PROVIDER_POLYGON } =
  process.env.PRODUCTION_SETUP === 'true'
    ? requireEnvVars(['PROVIDER_MAINNET', 'PROVIDER_POLYGON', 'PRIVATE_KEY_UNISWAP_INCENTIVES'])
    : requireEnvVars(['PROVIDER_MAINNET', 'PROVIDER_POLYGON']);

const { PRIVATE_KEY_UNISWAP_INCENTIVES } =
  process.env.PRODUCTION_SETUP === 'true' ? requireEnvVars(['PRIVATE_KEY_UNISWAP_INCENTIVES']) : { PRIVATE_KEY_UNISWAP_INCENTIVES: '' };

export const NETWORKS = {
  [ChainId.MAINNET]: PROVIDER_MAINNET,
  [ChainId.POLYGON]: PROVIDER_POLYGON,
};
export const httpProvider = (network: keyof typeof NETWORKS) => new providers.JsonRpcProvider(NETWORKS[network]);

const PRIVATE_KEYS = {
  [ChainId.MAINNET]: PRIVATE_KEY_UNISWAP_INCENTIVES,
  [ChainId.POLYGON]: PRIVATE_KEY_UNISWAP_INCENTIVES,
};

export const getPrivateKeys = (network: keyof typeof PRIVATE_KEYS) => {
  const keys = JSON.parse(PRIVATE_KEYS[network]) as string[];
  return keys || [];
};
