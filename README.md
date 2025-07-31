
# *⚠️CURRENTLY UNDER CONSTRUCTION⚠️*  

# Manifold Markets MCP Server

An MCP server for interacting with Manifold Markets prediction markets. This server provides comprehensive access to Manifold's features through a clean MCP interface, enabling sophisticated market interactions and collective intelligence mechanisms.

## Architecture

The server implements a complete mapping of Manifold Markets' API capabilities through a structured tool system:

### Core Components
- **Schema Layer**: Zod-based validation schemas for all operations
- **API Integration**: Direct mapping to Manifold's REST endpoints
- **Tool Handlers**: Request processing with proper error management
- **Type Safety**: Full TypeScript implementation

### Tool Categories

#### Market Creation & Management
- `create_market`: Create markets (BINARY, MULTIPLE_CHOICE, PSEUDO_NUMERIC, POLL)
- `unresolve_market`: Revert resolved markets
- `close_market`: Close markets for trading
- `add_answer`: Add options to multiple choice markets

#### Market Interaction
- `follow_market`: Track markets of interest
- `react`: Like/dislike markets and comments
- `add_bounty`: Add bounties for analysis
- `award_bounty`: Reward valuable contributions

#### Trading Operations
- `place_bet`: Execute market trades
- `cancel_bet`: Cancel limit orders
- `sell_shares`: Liquidate positions

#### Liquidity Management
- `add_liquidity`: Provide market liquidity
- `remove_liquidity`: Withdraw provided liquidity

#### Information Retrieval
- `search_markets`: Find markets with filters
- `get_market`: Detailed market information
- `get_user`: User profile data
- `get_positions`: Portfolio tracking

#### Social Features
- `send_mana`: Transfer mana between users

## Verified Capabilities

The server has been tested through comprehensive interaction trajectories:

### Successfully Tested
1. Market Discovery & Following
   - ✅ Market search with filters
   - ✅ Market following
   - ✅ Detailed market information retrieval

2. Trading Operations
   - ✅ Liquidity provision
   - ✅ Bet placement with probability updates
   - ✅ Position liquidation
   - ✅ Share selling

3. Permission Management
   - ✅ Role-based access control
   - ✅ Authentication handling
   - ✅ Error messaging

### Permission-Restricted Operations
These operations are implemented but require specific user roles:
- Market resolution/unresolving (market creator)
- Market closing (market creator)
- Bounty management (market creator)
- Liquidity removal (liquidity provider)

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Manifold Markets API key
- Minimum M$1000 balance for market creation

## Installation

### 1. Install the package

```bash
npm install manifold-mcp-server
```

### 2. Get your API Key

1. Log in to [Manifold Markets](https://manifold.markets)
2. Go to your profile settings
3. Generate an API key
4. Ensure account has sufficient mana for intended operations

### 3. Configure MCP Settings

#### For Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "manifold": {
      "command": "node",
      "args": ["/path/to/manifold-mcp-server/build/index.js"],
      "env": {
        "MANIFOLD_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

#### For Cline (VSCode Extension)

Add to `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "manifold": {
      "command": "node",
      "args": ["/path/to/manifold-mcp-server/build/index.js"],
      "env": {
        "MANIFOLD_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Tool Documentation

### Market Creation & Management

#### create_market
Create a new prediction market:
```typescript
{
  outcomeType: 'BINARY' | 'MULTIPLE_CHOICE' | 'PSEUDO_NUMERIC' | 'POLL' | 'BOUNTIED_QUESTION'
  question: string
  description?: string | {
    type: 'doc'
    content: any[]
  }
  closeTime?: number // Unix timestamp ms
  visibility?: 'public' | 'unlisted'
  initialProb?: number // Required for BINARY (1-99)
  min?: number // Required for PSEUDO_NUMERIC
  max?: number // Required for PSEUDO_NUMERIC
  isLogScale?: boolean
  initialValue?: number // Required for PSEUDO_NUMERIC
  answers?: string[] // Required for MULTIPLE_CHOICE/POLL
  addAnswersMode?: 'DISABLED' | 'ONLY_CREATOR' | 'ANYONE'
  shouldAnswersSumToOne?: boolean
  totalBounty?: number // Required for BOUNTIED_QUESTION
}
```

#### unresolve_market
Unresolve a previously resolved market:
```typescript
{
  contractId: string
  answerId?: string // For multiple choice markets
}
```

#### close_market
Close a market for trading:
```typescript
{
  contractId: string
  closeTime?: number // Optional close time
}
```

### Market Interaction

#### follow_market
Follow or unfollow a market:
```typescript
{
  contractId: string
  follow: boolean
}
```

#### react
React to markets or comments:
```typescript
{
  contentId: string
  contentType: 'comment' | 'contract'
  remove?: boolean
  reactionType: 'like' | 'dislike'
}
```

### Trading Operations

#### place_bet
Place a bet on a market:
```typescript
{
  marketId: string
  amount: number
  outcome: 'YES' | 'NO'
  limitProb?: number // 0.01-0.99
}
```

#### sell_shares
Sell shares in a market:
```typescript
{
  marketId: string
  outcome?: 'YES' | 'NO'
  shares?: number // Defaults to all
}
```

### Liquidity Management

#### add_liquidity
Add liquidity to market pool:
```typescript
{
  marketId: string
  amount: number
}
```

#### remove_liquidity
Remove liquidity from market pool:
```typescript
{
  contractId: string
  amount: number
}
```

## Error Handling

The server implements comprehensive error handling:

1. Input Validation
   - Parameter type checking via Zod schemas
   - Value range validation
   - Required field verification

2. API Communication
   - Authentication errors
   - Network failures
   - Rate limiting
   - Permission checks

3. Business Logic
   - Insufficient balance
   - Invalid market states
   - Unauthorized operations

4. Error Response Format
```typescript
{
  code: ErrorCode
  message: string
  details?: any
}
```

## Development

```bash
# Clone the repository
git clone https://github.com/bmorphism/manifold-mcp-server.git
cd manifold-mcp-server

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
```

## Contributing

Contributions welcome! Areas of interest:
- Advanced market analysis tools
- Portfolio optimization features
- Integration with other prediction platforms
- Documentation improvements

## Security

- API keys handled via environment variables
- Input validation on all parameters
- Rate limiting protection
- Safe error messages
- Role-based access control

## License

MIT
