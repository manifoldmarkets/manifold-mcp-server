#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

const API_BASE = 'https://api.manifold.markets';

const server = new Server(
  {
    name: 'manifold-markets',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool schemas
const CreateMarketSchema = z.object({
  outcomeType: z.enum(['BINARY', 'MULTIPLE_CHOICE', 'PSEUDO_NUMERIC', 'POLL', 'BOUNTIED_QUESTION']),
  question: z.string(),
  description: z.union([
    z.string(),
    z.object({
      type: z.literal('doc'),
      content: z.array(z.any()),
    })
  ]).optional(),
  closeTime: z.number().optional(), // Unix timestamp in milliseconds
  visibility: z.enum(['public', 'unlisted']).optional(),
  initialProb: z.number().min(1).max(99).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  isLogScale: z.boolean().optional(),
  initialValue: z.number().optional(),
  answers: z.array(z.string()).optional(),
  addAnswersMode: z.enum(['DISABLED', 'ONLY_CREATOR', 'ANYONE']).optional(),
  shouldAnswersSumToOne: z.boolean().optional(),
  totalBounty: z.number().optional(),
  groupIds: z.array(z.string()).optional(),
});

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

const GetUserPositionsSchema = z.object({
  userId: z.string(),
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

const UnresolveMarketSchema = z.object({
  contractId: z.string(),
  answerId: z.string().optional(),
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
            enum: ['BINARY', 'MULTIPLE_CHOICE', 'PSEUDO_NUMERIC', 'POLL', 'BOUNTIED_QUESTION'],
            description: 'Type of market to create'
          },
          question: {
            type: 'string',
            description: 'The headline question for the market'
          },
          description: {
            type: 'string',
            description: 'Optional description for the market'
          },
          closeTime: {
            type: 'string',
            description: 'Optional. ISO timestamp when market will close. Defaults to 7 days.'
          },
          visibility: {
            type: 'string',
            enum: ['public', 'unlisted'],
            description: 'Optional. Market visibility. Defaults to public.'
          },
          initialProb: {
            type: 'number',
            description: 'Required for BINARY markets. Initial probability (1-99)'
          },
          min: {
            type: 'number',
            description: 'Required for PSEUDO_NUMERIC markets. Minimum resolvable value'
          },
          max: {
            type: 'number',
            description: 'Required for PSEUDO_NUMERIC markets. Maximum resolvable value'
          },
          isLogScale: {
            type: 'boolean',
            description: 'Optional for PSEUDO_NUMERIC markets. If true, increases exponentially'
          },
          initialValue: {
            type: 'number',
            description: 'Required for PSEUDO_NUMERIC markets. Initial value between min and max'
          },
          answers: {
            type: 'array',
            items: { type: 'string' },
            description: 'Required for MULTIPLE_CHOICE/POLL markets. Array of possible answers'
          },
          addAnswersMode: {
            type: 'string',
            enum: ['DISABLED', 'ONLY_CREATOR', 'ANYONE'],
            description: 'Optional for MULTIPLE_CHOICE markets. Controls who can add answers'
          },
          shouldAnswersSumToOne: {
            type: 'boolean',
            description: 'Optional for MULTIPLE_CHOICE markets. Makes probabilities sum to 100%'
          },
          totalBounty: {
            type: 'number',
            description: 'Required for BOUNTIED_QUESTION markets. Amount of mana for bounty'
          }
        },
        required: ['outcomeType', 'question']
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
      name: 'get_positions',
      description: 'Get user positions across markets',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID' },
        },
        required: ['userId'],
      },
    },
    {
      name: 'unresolve_market',
      description: 'Unresolve a previously resolved market',
      inputSchema: {
        type: 'object',
        properties: {
          contractId: { type: 'string', description: 'Market ID' },
          answerId: { type: 'string', description: 'Optional. Answer ID for multiple choice markets' }
        },
        required: ['contractId']
      }
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
      name: 'add_bounty',
      description: 'Add bounty to a market',
      inputSchema: {
        type: 'object',
        properties: {
          contractId: { type: 'string', description: 'Market ID' },
          amount: { type: 'number', description: 'Amount of mana to add as bounty' }
        },
        required: ['contractId', 'amount']
      }
    },
    {
      name: 'award_bounty',
      description: 'Award bounty to a comment',
      inputSchema: {
        type: 'object',
        properties: {
          contractId: { type: 'string', description: 'Market ID' },
          commentId: { type: 'string', description: 'Comment ID to award bounty to' },
          amount: { type: 'number', description: 'Amount of bounty to award' }
        },
        required: ['contractId', 'commentId', 'amount']
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
            if (!params.initialProb) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'initialProb is required for BINARY markets'
              );
            }
            break;
          case 'PSEUDO_NUMERIC':
            if (!params.min || !params.max || !params.initialValue) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'min, max, and initialValue are required for PSEUDO_NUMERIC markets'
              );
            }
            break;
          case 'MULTIPLE_CHOICE':
          case 'POLL':
            if (!params.answers || !Array.isArray(params.answers)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'answers array is required for MULTIPLE_CHOICE/POLL markets'
              );
            }
            break;
          case 'BOUNTIED_QUESTION':
            if (!params.totalBounty) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'totalBounty is required for BOUNTIED_QUESTION markets'
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

      case 'get_positions': {
        const { userId } = GetUserPositionsSchema.parse(args);
        const response = await fetch(
          `${API_BASE}/v0/bets?userId=${userId}`,
          { headers: { Accept: 'application/json' } }
        );

        if (!response.ok) {
          throw new McpError(
            ErrorCode.InternalError,
            `Manifold API error: ${response.statusText}`
          );
        }

        const positions = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(positions, null, 2),
            },
          ],
        };
      }

      case 'unresolve_market': {
        const params = UnresolveMarketSchema.parse(args);
        const apiKey = process.env.MANIFOLD_API_KEY;
        if (!apiKey) {
          throw new McpError(
            ErrorCode.InternalError,
            'MANIFOLD_API_KEY environment variable is required'
          );
        }

        const response = await fetch(`${API_BASE}/v0/unresolve`, {
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
              text: 'Market unresolved successfully',
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

      case 'add_bounty': {
        const params = AddBountySchema.parse(args);
        const apiKey = process.env.MANIFOLD_API_KEY;
        if (!apiKey) {
          throw new McpError(
            ErrorCode.InternalError,
            'MANIFOLD_API_KEY environment variable is required'
          );
        }

        const response = await fetch(`${API_BASE}/v0/market/${params.contractId}/add-bounty`, {
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
              text: 'Bounty added successfully',
            },
          ],
        };
      }

      case 'award_bounty': {
        const params = AwardBountySchema.parse(args);
        const apiKey = process.env.MANIFOLD_API_KEY;
        if (!apiKey) {
          throw new McpError(
            ErrorCode.InternalError,
            'MANIFOLD_API_KEY environment variable is required'
          );
        }

        const response = await fetch(`${API_BASE}/v0/market/${params.contractId}/award-bounty`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Key ${apiKey}`,
          },
          body: JSON.stringify({
            commentId: params.commentId,
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
              text: 'Bounty awarded successfully',
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
