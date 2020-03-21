import * as assert from 'assert';
import { Agent } from 'egg';
import { ProviderConfig, SubscriberConfig } from '../typings/interface';
const { NacosNamingClient } = require('nacos');

export default class NacosNaming {
  private _nacosNamingClient;

  constructor(private agent: Agent) {}

  get nacosNamingClient() {
    return this._nacosNamingClient;
  }

  public async createClient() {
    const { nacos } = this.agent.config;
    assert(nacos.serverList && nacos.serverList.length > 0, 'Nacos serverList不能为空');

    this._nacosNamingClient = new NacosNamingClient({
      ...nacos,
      logger: this.agent.logger,
    });
    await this._nacosNamingClient.ready();
    this.registerEvents();
    return this._nacosNamingClient;
  }

  public async registerProviders() {
    const { nacos } = this.agent.config;
    // 注册服务
    if (nacos.providers) {
      const providers = Object.values(nacos.providers) as ProviderConfig[];
      providers.forEach(async service => {
        await this._nacosNamingClient.registerInstance(
          service.serviceName,
          {
            ...service.instance,
          },
          service.groupName,
        );
      });
    }
  }

  public async registerSubscribers() {
    const { nacos } = this.agent.config;
    // 订阅服务
    if (nacos.subscribers) {
      const subscribers = Object.values(nacos.subscribers) as SubscriberConfig[];
      subscribers.forEach(service => {
        this._nacosNamingClient.subscribe(service.serviceName, hosts => {
          this.agent.logger.info(`[egg-nacos] New service detected: ${JSON.stringify(hosts)}`);
        });
      });
    }
  }

  public async deregisterProviders() {
    const { nacos } = this.agent.config;
    if (nacos.providers) {
      const providers = Object.values(nacos.providers) as ProviderConfig[];
      providers.forEach(async service => {
        await this._nacosNamingClient.deregisterInstance(
          service.serviceName,
          {
            ...service.instance,
          },
          service.groupName,
        );
      });
    }
  }

  public async deregisterSubscribers() {
    const { nacos } = this.agent.config;
    if (nacos.subscribers) {
      const subscribers = Object.values(nacos.subscribers) as SubscriberConfig[];
      subscribers.forEach(service => {
        this._nacosNamingClient.unSubscribe(service.serviceName, () => {});
      });
    }
  }

  private registerEvents() {
    this.agent.messenger.on('getServerStatus', async ({ eventId }) => {
      let error = null;
      let status = 'DOWN';
      try {
        status = await this._nacosNamingClient.getServerStatus();
      } catch (err) {
        error = err;
      }
      this.agent.messenger.sendToApp(eventId, {
        error,
        status,
      });
    });

    this.agent.messenger.on(
      'getAllInstances',
      async ({
        eventId,
        params,
      }) => {
        let error = null;
        let hosts = [];
        const { serviceName, groupName, clusters, subscribe } = params;
        try {
          hosts = await this._nacosNamingClient.getAllInstances(serviceName, groupName, clusters, subscribe);
        } catch (err) {
          error = err;
        }
        this.agent.messenger.sendToApp(eventId, {
          error,
          hosts,
        });
      },
    );

    this.agent.messenger.on(
      'selectInstances',
      async ({
        eventId,
        params,
      }) => {
        let error = null;
        let hosts = [];
        const { serviceName, groupName, clusters, healthy, subscribe } = params;
        try {
          hosts = await this._nacosNamingClient.selectInstances(
            serviceName,
            groupName,
            clusters,
            healthy,
            subscribe,
          );
        } catch (err) {
          error = err;
        }
        this.agent.messenger.sendToApp(eventId, {
          error,
          hosts,
        });
      },
    );
  }
}
