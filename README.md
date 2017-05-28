# Bitfinex extension for Zenbot 4

## Quick-start

### 1. Requirements: Linux or OSX or Docker, [Node.js](https://nodejs.org/) and [MongoDB](https://www.mongodb.com/).

### 2. Install zenbot 4:

Run in your console,

```
git clone https://github.com/carlos8f/zenbot.git
```

Install dependencies:

```
cd zenbot
npm install
# optional, installs the `zenbot.sh` binary in /usr/local/bin:
npm link
```

### 3. Install Bitfinex extension:

```
cd extensions
git clone https://github.com/nedievas/bitfinex.git
cd bitfinex
npm install
```

Create your configuration file by copying `conf-sample.js` to `conf.js`:

```
cd ~/zenbot
cp conf-sample.js conf.js
```

- View and edit `conf.js`.
- It's possible to use zenbot in "paper trading" mode without making any changes.
- You must add your exchange API keys to enable real trading on Bitfinex. Paste this under `// Exchange API keys`:
```
// to enable Bitfinex trading, enter your API credentials:
c.bitfinex = {}
c.bitfinex.key = 'YOUR-API-KEY'
c.bitfinex.secret = 'YOUR-SECRET'
// May use 'exchange' or 'trading' wallet balances. However margin trading may not work...read
 the API documentation.
c.bitfinex.wallet = 'exchange'
```
- API keys do NOT need deposit/withdrawl permissions.

### 4. Run zenbot

The following command will launch the bot, and if you haven't touched `c.default_selector` in `conf.js`, will trade the default BTC/USD pair on GDAX. 

To make default exchange Bitfinex, change `c.selector = 'gdax.BTC-USD'` to `c.selector = 'bitfinex.BTC-USD'` 

```
zenbot trade [--paper]
```

Use the `--paper` flag to only perform simulated trades while watching the market.

Here's how to run a different selector (example: LTC-BTC on Bitfinex):

```
./zenbot trade bitfinex.ltc-btc
```
