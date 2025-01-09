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
// Tool schemas
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

const SendManaSchema = z.object({
  toIds: z.array(z.string()),
  amount: z.number().min(10),
  message: z.string().optional(),
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
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
