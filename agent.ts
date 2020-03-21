import 'reflect-metadata';
import { Agent, IBoot } from 'egg';
import NacosNaming from './lib/nacosNaming';
import NacosConfig from './lib/nacosConfig';

export default class AgentBoot implements IBoot {
  private nacosNaming: NacosNaming;
  private nacosConfig: NacosConfig;

  constructor(private agent: Agent) {}

  configWillLoad() {}

  async didLoad() {
    this.nacosConfig = (this.agent.nacosConfig = new NacosConfig(this.agent));
    await this.nacosConfig.createClient();
  }

  async willReady() {
    this.nacosNaming = (this.agent.nacosNaming = new NacosNaming(this.agent));
    await this.nacosNaming.createClient();
  }

  async didReady() {}

  async serverDidReady() {
    // @ts-ignore
    process.on('SIGINT', () => {
      this.beforeClose();
    });
    await this.nacosNaming.registerSubscribers();
    await this.nacosNaming.registerProviders();
  }

  async beforeClose() {
    await this.nacosNaming.deregisterProviders();
    await this.nacosNaming.deregisterSubscribers();
  }
}
