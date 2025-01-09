# Manifold Markets MCP Server

An MCP server for interacting with Manifold Markets prediction markets. This server enables MCP clients to seamlessly interact with prediction markets, enabling collective intelligence and decision-making through market mechanisms.

## Features

- Search and filter prediction markets with advanced criteria
- Get detailed market information and analytics
- Place bets and limit orders with precise probability specifications
- Track user positions and portfolio performance
- Send mana between users
- Manage market liquidity
- Cancel and sell positions

## Roadmap

- [x] Market search and filtering
- [x] Market details and analytics
- [x] User profile management
- [x] Bet placement with limit orders
- [x] Position management and cancellation
- [x] Share selling functionality
- [x] Portfolio tracking
- [x] Liquidity provision
- [x] Mana transfer system
- [x] Basic market statistics

Planned higher-order capabilities:
- [ ] Intelligent portfolio optimization and risk management
- [ ] Advanced market analysis with sentiment and correlations
- [ ] Social intelligence and expert network analysis

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- A Manifold Markets API key

## Installation

### 1. Install the package

```bash
npm install manifold-mcp-server
```

### 2. Get your API Key

1. Log in to [Manifold Markets](https://manifold.markets)
2. Go to your profile settings
3. Generate an API key

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

### 4. Verify Installation

After configuring, restart your Claude client and verify the server appears in the connected MCP servers list.

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

## Development

```bash
# Clone the repository
git clone https://github.com/bmorphism/manifold-mcp-server.git
cd manifold-mcp-server

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

## Error Handling

The server implements error handling for:
- Invalid parameters (type checking and validation)
- Missing or invalid API keys
- Network and API communication errors
- Unknown tool requests

Additional error handling is provided by the Manifold Markets API for specific market operations.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. We're particularly interested in:
- Additional market analysis tools
- Enhanced probability calibration features
- Integration with other prediction market platforms
- Improved documentation and examples

## Security Considerations

- API keys are handled securely through environment variables
- Input validation for all parameters
- Rate limiting protection
- Error messages don't expose sensitive information

## License

MIT
