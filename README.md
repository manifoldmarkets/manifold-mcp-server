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

## Example: The Cosmic Hole Research Institute's Grand Investigation

The Cosmic Hole Research Institute (CHRI) uses prediction markets to coordinate their groundbreaking research into the relationship between white holes and black holes. Here's how they leverage the Manifold MCP Server to aggregate knowledge and make decisions:

```typescript
// Search for markets related to white hole research
const searchResponse = await use_mcp_tool({
  name: "search_markets",
  arguments: {
    term: "white hole quantum emission detection 2024",
    filter: "open",
    sort: "liquidity"
  }
});

// Get details of the primary research market
const marketDetails = await use_mcp_tool({
  name: "get_market",
  arguments: {
    marketId: "white-hole-detection-2024"
  }
});

// Dr. Lumina, expert in white hole radiation, places a confident bet
const betResponse = await use_mcp_tool({
  name: "place_bet",
  arguments: {
    marketId: "white-hole-detection-2024",
    amount: 2000,
    outcome: "YES",
    limitProb: 0.85 // High confidence based on recent quantum readings
  }
});

// Dr. Void, black hole specialist, adds counter-evidence
const counterBet = await use_mcp_tool({
  name: "place_bet",
  arguments: {
    marketId: "white-hole-detection-2024",
    amount: 1500,
    outcome: "NO",
    limitProb: 0.40 // Skeptical based on gravitational data
  }
});

// The Institute's Quantum Computing Division provides market liquidity
const liquidityResponse = await use_mcp_tool({
  name: "add_liquidity",
  arguments: {
    marketId: "white-hole-detection-2024",
    amount: 1000 // Ensuring efficient price discovery
  }
});

// Check Dr. Lumina's current positions
const positions = await use_mcp_tool({
  name: "get_positions",
  arguments: {
    userId: "dr-lumina"
  }
});

// Dr. Lumina spots an error in their calculations
const cancelBet = await use_mcp_tool({
  name: "cancel_bet",
  arguments: {
    betId: "bet-42-lumina"
  }
});

// Dr. Void's theory gains support
const sellShares = await use_mcp_tool({
  name: "sell_shares",
  arguments: {
    marketId: "white-hole-detection-2024",
    outcome: "YES",
    shares: 100 // Reducing exposure to positive outcome
  }
});

// Get information about a new researcher
const userInfo = await use_mcp_tool({
  name: "get_user",
  arguments: {
    username: "quantum-theorist-alice"
  }
});

// Reward junior researchers for valuable insights
const rewardResponse = await use_mcp_tool({
  name: "send_mana",
  arguments: {
    toIds: ["junior-researcher-bob", "quantum-theorist-alice"],
    amount: 200,
    message: "Excellent analysis of quantum vacuum fluctuations near the event horizon!"
  }
});
```

In this cosmic scenario, the CHRI uses prediction markets to:
1. Track confidence in white hole detection
2. Allow experts to signal their beliefs through strategic betting
3. Maintain market efficiency through liquidity provision
4. Manage positions as new evidence emerges
5. Incentivize quality research and analysis

The market aggregates various theoretical perspectives:
- White hole radiation signatures
- Event horizon topology differences
- Quantum vacuum fluctuations
- Gravitational wave patterns
- Information preservation theories

This demonstrates how prediction markets can help coordinate complex scientific research and aggregate expert knowledge across multiple theoretical frameworks!

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
