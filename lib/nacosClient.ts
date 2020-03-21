import uuidV1 = require('uuid/v1');
import { Application } from 'egg';
import { ForgedNacos, NacosHost } from '../typings/interface';

export default class NacosClient implements ForgedNacos {
  constructor(private _app: Application) {}

  private getServerStatusProxy(cb: (err: Error | null, status: 'UP' | 'DOWN') => void) {
    const uuid = uuidV1();
    this._app.messenger.sendToAgent('getServerStatus', {
      eventId: uuid,
    });
    // 超时处理
    const timeout = setTimeout(() => {
      this._app.messenger.removeAllListeners(uuid);
      cb(new Error('Nacos getAllInstances failed!'), 'DOWN');
    }, 5000);
    this._app.messenger.once(uuid, ({ status, error }) => {
      clearTimeout(timeout);
      cb(error, status);
    });
  }

  private getAllInstancesProxy(
    serviceName: string,
    groupName: string,
    clusters: string,
    subscribe: boolean,
    cb: (err: Error | null, hosts: NacosHost[]) => void,
  ) {
    const uuid = uuidV1();
    this._app.messenger.sendToAgent('getAllInstances', {
      params: {
        serviceName,
        groupName,
        clusters,
        subscribe,
      },
      eventId: uuid,
    });
    // 超时处理
    const timeout = setTimeout(() => {
      this._app.messenger.removeAllListeners(uuid);
      cb(new Error('Nacos getAllInstances failed!'), []);
    }, 5000);
    this._app.messenger.once(uuid, ({ hosts, error }) => {
      clearTimeout(timeout);
      cb(error, hosts);
    });
  }

  private selectInstancesProxy(
    serviceName: string,
    groupName: string,
    clusters: string,
    healthy: boolean,
    subscribe: boolean,
    cb: (err: Error | null, hosts: NacosHost[]) => void,
  ) {
    const uuid = uuidV1();
    this._app.messenger.sendToAgent('selectInstances', {
      params: {
        serviceName,
        groupName,
        clusters,
        healthy,
        subscribe,
      },
      eventId: uuid,
    });
    // 超时处理
    const timeout = setTimeout(() => {
      this._app.messenger.removeAllListeners(uuid);
      cb(new Error('Nacos getAllInstances failed!'), []);
    }, 5000);
    this._app.messenger.once(uuid, ({ hosts, error }) => {
      clearTimeout(timeout);
      cb(error, hosts);
    });
  }

  async getServerStatus(): Promise<'UP' | 'DOWN'> {
    return await new Promise((resolve, reject) => {
      this.getServerStatusProxy((error: Error | null, status: 'UP' | 'DOWN') => {
        if (error) {
          this._app.logger.error(error);
          reject(error);
        } else {
          if (!status) {
            const err = new Error('Nacos服务状态查询失败');
            this._app.logger.error(err);
            reject(err);
          } else {
            resolve(status);
          }
        }
      });
    });
  }

  async getAllInstances(
    serviceName: string,
    groupName = 'DEFAULT_GROUP',
    clusters = '',
    subscribe = true,
  ): Promise<NacosHost[]> {
    return await new Promise((resolve, reject) => {
      this.getAllInstancesProxy(
        serviceName,
        groupName,
        clusters,
        subscribe,
        (error: Error | null, hosts: NacosHost[]) => {
          if (error) {
            this._app.logger.error(error);
            reject(error);
          } else {
            if (!hosts || hosts.length === 0) {
              const err = new Error(`服务[${serviceName}]未找到，请重试`);
              this._app.logger.error(err);
              reject(err);
            } else {
              resolve(hosts);
            }
          }
        },
      );
    });
  }

  async selectInstances(
    serviceName: string,
    groupName = 'DEFAULT_GROUP',
    clusters = '',
    healthy = true,
    subscribe = true,
  ): Promise<NacosHost[]> {
    return await new Promise((resolve, reject) => {
      this.selectInstancesProxy(
        serviceName,
        groupName,
        clusters,
        healthy,
        subscribe,
        (error: Error | null, hosts: NacosHost[]) => {
          if (error) {
            this._app.logger.error(error);
            reject(error);
          } else {
            if (!hosts || hosts.length === 0) {
              const err = new Error(`服务[${serviceName}]未找到，请重试`);
              this._app.logger.error(err);
              reject(err);
            } else {
              resolve(hosts);
            }
          }
        },
      );
    });
  }

  async selectRandomInstance(
    serviceName: string,
    groupName = 'DEFAULT_GROUP',
    clusters = '',
    healthy = true,
    subscribe = true,
  ) {
    const hosts = await this.selectInstances(serviceName, groupName, clusters, healthy, subscribe);
    return this.weightRandom(hosts);
  }

  async getRandomInstance(serviceName: string, groupName = 'DEFAULT_GROUP', clusters = '', subscribe = true) {
    const hosts = await this.getAllInstances(serviceName, groupName, clusters, subscribe);
    return this.weightRandom(hosts);
  }

  private weightRandom(list: NacosHost[]) {
    const randomList: NacosHost[] = [];
    for (const i in list) {
      const item = list[i];
      if (!item.weight) {
        item.weight = 1;
      }
      for (let j = 0; j < item.weight; j++) {
        randomList.push(item);
      }
    }
    return randomList[Math.floor(Math.random() * randomList.length)];
  }
}
