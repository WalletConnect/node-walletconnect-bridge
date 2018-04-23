export default class RSMQQueue {
  constructor(redisClient, queue) {
    this.redisClient = redisClient
    this.publishClient = redisClient
    this.subscribeClient = redisClient.duplicate()

    this._queue = queue
    this.queue = `redismq:${queue}`
    this.subscribers = []

    // bind methods
    this._checkMessage = this._checkMessage.bind(this)
    this._onMessage = this._onMessage.bind(this)
  }

  start() {
    // check message
    this._checkMessage()
  }

  publish(data) {
    let message = data instanceof Object ? JSON.stringify(data) : data
    return this.publishClient.lpushAsync(this.queue, message)
  }

  bulkPublish(arr = []) {
    const multi = this.publishClient.multi()
    arr.forEach(data => {
      const message = data instanceof Object ? JSON.stringify(data) : data
      multi.lpush(this.queue, message)
    })
    return multi.execAsync()
  }

  subscribe(fn) {
    if (!fn) return
    this.subscribers.push(fn)
  }

  unsubscribe(fn) {
    if (!fn) return
    var index = this.subscribers.indexOf(fn)
    if (index > -1) {
      this.subscribers.splice(index, 1)
    }
  }

  _checkMessage() {
    return (
      this.subscribeClient
        // wait forever
        .brpopAsync(this.queue, 0)
        .then(msg => {
          if (msg && msg.length > 0) {
            this._onMessage(msg[1])
          }

          // check message again
          setTimeout(() => {
            this._checkMessage()
          }, 0)
        })
        .catch(err => {
          if (err && err.code === 'NR_CLOSED') {
          } else {
            console.log(err)
          }
        })
    )
  }

  _onMessage(msg) {
    let subscribers = this.subscribers || []
    subscribers.forEach(subscriber => {
      let m = msg
      setTimeout(() => {
        try {
          subscriber(JSON.parse(m))
        } catch (e) {
          console.log('Parsing error')
        }
      }, 0)
    })
  }

  stop() {
    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout)
      this.checkTimeout = null
    }

    // quit subscribe client
    return this.subscribeClient.quitAsync()
  }
}
