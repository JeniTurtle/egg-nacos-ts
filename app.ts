import { Application, IBoot } from 'egg';
import NacosClient from './lib/nacosClient';
import NacosConfig from './lib/nacosConfig';

export default class AppBoot implements IBoot {
  constructor(private app: Application) {}

  configWillLoad() {}

  async didLoad() {
    if (this.app.config.nacos?.serverList) {
      this.app.nacosNaming = new NacosClient(this.app);
    }
    if (this.app.config.nacos?.configCenter) {
      this.app.nacosConfig = new NacosConfig(this.app);
      await this.app.nacosConfig.createClient();
      // @ts-ignore
      process.on('SIGINT', () => {
        this.beforeClose();
      });
    }
  }

  async willReady() {}

  async didReady() {}

  async serverDidReady() {}

  async beforeClose() {
    this.app.nacosConfig.close();
  }
}
