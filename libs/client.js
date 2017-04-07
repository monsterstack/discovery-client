'use strict';

const DEFAULT_ADDR = "http://localhost:7616";
const debug = require('debug')('discovery-client');
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
      this.socket.removeListener('services:sync', this.queryHandler.sync);

      this.socket.removeListener('force_sync', this.queryHandler.forceSync);
    }
  }

  /**
   * Query for Changes to services.
   */
  query(me, types, resultHandler) {
    this.queryHandler = resultHandler;
    debug(`Performing query for types ${types}`);
    this.sendInitReq(me, types);
    this.sendSubscribeReq(types);

    this.listenForChanges(resultHandler, types);
  }

  sendInitReq(me, types) {
    debug('Init');
    if (this.socket)
      this.socket.emit('services:init', { descriptor: me, types: types});
  }

  sendSubscribeReq(types) {
    debug('Subscribe');
    if (this.socket)
      this.socket.emit('services:subscribe', { types: types });
  }

  sendResponseTimeMetric(metric) {
    debug(metric);
    debug(`Metric ${metric.type} - ${metric.value}`);
    if (this.socket)
      this.socket.emit('services:metrics', metric);
  }

  sendOfflineStatus(serviceId) {
    debug(`Marking Service ${serviceId} as Offline`);
    if (this.socket)
      this.socket.emit('services:offline', { serviceId: serviceId});
  }

  listenForChanges(resultHandler, queryTypes) {
    let handler;
    if(resultHandler) {
      handler = resultHandler;

      // Setup
      debug('Listening for changes');
      this.socket.on('service.added', handler.added);
      this.socket.on('service.removed', handler.removed);
      this.socket.on('service.updated', handler.updated);
      this.socket.on('service.init', handler.init);

      handler.forceSync = () => {
        if(queryTypes && queryTypes.length > 0);
          this.socket.emit('services:sync', { query: { types: queryTypes} });
      };

      this.socket.on('force_sync', handler.forceSync);

      // Support Sync of Routing table
      this.socket.on('services:sync', handler.sync);
    } else {
      console.error("*********** Missing handler **************");
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
    let socket = socketIOClient(host, { transports: ["websocket"] } );
    let client = new DiscoveryClient(socket);

    client.onDisconnect(() => {
      debug('Bye Bye Connection');
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
