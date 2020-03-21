import { ClientOptions } from 'nacos';
export interface ProviderConfig {
    serviceName: string;
    instance: {
        ip: string;
        port: number;
        [props: string]: any;
    };
    groupName: string;
}
export interface SubscriberConfig {
    serviceName: string;
}
export interface ConfigEntity {
    dataId: string;
    groupName: string;
    options?: {
        unit?: string;
    };
}
export interface NacosConfig {
    serverList: string[];
    namespace: string;
    configCenter?: {
        clientOptions: ClientOptions;
        configList: {
            [props: string]: ConfigEntity;
        };
    };
    subscribers?: {
        [props: string]: SubscriberConfig;
    };
    providers?: {
        [props: string]: ProviderConfig;
    };
    [props: string]: any;
}
export interface NacosHost {
    valid: boolean;
    marked: boolean;
    metadata: object;
    instanceId: string;
    port: number;
    healthy: boolean;
    ip: string;
    clusterName: string;
    weight: number;
    ephemeral: boolean;
    serviceName: string;
    enabled: boolean;
    [props: string]: any;
}
export interface ForgedNacos {
    getRandomInstance(serviceName: string, groupName?: string, clusters?: string, subscribe?: boolean): Promise<NacosHost>;
    selectRandomInstance(serviceName: string, groupName?: string, clusters?: string, healthy?: boolean, subscribe?: boolean): Promise<NacosHost>;
    getAllInstances(serviceName: string, groupName?: string, clusters?: string, subscribe?: boolean): Promise<NacosHost[]>;
    selectInstances(serviceName: string, groupName?: string, clusters?: string, healthy?: boolean, subscribe?: boolean): Promise<NacosHost[]>;
    getServerStatus(): Promise<'UP' | 'DOWN'>;
}
