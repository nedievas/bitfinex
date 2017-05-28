var BFX = require('bitfinex-api-node')
  , _ = require('lodash')
  , path = require('path')
  , n = require('numbro')


module.exports = function container (get, set, clear) {
  var c = get('conf')

  var public_client, authed_client

  function publicClient () {
    if (!public_client) public_client = new BFX.APIRest()
    return public_client
  }

  function authedClient () {
    if (!authed_client) {
    if (!c.bitfinex.key || c.bitfinex.key === 'YOUR-API-KEY') {
      throw new Error('please configure your Bitfinex credentials in ' + path.resolve(__dirname, 'conf.js'))
    }
    authed_client = new BFX.APIRest(c.bitfinex.key, c.bitfinex.secret)
  }
  return authed_client
  }

  function joinProduct (product_id) {
    return product_id.split('-')[0] + '' + product_id.split('-')[1]
  }

  return {
    name: 'bitfinex',
//    historyScan: 'backward',
    makerFee: 0.1,

    getProducts: function () {
      return require('./products.json')
    },

    getTrades: function (opts, cb) {
      var client = publicClient()
      var args = joinProduct(opts.product_id)
/*
      var path = args.pair;
      if(opts.from)
        path += '?limit_trades=49999';

 if (opts.from) {
        args.start = opts.from
      }
      if (opts.to) {
        args.end = opts.to
      }
      if (args.start && !args.end) {
        // add 24 hours
        args.end = args.start + 86400
      }

      ****
      if (opts.from) {
        // move cursor into the future
        args.timestamp = opts.from
      }
*/
      client.trades(args, function (err, body) {
        if (err) return cb(err)
        var trades = body.map(function(trade) {
          return {
            trade_id: trade.tid,
            time: n(trade.timestamp).multiply(1000).value(),
            size: Number(trade.amount),
            price: Number(trade.price),
            side: trade.type
          }
        })
        cb(null, trades)
      })
    },

    getBalance: function (opts, cb) {
      var client = authedClient()
      client.wallet_balances(function (err, body) {
        if (err) return cb(err)
        var balance = {asset: 0, currency: 0}
        var accounts = _(body).filter(function (body) { return body.type === c.bitfinex.wallet }).forEach(function (account) {
          if (account.currency.toUpperCase() === opts.currency) {
            balance.currency = account.amount
            balance.currency_hold = (account.amount - account.available)
          }
          else if (account.currency.toUpperCase() === opts.asset) {
            balance.asset = account.amount
            balance.asset_hold = (account.amount - account.available)
          }
        })
        cb(null, balance)
      })
    },

    getQuote: function (opts, cb) {
      var client = publicClient()
      var pair = joinProduct(opts.product_id)
      client.ticker(pair, function (err, body) {
        if (err) return cb(err)
        cb(null, {bid: parseFloat(body.bid), ask: parseFloat(body.ask)})
      })
    },

    cancelOrder: function (opts, cb) {
      var client = authedClient()
      client.cancel_order(opts.order_id, function (err, body) {
        if (err) return cb(err)
        cb()
      })
    },

    buy: function (opts, cb) {
      var client = authedClient()
      if (c.bitfinex.wallet === 'exchange' && typeof opts.type === 'undefined') {
        opts.type = 'exchange limit'
      }
      else if (c.bitfinex.wallet === 'trading' && typeof opts.type === 'undefined') {
        opts.type = 'limit'
      }
      var symbol = joinProduct(opts.product_id)
      var amount = opts.size
      var price = opts.price
      var exchange = 'bitfinex'
      var side = 'buy'
      var type = opts.type
      var is_hidden = false
      var is_postonly = opts.post_only
      var params = {
        symbol,
        amount,
        price,
        exchange,
        side,
        type,
        is_hidden,
        is_postonly
      }
      client.make_request('order/new', params, function (err, body) {
        if (err && err.toString('Error: Invalid order: not enough exchange balance')) {
          var order = {
            status: 'rejected',
            reject_reason: 'balance'
          }
          return cb(null, order)
        }
        else if (body.is_live === true) {
          if (err) return cb(err)
          cb(null, body)
        }
      })
    },

    sell: function (opts, cb) {
      var client = authedClient()
      if (c.bitfinex.wallet === 'exchange' && typeof opts.type === 'undefined') {
        opts.type = 'exchange limit'
      }
      else if (c.bitfinex.wallet === 'trading' && typeof opts.type === 'undefined') {
        opts.type = 'limit'
      }
      var symbol = joinProduct(opts.product_id)
      var amount = opts.size
      var price = opts.price
      var exchange = 'bitfinex'
      var side = 'sell'
      var type = opts.type
      var is_hidden = false
      var is_postonly = opts.post_only
      var params = {
        symbol,
        amount,
        price,
        exchange,
        side,
        type,
        is_hidden,
        is_postonly
      }
      client.make_request('order/new', params, function (err, body) {
        if (err && err.toString('Error: Invalid order: not enough exchange balance')) {
          var order = {
            status: 'rejected',
            reject_reason: 'balance'
          }
          return cb(null, order)
        }
        else if (body.is_live === false) {
          cb(null, body)
        }
        if (err) return cb(err)
      })
    },

/*
	buy: function (opts, cb) {
	var args = [].slice.call(arguments)

	client.make_request('order/new', params, function (err, result) {
     if (typeof result.is_live === false) {
      return retry('trade', args)
    }
    var order = {
      id: result ? result.id : null,
      status: result.is_live ? true : false,
      price: opts.price,
      size: opts.size,
      post_only: !!opts.post_only,
      created_at: new Date().getTime(),
      filled_size: result.executed_amount ? '0.0' : result.original_amount
    }
    if (result && result.error === 'Unable to place post-only order at this price.') {
      order.status = 'rejected'
      order.reject_reason = 'post only'
      return cb(null, order)
    }
    else if (result && result.error && result.error.match(/^Not enough/)) {
      order.status = 'rejected'
      order.reject_reason = 'balance'
      return cb(null, order)
    }
    if (!err && result.error) {
      err = new Error('unable to ' + type)
      err.body = result
    }
    if (err) return cb(err)
//    orders['~' + result.id] = order
    cb(null, order)
  })
console.log(params)
	},
*/
    getOrder: function (opts, cb) {
//      var order = opts.order_id
      var client = authedClient()
      client.active_orders(function (err, body) {
        if (err) return cb(err)
      var active = false
      if (!body.forEach) {
        console.error('\nActive orders result:')
        console.error(body)
      }
      else {
        body.forEach(function (api_order) {
          if (api_order.id == opts.order_id) active = true
          })
        }
        if (!active) {
          order.status = 'done'
          order.done_at = n(api_order.timestamp).multiply(1000).value()
          return cb(null, order)
        }
        client.order_status(opts.order_id, function (err, order) {
        if (err || !body.forEach) return cb(null, order)
        order.filled_size = '0'
        body.forEach(function(trade) {
          order.filled_size = n(trade.executed_amount).format('0.00000000')
        })
        if (n(order.filled_size).value() == n(order.size).value()) {
          order.status = 'done'
          order.done_at = n(order.timestamp).multiply(1000).value()
        }
        cb(null, order)
      })
    })
  },


/*
    getOrder: function (opts, cb) {
      var client = authedClient()
      client.order_status(opts.order_id, function (err, body) {
        if (err) return cb(err)
        cb(null, body)
      })
//	    console.log(opts)
    },
*/

    // return the property used for range querying.
    getCursor: function (trade) {
      return trade.trade_id
    }
  }
}
