import * as assert from 'assert';
import { Agent, Application } from 'egg';
import { NacosConfigClient } from 'nacos';
import { ConfigEntity } from '../typings/interface';

export default class NacosConfig {
  private _nacosConfigClient: NacosConfigClient;

  constructor(private worker: Agent | Application) {}

  get nacosConfigClient() {
    return this._nacosConfigClient;
  }

  public async createClient() {
    const { nacos } = this.worker.config;
    assert(nacos.serverList && nacos.serverList.length > 0, 'Nacos serverList不能为空');

    this._nacosConfigClient = new NacosConfigClient({
      serverAddr: nacos.serverList[0],
      namespace: nacos.namespace,
      ...nacos.configCenter.clientOptions,
    });
    await this._nacosConfigClient.ready();
    return this._nacosConfigClient;
  }

  public async getAllConfigs() {
    const { configCenter } = this.worker.config.nacos;
    if (!configCenter.configList) {
      return [];
    }
    const configList: ConfigEntity[] = Object.values(configCenter.configList);
    if (configList.length < 1) {
      return [];
    }
    const configNames: string[] = [];
    const asyncQueue: Array<Promise<any>> = [];
    for (const key in configCenter.configList) {
      configNames.push(key);
      const { dataId, groupName, options = {} } = configCenter.configList[key];
      asyncQueue.push(this._nacosConfigClient.getConfig(dataId, groupName, { ...options }));
    }
    const result: string[] = await Promise.all(asyncQueue);
    return configNames.map((name, index) => ({ [name]: result[index] }));
  }

  public close() {
    this._nacosConfigClient.close();
  }
}
