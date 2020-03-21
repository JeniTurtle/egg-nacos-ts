import { ForgedNacos } from './typings/interface';
import NacosNaming from './lib/nacosNaming';
import NacosConfig from './lib/nacosConfig'

declare module 'egg' {
  interface Agent {
    nacosNaming: NacosNaming;
    nacosConfig: NacosConfig;
  }
  interface Application {
    nacosNaming: ForgedNacos;
    nacosConfig: NacosConfig;
  }
}
