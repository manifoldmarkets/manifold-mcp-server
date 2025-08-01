#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

const API_BASE = 'https://api.manifold.markets';

const server = new Server(
  {
    name: 'manifold-markets',
    version: '0.2.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const MAX_ANSWERS = 100;
const MAX_MULTI_NUMERIC_ANSWERS = 12;
const NON_POINTS_BETS_LIMIT = 10_000;

// Market type specific schemas
const createBinarySchema = z.object({
  outcomeType: z.enum(['BINARY', 'STONK']),
  initialProb: z.number().min(1).max(99).optional(),
});

const createMultiSchema = z.object({
  outcomeType: z.enum(['MULTIPLE_CHOICE']),
  answers: z.array(z.string().trim().min(1)).max(MAX_ANSWERS),
  answerShortTexts: z
    .array(z.string().trim().min(1))
    .max(MAX_ANSWERS)
    .optional(),
  answerImageUrls: z
    .array(z.string().trim().min(1))
    .max(MAX_ANSWERS)
    .optional(),
  addAnswersMode: z
    .enum(['DISABLED', 'ONLY_CREATOR', 'ANYONE'])
    .default('DISABLED'),
  shouldAnswersSumToOne: z.boolean().optional(),
});

const createMultiNumericSchema = z.object({
  outcomeType: z.enum(['MULTI_NUMERIC']),
  answers: z.array(z.string().trim().min(1)).max(MAX_MULTI_NUMERIC_ANSWERS),
  midpoints: z.array(z.number().safe()).max(MAX_MULTI_NUMERIC_ANSWERS),
  shouldAnswersSumToOne: z.boolean(),
  addAnswersMode: z.enum(['DISABLED']).default('DISABLED'),
  unit: z.string(),
});

const createMultiDateSchema = z.object({
  outcomeType: z.enum(['DATE']),
  answers: z.array(z.string().trim().min(1)).max(MAX_MULTI_NUMERIC_ANSWERS),
  midpoints: z.array(z.number().safe()).max(MAX_MULTI_NUMERIC_ANSWERS),
  shouldAnswersSumToOne: z.boolean(),
  addAnswersMode: z.enum(['DISABLED']).default('DISABLED'),
  timezone: z.string(),
});

const createPollSchema = z.object({
  outcomeType: z.enum(['POLL']),
  answers: z.array(z.string().trim().min(1)).min(2).max(MAX_ANSWERS),
  voterVisibility: z.enum(['creator', 'everyone']).optional(),
});

// Combined create market schema
const CreateMarketSchema = z
  .object({
    question: z.string().min(1).max(120),
    description: z.object({
      type: z.literal('doc'),
      content: z.array(z.any()),
    }).or(z.string()).optional(),
    descriptionHtml: z.string().optional(),
    descriptionMarkdown: z.string().optional(),
    descriptionJson: z.string().optional(),
    closeTime: z
    .union([z.string(), z.number()])
    .optional(),    visibility: z.enum(['public', 'unlisted']).default('public').optional(),
    utcOffset: z.number().optional(),
    extraLiquidity: z.number().min(1).optional(),
    liquidityTier: z.union([z.literal(100), z.literal(1000), z.literal(10000), z.literal(100000)]),
  })
  .and(
    z.union([
      createMultiSchema,
      createPollSchema,
      createBinarySchema,
      createMultiNumericSchema,
      createMultiDateSchema,
    ])
  );

const SearchMarketsSchema = z.object({
  term: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  filter: z.enum(['all', 'open', 'closed', 'resolved']).optional(),
  sort: z.enum(['newest', 'score', 'liquidity']).optional(),
});

const PlaceBetSchema = z.object({
  marketId: z.string(),
  amount: z.number().positive(),
  outcome: z.enum(['YES', 'NO']),
  limitProb: z.number().min(0.01).max(0.99).optional(),
});

const GetMarketSchema = z.object({
  marketId: z.string(),
});

const GetUserSchema = z.object({
  username: z.string(),
});

const SellSharesSchema = z.object({
  marketId: z.string(),
  outcome: z.enum(['YES', 'NO']).optional(),
  shares: z.number().optional(),
});

const AddLiquiditySchema = z.object({
  marketId: z.string(),
  amount: z.number().positive(),
});

const CancelBetSchema = z.object({
  betId: z.string(),
});

const CloseMarketSchema = z.object({
  contractId: z.string(),
  closeTime: z.number().int().nonnegative().optional(),
});

const AddAnswerSchema = z.object({
  contractId: z.string(),
  text: z.string().min(1),
});

const FollowMarketSchema = z.object({
  contractId: z.string(),
  follow: z.boolean(),
});

const AddBountySchema = z.object({
  contractId: z.string(),
  amount: z.number().positive().finite(),
});

const AwardBountySchema = z.object({
  contractId: z.string(),
  commentId: z.string(),
  amount: z.number().positive().finite(),
});

const RemoveLiquiditySchema = z.object({
  contractId: z.string(),
  amount: z.number().positive().finite(),
});

const ReactSchema = z.object({
  contentId: z.string(),
  contentType: z.enum(['comment', 'contract']),
  remove: z.boolean().optional(),
  reactionType: z.enum(['like', 'dislike']).default('like'),
});

const SendManaSchema = z.object({
  toIds: z.array(z.string()),
  amount: z.number().min(10),
  message: z.string().optional(),
});

export const coerceBoolean = z
  .union([z.boolean(), z.literal('true'), z.literal('false')])
  .transform(
    (value) => value === true || value === 'true'
  ) as z.ZodType<boolean>


const GetBetsSchema = z
  .object({
    id: z.string().optional(),
    userId: z.string().optional(),
    username: z.string().optional(),
    contractId: z.string().or(z.array(z.string())).optional(),
    contractSlug: z.string().optional(),
    answerId: z.string().optional(),
    limit: z.coerce
      .number()
      .gte(0)
      .lte(NON_POINTS_BETS_LIMIT)
      .default(1000),
    before: z.string().optional(),
    after: z.string().optional(),
    beforeTime: z.coerce.number().optional(),
    afterTime: z.coerce.number().optional(),
    order: z.enum(['asc', 'desc']).optional(),
    kinds: z.enum(['open-limit']).optional(),
    minAmount: z.coerce.number().positive().optional(),
    // undocumented fields. idk what a good api interface would be
    filterRedemptions: coerceBoolean.optional(),
    includeZeroShareRedemptions: coerceBoolean.optional(),
    count: coerceBoolean.optional(),
  })
  .strict();

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'create_market',
      description: 'Create a new prediction market',
      inputSchema: {
        type: 'object',
        properties: {
          outcomeType: {
            type: 'string',
            enum: ['BINARY', 'STONK', 'MULTIPLE_CHOICE', 'MULTI_NUMERIC', 'DATE', 'POLL'],
            description: 'Type of market to create'
          },
          question: {
            type: 'string',
            description: 'The headline question for the market (max 480 chars)'
          },
          description: {
            type: 'string',
            description: 'Optional description for the market'
          },
          descriptionHtml: {
            type: 'string',
            description: 'Optional HTML description'
          },
          descriptionMarkdown: {
            type: 'string',
            description: 'Optional Markdown description'
          },
          descriptionJson: {
            type: 'string',
            description: 'Optional JSON description'
          },
          closeTime: {
            type: 'string',
            description: 'Optional. ISO string date when market will close'
          },
          visibility: {
            type: 'string',
            enum: ['public', 'unlisted'],
            description: 'Optional. Market visibility. Defaults to public.'
          },
          extraLiquidity: {
            type: 'number',
            description: 'Optional. Extra liquidity to add (min 1)'
          },
          liquidityTier: {
            type: 'number',
            enum: [100, 1000, 10000, 100000],
            description: 'Liquidity tier - determines initial market liquidity'
          },
          // BINARY/STONK specific
          initialProb: {
            type: 'number',
            description: 'Optional for BINARY/STONK markets. Initial probability (1-99)'
          },
          // MULTIPLE_CHOICE specific
          answers: {
            type: 'array',
            items: { type: 'string' },
            description: 'Required for MULTIPLE_CHOICE/POLL/MULTI_NUMERIC/DATE markets. Array of answers'
          },
          answerShortTexts: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional for MULTIPLE_CHOICE markets. Short text for answers'
          },
          answerImageUrls: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional for MULTIPLE_CHOICE markets. Image URLs for answers'
          },
          addAnswersMode: {
            type: 'string',
            enum: ['DISABLED', 'ONLY_CREATOR', 'ANYONE'],
            description: 'Optional for MULTIPLE_CHOICE markets. Who can add answers'
          },
          shouldAnswersSumToOne: {
            type: 'boolean',
            description: 'Optional for MULTIPLE_CHOICE markets. Whether probabilities sum to 100%'
          },
          // MULTI_NUMERIC/DATE specific
          midpoints: {
            type: 'array',
            items: { type: 'number' },
            description: 'Required for MULTI_NUMERIC/DATE markets. Array of midpoint values'
          },
          unit: {
            type: 'string',
            description: 'Required for MULTI_NUMERIC markets. Unit of measurement'
          },
          timezone: {
            type: 'string',
            description: 'Required for DATE markets. Timezone'
          },
          // POLL specific
          voterVisibility: {
            type: 'string',
            enum: ['creator', 'everyone'],
            description: 'Optional for POLL markets. Who can see voters'
          }
        },
        required: ['outcomeType', 'question', 'liquidityTier']
      }
    },
    {
      name: 'search_markets',
      description: 'Search for prediction markets with optional filters',
      inputSchema: {
        type: 'object',
        properties: {
          term: { type: 'string', description: 'Search query' },
          limit: { type: 'number', description: 'Max number of results (1-100)' },
          filter: { type: 'string', enum: ['all', 'open', 'closed', 'resolved'] },
          sort: { type: 'string', enum: ['newest', 'score', 'liquidity'] },
        },
      },
    },
    {
      name: 'get_market',
      description: 'Get detailed information about a specific market',
      inputSchema: {
        type: 'object',
        properties: {
          marketId: { type: 'string', description: 'Market ID' },
        },
        required: ['marketId'],
      },
    },
    {
      name: 'get_user',
      description: 'Get user information by username',
      inputSchema: {
        type: 'object',
        properties: {
          username: { type: 'string', description: 'Username' },
        },
        required: ['username'],
      },
    },
    {
      name: 'get_bets',
      description: 'Get bets from markets or for users with various filtering options',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Optional. Bet ID to filter by' },
          userId: { type: 'string', description: 'Optional. User ID to filter by' },
          username: { type: 'string', description: 'Optional. Username to filter by' },
          contractId: { 
            oneOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } }
            ],
            description: 'Optional. Contract ID(s) to filter by'
          },
          contractSlug: { type: 'string', description: 'Optional. Contract slug to filter by' },
          answerId: { type: 'string', description: 'Optional. Answer ID to filter by' },
          limit: { type: 'number', minimum: 0, maximum: NON_POINTS_BETS_LIMIT, description: 'Optional. Number of bets to return (default: 1000)' },
          before: { type: 'string', description: 'Optional. Get bets before this bet ID' },
          after: { type: 'string', description: 'Optional. Get bets after this bet ID' },
          beforeTime: { type: 'number', description: 'Optional. Get bets before this timestamp' },
          afterTime: { type: 'number', description: 'Optional. Get bets after this timestamp' },
          order: { type: 'string', enum: ['asc', 'desc'], description: 'Optional. Sort order by creation time' },
          kinds: { type: 'string', enum: ['open-limit'], description: 'Optional. Filter by bet kind' },
          minAmount: { type: 'number', minimum: 0, description: 'Optional. Minimum bet amount' },
          filterRedemptions: { type: 'boolean', description: 'Optional. Filter redemptions' },
          includeZeroShareRedemptions: { type: 'boolean', description: 'Optional. Include zero share redemptions' },
        },
        required: [],
      },
    },
    {
      name: 'place_bet',
      description: 'Place a bet on a market',
      inputSchema: {
        type: 'object',
        properties: {
          marketId: { type: 'string', description: 'Market ID' },
          amount: { type: 'number', description: 'Amount to bet in mana' },
          outcome: { type: 'string', enum: ['YES', 'NO'] },
          limitProb: { 
            type: 'number',
            description: 'Optional limit order probability (0.01-0.99)',
          },
        },
        required: ['marketId', 'amount', 'outcome'],
      },
    },
    {
      name: 'cancel_bet',
      description: 'Cancel a limit order bet',
      inputSchema: {
        type: 'object',
        properties: {
          betId: { type: 'string', description: 'Bet ID to cancel' },
        },
        required: ['betId'],
      },
    },
    {
      name: 'sell_shares',
      description: 'Sell shares in a market',
      inputSchema: {
        type: 'object',
        properties: {
          marketId: { type: 'string', description: 'Market ID' },
          outcome: { type: 'string', enum: ['YES', 'NO'], description: 'Which type of shares to sell (defaults to what you have)' },
          shares: { type: 'number', description: 'How many shares to sell (defaults to all)' },
        },
        required: ['marketId'],
      },
    },
    {
      name: 'add_liquidity',
      description: 'Add mana to market liquidity pool',
      inputSchema: {
        type: 'object',
        properties: {
          marketId: { type: 'string', description: 'Market ID' },
          amount: { type: 'number', description: 'Amount of mana to add' },
        },
        required: ['marketId', 'amount'],
      },
    },
    {
      name: 'close_market',
      description: 'Close a market for trading',
      inputSchema: {
        type: 'object',
        properties: {
          contractId: { type: 'string', description: 'Market ID' },
          closeTime: { type: 'number', description: 'Optional. Unix timestamp in milliseconds when market will close' }
        },
        required: ['contractId']
      }
    },
    {
      name: 'add_answer',
      description: 'Add a new answer to a multiple choice market',
      inputSchema: {
        type: 'object',
        properties: {
          contractId: { type: 'string', description: 'Market ID' },
          text: { type: 'string', description: 'Answer text' }
        },
        required: ['contractId', 'text']
      }
    },
    {
      name: 'follow_market',
      description: 'Follow or unfollow a market',
      inputSchema: {
        type: 'object',
        properties: {
          contractId: { type: 'string', description: 'Market ID' },
          follow: { type: 'boolean', description: 'True to follow, false to unfollow' }
        },
        required: ['contractId', 'follow']
      }
    },
    {
      name: 'remove_liquidity',
      description: 'Remove liquidity from market pool',
      inputSchema: {
        type: 'object',
        properties: {
          contractId: { type: 'string', description: 'Market ID' },
          amount: { type: 'number', description: 'Amount of liquidity to remove' }
        },
        required: ['contractId', 'amount']
      }
    },
    {
      name: 'react',
      description: 'React to a market or comment',
      inputSchema: {
        type: 'object',
        properties: {
          contentId: { type: 'string', description: 'ID of market or comment' },
          contentType: { type: 'string', enum: ['comment', 'contract'], description: 'Type of content to react to' },
          remove: { type: 'boolean', description: 'Optional. True to remove reaction' },
          reactionType: { type: 'string', enum: ['like', 'dislike'], description: 'Type of reaction' }
        },
        required: ['contentId', 'contentType']
      }
    },
    {
      name: 'send_mana',
      description: 'Send mana to other users',
      inputSchema: {
        type: 'object',
        properties: {
          toIds: { 
            type: 'array',
            items: { type: 'string' },
            description: 'Array of user IDs to send mana to'
          },
          amount: { type: 'number', description: 'Amount of mana to send (min 10)' },
          message: { type: 'string', description: 'Optional message to include' },
        },
        required: ['toIds', 'amount'],
      },
    },
  ],
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'create_market': {
        const params = CreateMarketSchema.parse(args);
        const apiKey = process.env.MANIFOLD_API_KEY;
        if (!apiKey) {
          throw new McpError(
            ErrorCode.InternalError,
            'MANIFOLD_API_KEY environment variable is required'
          );
        }

        // Validate required fields based on market type
        switch (params.outcomeType) {
          case 'BINARY':
          case 'STONK':
            // initialProb is optional for BINARY/STONK
            break;
          case 'MULTIPLE_CHOICE':
            if (!params.answers || !Array.isArray(params.answers) || params.answers.length === 0) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'answers array is required for MULTIPLE_CHOICE markets'
              );
            }
            break;
          case 'MULTI_NUMERIC':
            if (!params.answers || !Array.isArray(params.answers) || 
                !params.midpoints || !Array.isArray(params.midpoints) ||
                params.shouldAnswersSumToOne === undefined || !params.unit) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'answers, midpoints, shouldAnswersSumToOne, and unit are required for MULTI_NUMERIC markets'
              );
            }
            break;
          case 'DATE':
            if (!params.answers || !Array.isArray(params.answers) || 
                !params.midpoints || !Array.isArray(params.midpoints) ||
                params.shouldAnswersSumToOne === undefined || !params.timezone) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'answers, midpoints, shouldAnswersSumToOne, and timezone are required for DATE markets'
              );
            }
            break;
          case 'POLL':
            if (!params.answers || !Array.isArray(params.answers) || params.answers.length < 2) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'answers array with at least 2 items is required for POLL markets'
              );
            }
            break;
        }

        // Convert string description to TipTap format if needed
        if (typeof params.description === 'string') {
          params.description = {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: params.description
                  }
                ]
              }
            ]
          };
        }

        // Convert ISO string closeTime to timestamp number if needed
        if (params.closeTime && typeof params.closeTime === 'string') {
          params.closeTime = new Date(params.closeTime).getTime();
        }

        const response = await fetch(`${API_BASE}/v0/market`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Key ${apiKey}`,
          },
          body: JSON.stringify(params),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new McpError(
            ErrorCode.InternalError,
            `Manifold API error: ${error}`
          );
        }

        const market = await response.json();
        return {
          content: [{
            type: 'text',
            text: `Created market: ${market.url}`,
          }],
        };
      }

      case 'search_markets': {
        const params = SearchMarketsSchema.parse(args);
        const searchParams = new URLSearchParams();
        if (params.term) searchParams.set('term', params.term);
        if (params.limit) searchParams.set('limit', params.limit.toString());
        if (params.filter) searchParams.set('filter', params.filter);
        if (params.sort) searchParams.set('sort', params.sort);

        const response = await fetch(
          `${API_BASE}/v0/search-markets?${searchParams}`,
          { headers: { Accept: 'application/json' } }
        );

        if (!response.ok) {
          throw new McpError(
            ErrorCode.InternalError,
            `Manifold API error: ${response.statusText}`
          );
        }

        const markets = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(markets, null, 2),
            },
          ],
        };
      }

      case 'get_market': {
        const { marketId } = GetMarketSchema.parse(args);
        const response = await fetch(`${API_BASE}/v0/market/${marketId}`, {
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new McpError(
            ErrorCode.InternalError,
            `Manifold API error: ${response.statusText}`
          );
        }

        const market = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(market, null, 2),
            },
          ],
        };
      }

      case 'get_user': {
        const { username } = GetUserSchema.parse(args);
        const response = await fetch(`${API_BASE}/v0/user/${username}`, {
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new McpError(
            ErrorCode.InternalError,
            `Manifold API error: ${response.statusText}`
          );
        }

        const user = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(user, null, 2),
            },
          ],
        };
      }

      case 'get_bets': {
        const params = GetBetsSchema.parse(args);
        
        // Build query parameters
        const queryParams = new URLSearchParams();
        
        if (params.id) queryParams.append('id', params.id);
        if (params.userId) queryParams.append('userId', params.userId);
        if (params.username) queryParams.append('username', params.username);
        if (params.contractId) {
          if (Array.isArray(params.contractId)) {
            params.contractId.forEach(id => queryParams.append('contractId', id));
          } else {
            queryParams.append('contractId', params.contractId);
          }
        }
        if (params.contractSlug) queryParams.append('contractSlug', params.contractSlug);
        if (params.answerId) queryParams.append('answerId', params.answerId);
        if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
        if (params.before) queryParams.append('before', params.before);
        if (params.after) queryParams.append('after', params.after);
        if (params.beforeTime) queryParams.append('beforeTime', params.beforeTime.toString());
        if (params.afterTime) queryParams.append('afterTime', params.afterTime.toString());
        if (params.order) queryParams.append('order', params.order);
        if (params.kinds) queryParams.append('kinds', params.kinds);
        if (params.minAmount) queryParams.append('minAmount', params.minAmount.toString());
        if (params.filterRedemptions !== undefined) queryParams.append('filterRedemptions', params.filterRedemptions.toString());
        if (params.includeZeroShareRedemptions !== undefined) queryParams.append('includeZeroShareRedemptions', params.includeZeroShareRedemptions.toString());

        const url = `${API_BASE}/v0/bets${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const response = await fetch(url, {
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          throw new McpError(
            ErrorCode.InternalError,
            `Manifold API error: ${response.statusText}`
          );
        }

        const bets = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(bets, null, 2),
            },
          ],
        };
      }

      case 'place_bet': {
        const params = PlaceBetSchema.parse(args);
        const apiKey = process.env.MANIFOLD_API_KEY;
        if (!apiKey) {
          throw new McpError(
            ErrorCode.InternalError,
            'MANIFOLD_API_KEY environment variable is required'
          );
        }

        const response = await fetch(`${API_BASE}/v0/bet`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Key ${apiKey}`,
          },
          body: JSON.stringify({
            contractId: params.marketId,
            amount: params.amount,
            outcome: params.outcome,
            limitProb: params.limitProb,
          }),
        });

        if (!response.ok) {
          throw new McpError(
            ErrorCode.InternalError,
            `Manifold API error: ${response.statusText}`
          );
        }

        const result = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'cancel_bet': {
        const { betId } = CancelBetSchema.parse(args);
        const apiKey = process.env.MANIFOLD_API_KEY;
        if (!apiKey) {
          throw new McpError(
            ErrorCode.InternalError,
            'MANIFOLD_API_KEY environment variable is required'
          );
        }

        const response = await fetch(`${API_BASE}/v0/bet/cancel/${betId}`, {
          method: 'POST',
          headers: {
            Authorization: `Key ${apiKey}`,
          },
        });

        if (!response.ok) {
          throw new McpError(
            ErrorCode.InternalError,
            `Manifold API error: ${response.statusText}`
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: 'Bet cancelled successfully',
            },
          ],
        };
      }

      case 'sell_shares': {
        const params = SellSharesSchema.parse(args);
        const apiKey = process.env.MANIFOLD_API_KEY;
        if (!apiKey) {
          throw new McpError(
            ErrorCode.InternalError,
            'MANIFOLD_API_KEY environment variable is required'
          );
        }

        const response = await fetch(`${API_BASE}/v0/market/${params.marketId}/sell`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Key ${apiKey}`,
          },
          body: JSON.stringify({
            outcome: params.outcome,
            shares: params.shares,
          }),
        });

        if (!response.ok) {
          throw new McpError(
            ErrorCode.InternalError,
            `Manifold API error: ${response.statusText}`
          );
        }

        const result = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'add_liquidity': {
        const params = AddLiquiditySchema.parse(args);
        const apiKey = process.env.MANIFOLD_API_KEY;
        if (!apiKey) {
          throw new McpError(
            ErrorCode.InternalError,
            'MANIFOLD_API_KEY environment variable is required'
          );
        }

        const response = await fetch(`${API_BASE}/v0/market/${params.marketId}/add-liquidity`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Key ${apiKey}`,
          },
          body: JSON.stringify({
            amount: params.amount,
          }),
        });

        if (!response.ok) {
          throw new McpError(
            ErrorCode.InternalError,
            `Manifold API error: ${response.statusText}`
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: 'Liquidity added successfully',
            },
          ],
        };
      }

      case 'close_market': {
        const params = CloseMarketSchema.parse(args);
        const apiKey = process.env.MANIFOLD_API_KEY;
        if (!apiKey) {
          throw new McpError(
            ErrorCode.InternalError,
            'MANIFOLD_API_KEY environment variable is required'
          );
        }

        const response = await fetch(`${API_BASE}/v0/market/${params.contractId}/close`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Key ${apiKey}`,
          },
          body: JSON.stringify({
            closeTime: params.closeTime,
          }),
        });

        if (!response.ok) {
          throw new McpError(
            ErrorCode.InternalError,
            `Manifold API error: ${response.statusText}`
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: 'Market closed successfully',
            },
          ],
        };
      }

      case 'add_answer': {
        const params = AddAnswerSchema.parse(args);
        const apiKey = process.env.MANIFOLD_API_KEY;
        if (!apiKey) {
          throw new McpError(
            ErrorCode.InternalError,
            'MANIFOLD_API_KEY environment variable is required'
          );
        }

        const response = await fetch(`${API_BASE}/v0/market/${params.contractId}/answer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Key ${apiKey}`,
          },
          body: JSON.stringify({
            text: params.text,
          }),
        });

        if (!response.ok) {
          throw new McpError(
            ErrorCode.InternalError,
            `Manifold API error: ${response.statusText}`
          );
        }

        const result = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: `Answer added with ID: ${result.newAnswerId}`,
            },
          ],
        };
      }

      case 'follow_market': {
        const params = FollowMarketSchema.parse(args);
        const apiKey = process.env.MANIFOLD_API_KEY;
        if (!apiKey) {
          throw new McpError(
            ErrorCode.InternalError,
            'MANIFOLD_API_KEY environment variable is required'
          );
        }

        const response = await fetch(`${API_BASE}/v0/follow-contract`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Key ${apiKey}`,
          },
          body: JSON.stringify({
            contractId: params.contractId,
            follow: params.follow,
          }),
        });

        if (!response.ok) {
          throw new McpError(
            ErrorCode.InternalError,
            `Manifold API error: ${response.statusText}`
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: params.follow ? 'Now following market' : 'Unfollowed market',
            },
          ],
        };
      }

      case 'remove_liquidity': {
        const params = RemoveLiquiditySchema.parse(args);
        const apiKey = process.env.MANIFOLD_API_KEY;
        if (!apiKey) {
          throw new McpError(
            ErrorCode.InternalError,
            'MANIFOLD_API_KEY environment variable is required'
          );
        }

        const response = await fetch(`${API_BASE}/v0/market/${params.contractId}/remove-liquidity`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Key ${apiKey}`,
          },
          body: JSON.stringify({
            amount: params.amount,
          }),
        });

        if (!response.ok) {
          throw new McpError(
            ErrorCode.InternalError,
            `Manifold API error: ${response.statusText}`
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: 'Liquidity removed successfully',
            },
          ],
        };
      }

      case 'react': {
        const params = ReactSchema.parse(args);
        const apiKey = process.env.MANIFOLD_API_KEY;
        if (!apiKey) {
          throw new McpError(
            ErrorCode.InternalError,
            'MANIFOLD_API_KEY environment variable is required'
          );
        }

        const response = await fetch(`${API_BASE}/v0/react`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Key ${apiKey}`,
          },
          body: JSON.stringify(params),
        });

        if (!response.ok) {
          throw new McpError(
            ErrorCode.InternalError,
            `Manifold API error: ${response.statusText}`
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: params.remove ? 'Reaction removed' : 'Reaction added',
            },
          ],
        };
      }

      case 'send_mana': {
        const params = SendManaSchema.parse(args);
        const apiKey = process.env.MANIFOLD_API_KEY;
        if (!apiKey) {
          throw new McpError(
            ErrorCode.InternalError,
            'MANIFOLD_API_KEY environment variable is required'
          );
        }

        const response = await fetch(`${API_BASE}/v0/managram`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Key ${apiKey}`,
          },
          body: JSON.stringify({
            toIds: params.toIds,
            amount: params.amount,
            message: params.message,
          }),
        });

        if (!response.ok) {
          throw new McpError(
            ErrorCode.InternalError,
            `Manifold API error: ${response.statusText}`
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: 'Mana sent successfully',
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', ')}`
      );
    }
    throw error;
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Manifold Markets MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
