# egg-nacos-ts

基于nacos-sdk-nodejs开发的nacos插件。cluster模式下支持单实例注册，以及通过配置自动注册和监听服务。

#### 安装步骤：
```
npm install egg-nacos-ts
yarn add egg-nacos-ts
```

#### 配置方式：

修改eggjs项目中config/plugin.ts文件，开启egg-nacos-ts插件。

```typescript
// 示例代码
import { EggPlugin } from 'egg';

const plugin: EggPlugin = {
  nacos: {
    enable: true,
    package: 'egg-nacos-ts',
  },
};
export default plugin;
```

配置config/config.default.ts文件

```typescript
// 示例代码，具体配置项参考ts声明文件
config.nacos = {
  serverList: ['127.0.0.1:8848'],
  namespace: 'public',
  subscribers: {  // 需要监听的服务，不配置不监听
    messageService: {
      serviceName: 'message-service',
    },
  },
  configCenter: {  // 配置中心相关配置
    clientOptions: {},
    configList: {
      baseConfig: {
        dataId: 'test-config.yml',
        groupName: 'DEFAULT_GROUP',
      },
    },
  },
  providers: {
    accountService: {
      serviceName: 'account-service',
      instance: {
        ip: '127.0.0.1',
        port: 8874,
      },
      groupName: 'DEFAULT_GROUP',
    },
  },
};
```

#### 使用方式：

从nacos配置中心远程读取配置示例:

```typescript
// agent.ts
import { Agent } from 'egg';
import { saveNacosRemoteConfig } from './lib/configHandler';

export default class AgentBootHook {
  constructor(private readonly agent: Agent) {}

  async didReady() {
    // 把nacos远程配置保存到临时文件，供appWorker调用。
    await saveNacosRemoteConfig(this.agent);
  }
}
```

```typescript
// app.ts
import { Application, IBoot } from 'egg';
import { initNacosConfig } from './lib/configHandler';

export default class AppBoot implements IBoot {
  constructor(private app: Application) {}

  configWillLoad() {
    initNacosConfig(this.app);
  }

  async didReady() {}
  async beforeClose() {}
}
```

```typescript
// lib/configHandler.ts
import { Agent, EggApplication } from 'egg';
import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';
import * as YAML from 'yamljs';
import * as is from 'is-type-of';

// 临时写入的远程配置文件
export const nacosRuntimeFile = './run/nacos-remote-config.json';

/**
 * 使用字符串深度获取对象属性
 * @param object
 * @param path
 * @param defaultValue
 */
export const deepGet = (object, path, defaultValue?) => {
  return (
    (!Array.isArray(path)
      ? path
          .replace(/\[/g, '.')
          .replace(/\]/g, '')
          .split('.')
      : path
    ).reduce((o, k) => (o || {})[k], object) || defaultValue
  );
};

/**
 * 深度遍历配置文件，检查模板字段，并替换。
 * @param obj
 * @param cb
 */
export const depthSearch = (obj, config) => {
  const regular = /^\$\{(.*)+\}$/;
  for (const index in obj) {
    const item = obj[index];
    if (is.object(item)) {
      depthSearch(item, config);
    } else if (is.string(item) && regular.test(item)) {
      // console.log(item,  deepGet(config, temp[1], ''));
      const temp = item.match(regular);
      obj[index] = deepGet(config, temp[1], '');
    }
  }
};

/**
 * agentWorker获取nacos配置数据，
 * 写入到运行时文件中，供appWorker调用。
 * @param agent
 */
export const saveNacosRemoteConfig = async (agent: Agent) => {
  const { nacosConfig, config } = agent;
  try {
    const configs = await nacosConfig.getAllConfigs();
    if (configs.length < 1) {
      throw new Error('Nacos配置信息未找到');
    }
    const configData = YAML.parse(Object.values(configs[0])[0]);
    const tempConfigFile = path.join(agent.baseDir, nacosRuntimeFile);
    fs.writeFileSync(tempConfigFile, JSON.stringify(configData));
  } catch (err) {
    agent.logger.error(err);
    throw new Error('Nacos配置信息获取失败！');
  }
};

/**
 * 从临时文件中读取agentWorker保存的远程配置文件，
 * 并修改当前项目中的config文件。
 * @param app
 */
export const initNacosConfig = (app: EggApplication) => {
  const tempConfigFile = path.join(app.baseDir, nacosRuntimeFile);
  try {
    const content = fs.readFileSync(tempConfigFile);
    const remoteConfig = JSON.parse(content.toString());
    depthSearch(app.config, remoteConfig);
  } catch (err) {
    app.logger.error('nacos配置文件读取失败！');
    throw err;
  }
};
```

```typescript
// 示例配置 config.default.ts
config.typeorm = {
  clients: {
    accountDB: {
      type: 'postgres',
      host: '${database.host}', // 这里会用远程拿到的配置信息替换
      port: '${database.port}', // 这里会用远程拿到的配置信息替换
      username: '${database.username}', // 这里会用远程拿到的配置信息替换
      password: '${database.password}', // 这里会用远程拿到的配置信息替换
    },
  },
};
```
