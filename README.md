# Manifold Markets MCP Server

An MCP server for interacting with Manifold Markets prediction markets. This server enables LLMs and other AI systems to seamlessly interact with prediction markets, enabling collective intelligence and decision-making through market mechanisms.

## Features

- Search and filter prediction markets with advanced criteria
- Get detailed market information and analytics
- Place bets and limit orders with precise probability specifications
- Track user positions and portfolio performance
- Send mana between users
- Manage market liquidity
- Cancel and sell positions

## Installation

```bash
npm install manifold-mcp-server
```

## Configuration

The server requires a Manifold Markets API key for authenticated operations. You can get your API key from your Manifold Markets profile settings.

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

### get_user
Get user information by username:
- username: Username

### place_bet
Place a bet on a market:
- marketId: Market ID
- amount: Amount to bet in mana
- outcome: 'YES' or 'NO'
- limitProb: Optional limit order probability (0.01-0.99)

### cancel_bet
Cancel a limit order bet:
- betId: Bet ID to cancel

### sell_shares
Sell shares in a market:
- marketId: Market ID
- outcome: Which type of shares to sell ('YES' or 'NO', defaults to what you have)
- shares: How many shares to sell (defaults to all)

### add_liquidity
Add mana to market liquidity pool:
- marketId: Market ID
- amount: Amount of mana to add

### get_positions
Get user positions across markets:
- userId: User ID

### send_mana
Send mana to other users:
- toIds: Array of user IDs to send mana to
- amount: Amount of mana to send (min 10)
- message: Optional message to include

## Example: The Xenoduck Society's Quantum Navigation Dilemma

The Xenoduck Society of Restless Mind from the Pleiades Cluster uses prediction markets to make critical decisions about their interstellar ventures. Here's how they might use the Manifold MCP Server to gather collective intelligence about a new quantum navigation technology:

```typescript
// Search for relevant markets
const searchResponse = await use_mcp_tool({
  name: "search_markets",
  arguments: {
    term: "quantum navigation success probability",
    filter: "open",
    sort: "liquidity"
  }
});

// Get details of the most relevant market
const marketDetails = await use_mcp_tool({
  name: "get_market",
  arguments: {
    marketId: "quantum-nav-2024"
  }
});

// The Council of Elder Ducks places a bet
const betResponse = await use_mcp_tool({
  name: "place_bet",
  arguments: {
    marketId: "quantum-nav-2024",
    amount: 1000,
    outcome: "YES",
    limitProb: 0.75 // They're quite confident!
  }
});

// Junior Navigator Quacksworth adds liquidity
const liquidityResponse = await use_mcp_tool({
  name: "add_liquidity",
  arguments: {
    marketId: "quantum-nav-2024",
    amount: 500
  }
});

// Check the Society's positions
const positions = await use_mcp_tool({
  name: "get_positions",
  arguments: {
    userId: "xenoduck-society"
  }
});

// Reward successful predictions
const rewardResponse = await use_mcp_tool({
  name: "send_mana",
  arguments: {
    toIds: ["quacksworth", "elder-duck-1", "elder-duck-2"],
    amount: 100,
    message: "Thank you for your accurate quantum navigation predictions!"
  }
});
```

In this example, the Xenoduck Society uses prediction markets to:
1. Aggregate knowledge about quantum navigation technology
2. Allow experts to signal their confidence through bet sizes and limit orders
3. Maintain market efficiency through liquidity provision
4. Track their collective positions
5. Reward successful predictors

This demonstrates how prediction markets can help even advanced civilizations make better decisions through collective intelligence!

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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. We're particularly interested in:
- Additional market analysis tools
- Enhanced probability calibration features
- Integration with other prediction market platforms
- Improved documentation and examples

## License

MIT
