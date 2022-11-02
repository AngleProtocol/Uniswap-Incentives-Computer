import 'dotenv/config';

import { ChainId, CONTRACTS_ADDRESSES } from '@angleprotocol/sdk';
import express from 'express';
import moment from 'moment';

import { publishToGithubRepo } from './github';
import { requireEnvVars } from './provider';
import { computeUniswapV3Incentives } from './script';
import { addLastWeekRewards, RewardType, updateRewards, uploadAndPush } from './utils';

const app = express();

// ================================= PARAMETERS ================================
// Corresponds to how much swap per week you want to consider at most
const { SWAP_TO_CONSIDER } = requireEnvVars(['SWAP_TO_CONSIDER']);

// ================================ MIDDLEWARES ================================
if (process.env.PRODUCTION_SETUP === 'true' && !!process.env.HEADER_KEY && !!process.env.HEADER_VALUE) {
  app.use('/mainnet', (req, res, next) => {
    if (req.get(process.env.HEADER_KEY as string) === process.env.HEADER_VALUE) {
      next();
    } else {
      res.status(403).send('Incorrect authentication');
    }
  });
  app.use('/polygon', (req, res, next) => {
    if (req.get(process.env.HEADER_KEY as string) === process.env.HEADER_VALUE) {
      next();
    } else {
      res.status(403).send('Incorrect authentication');
    }
  });
}

// =================================== ROUTES ==================================
app.get('/mainnet', async (req, res) => {
  const agEUR_ETH = {
    name: 'agEUR / ETH',
    weights: { fees: 0.4, token0: 0.4, token1: 0.2 },
    uniswapV3poolAddress: '0x8db1b906d47dfc1d84a87fc49bd0522e285b98b9',
    arrakisPoolAddress: '0x857E0B2eD0E82D5cDEB015E77ebB873C47F99575',
    arrakisGaugeAddress: '0x3785ce82be62a342052b9e5431e9d3a839cfb581',
    gaugeAddress: '0x3785ce82be62a342052b9e5431e9d3a839cfb581',
    gammaPoolAddress: '0xe8f20fd90161de1d5b4cf7e2b5d92932ca06d5f4',
    agEUR: CONTRACTS_ADDRESSES[ChainId.MAINNET]?.agEUR?.AgToken as string,
  };

  const agEUR_USDC = {
    name: 'agEUR / USDC',
    weights: { fees: 0.4, token0: 0.4, token1: 0.2 },
    uniswapV3poolAddress: '0x735a26a57a0a0069dfabd41595a970faf5e1ee8b',
    arrakisPoolAddress: '0xEDECB43233549c51CC3268b5dE840239787AD56c',
    arrakisGaugeAddress: '0xEB7547a8a734b6fdDBB8Ce0C314a9E6485100a3C',
    gaugeAddress: '0xEB7547a8a734b6fdDBB8Ce0C314a9E6485100a3C',
    gammaPoolAddress: '0xf56abca39c27d5c74f94c901b8c137fdf53b3e80',
    agEUR: CONTRACTS_ADDRESSES[ChainId.MAINNET]?.agEUR?.AgToken as string,
  };

  const rewards: RewardType = {};
  updateRewards(rewards, await computeUniswapV3Incentives(1, agEUR_ETH, parseInt(SWAP_TO_CONSIDER)), 'Uni-V3 agEUR/ETH LP');
  updateRewards(rewards, await computeUniswapV3Incentives(1, agEUR_USDC, parseInt(SWAP_TO_CONSIDER)), 'Uni-V3 agEUR/USDC LP');

  await addLastWeekRewards(rewards, ChainId.MAINNET);
  if (process.env.PRODUCTION_SETUP === 'true') {
    await uploadAndPush(rewards, ChainId.MAINNET);
    const weekId = Math.floor(moment().unix() / (7 * 86400));
    const files = [
      {
        name: `mainnet/rewards_${weekId}.json`,
        contents: JSON.stringify(rewards),
      },
    ];
    try {
      await publishToGithubRepo('AngleProtocol', 'uniswapv3-rewards', files);
    } catch {
      console.log('Failed to publish to github repo ❌');
    }
  }
  res.json(rewards);
});

app.get('/polygon', async (req, res) => {
  const agEUR_USDC_Polygon = {
    name: 'agEUR / Polygon',
    weights: { fees: 0.4, token0: 0.2, token1: 0.4 },
    uniswapV3poolAddress: '0x3fa147d6309abeb5c1316f7d8a7d8bd023e0cd80',
    arrakisPoolAddress: '0x1644de0A8E54626b54AC77463900FcFFD8B94542',
    arrakisGaugeAddress: '0x15BdE1A8d16d4072d949591aFd4fA7ad9d127D05',
    gaugeAddress: '0x4EA4C5ca64A3950E53c61d0616DAF92727119093',
    gammaPoolAddress: '0xa29193Af0816D43cF44A3745755BF5f5e2f4F170',
    agEUR: CONTRACTS_ADDRESSES[ChainId.POLYGON]?.agEUR?.AgToken as string,
  };

  const rewards: RewardType = {};
  updateRewards(
    rewards,
    await computeUniswapV3Incentives(ChainId.POLYGON, agEUR_USDC_Polygon, parseInt(SWAP_TO_CONSIDER)),
    'Polygon Uni-V3 agEUR/USDC LP'
  );

  await addLastWeekRewards(rewards, ChainId.POLYGON);
  if (process.env.PRODUCTION_SETUP === 'true') {
    await uploadAndPush(rewards, ChainId.POLYGON);
    const weekId = Math.floor(moment().unix() / (7 * 86400));
    const files = [
      {
        name: `polygon/rewards_${weekId}.json`,
        contents: JSON.stringify(rewards),
      },
    ];
    try {
      await publishToGithubRepo('AngleProtocol', 'uniswapv3-rewards', files);
    } catch {
      console.log('Failed to publish to github repo ❌');
    }
  }
  res.json(rewards);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Listening on PORT: ${PORT}`));
