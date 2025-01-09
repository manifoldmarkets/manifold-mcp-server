# Manifold Markets MCP Server

An MCP server for interacting with Manifold Markets prediction markets. This server enables LLMs to search markets, get market details, place bets, and track positions through a standardized interface.

## Features

- Search and filter prediction markets
- Get detailed market information
- Place bets and limit orders
- Track user positions

## Installation

```bash
npm install manifold-mcp-server
```

## Configuration

The server requires a Manifold Markets API key for authenticated operations (like placing bets). You can get your API key from your Manifold Markets profile settings.

Set your API key as an environment variable:

```bash
export MANIFOLD_API_KEY=your_api_key_here
```

## Usage with Claude Desktop

Add the server to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

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

## Available Tools

### search_markets
Search for prediction markets with optional filters:
- term: Search query
- limit: Max number of results (1-100)
- filter: 'all', 'open', 'closed', or 'resolved'
- sort: 'newest', 'score', or 'liquidity'

### get_market
Get detailed information about a specific market:
- marketId: Market ID

### place_bet
Place a bet on a market:
- marketId: Market ID
- amount: Amount to bet in mana
- outcome: 'YES' or 'NO'
- limitProb: Optional limit order probability (0.01-0.99)

### get_positions
Get user positions across markets:
- userId: Optional user ID

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Start the server
npm start

# Run in development mode
npm run dev

# Run tests
npm test
```

## License

MIT
