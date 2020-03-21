import { address } from 'ip';
import { EggAppConfig, PowerPartial } from 'egg';
import { NacosConfig } from '../typings/interface';

export default () => {
  const config = {} as PowerPartial<EggAppConfig>;

  config.nacos = {
    namespace: 'public',
    subscribers: {},
    configCenter: {},
    providers: {},
  } as NacosConfig;

  return config;
};
