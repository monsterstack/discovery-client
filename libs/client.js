'use strict';

const DEFAULT_ADDR = "http://localhost:7616";

const socketIOClient = require('socket.io-client');
/**
 * Discovery Client
 */
class DiscoveryClient {
  constructor(socket) {
    this.socket = socket;
  }

  /**
   * Handle Disconnect
   */
  onDisconnect(handler) {
    this.socket.on('disconnect', handler);
  }

  /**
   * Clear handlers
   */
  clearHandlers() {
    if(this.queryHandler) {
      this.socket.removeListener('service.added', this.queryHandler.added);
      this.socket.removeListener('service.removed', this.queryHandler.removed);
      this.socket.removeListener('service.updated', this.queryHandler.updated);
      this.socket.removeListener('service.init', this.queryHandler.init);
    }
  }

  /**
   * Query for Changes to services.
   */
  query(me, types, resultHandler) {
    this.queryHandler = resultHandler;
    console.log(`Performing query for types ${types}`);
    console.log('Init');
    this.socket.emit('services:init', { descriptor: me, types: types });
    console.log('Subscribe');
    this.socket.emit('services:subscribe', { types: types });

    let handler;
    if(resultHandler) {
      handler = resultHandler;

      // Setup
      console.log('Listening for changes');
      this.socket.on('service.added', handler.added);
      this.socket.on('service.removed', handler.removed);
      this.socket.on('service.updated', handler.updated);
      this.socket.on('service.init', handler.init);
    } else {
      console.log("*********** Missing handler **************");
    }

  }
}

/**
 * Connect to Discovery Service
 * @TODO: Need a way to deal with failover.  Perhaps we
 * Access this service through Load Balancer.  Another option is to
 * see if we can support multiple host addresses.
 * Leaning towards LB for simplicity of development effort.
 */
const connect = (options, callback) => {
    let host = options.addr || 'http://localhost:7616';
    let socket = socketIOClient(host);
    let client = new DiscoveryClient(socket);

    client.onDisconnect(() => {
      console.log('Bye Bye Connection');
      client.clearHandlers();
    });

    socket.on('connect', (conn) => {
      // socket.emit('authentication', {});
      // socket.on('authenticated', () => {
      //   callback(null, client);
      // });
      // socket.on('unauthorized', (err) => {
      //   callback(err);
      // });
      callback(null, client);
    });
}

// Public
module.exports.connect = connect;
