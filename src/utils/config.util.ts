import * as fs from 'fs';
import * as os from 'os';
import { defaultsDeep, set } from 'lodash';
import path from 'path';
import yaml from 'yaml';
import { DatabaseType } from 'typeorm';

import { LogLevel } from './logger.util';
import { PartialDeep } from '@/utils/type.util';

/**
 * Config definition
 *
 * if you want to add a new config, follow the steps below:
 * 1. add the config to the Config definition
 * 2. add the config default value to the defaultConfig
 * 3. add the config env name to the envConfigMap
 */
export interface Config {
  app: AppConfig;
  dataSource: DataSourceConfig;
  redis: RedisConfig;
}

export interface AppConfig {
  port: number;
  logLevel: LogLevel;
  workerCount: number;
}

export interface DataSourceConfig {
  type: DatabaseType;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  schema?: string;
  storage?: string;
}

export interface RedisConfig {
  url: string;
}

export interface CacheConfig {
  redisUrl?: string;
}

const defaultConfig: Config = {
  app: {
    port: 8081,
    logLevel: LogLevel.debug,
    workerCount: os.cpus().length,
  },
  dataSource: {
    type: 'sqlite',
    host: '',
    port: 0,
    username: '',
    password: '',
    database: 'data.sqlite',
    schema: 'public',
  },
  redis: {
    url: 'redis://localhost:6379/0',
  },
};

const envConfigMap: Record<string, string> = {
  APP_PORT: 'app.port',
  APP_LOG_LEVEL: 'app.logLevel',
  APP_WORKER_COUNT: 'app.workerCount',

  DATA_SOURCE_TYPE: 'dataSource.type',
  DATA_SOURCE_HOST: 'dataSource.host',
  DATA_SOURCE_PORT: 'dataSource.port',
  DATA_SOURCE_USERNAME: 'dataSource.username',
  DATA_SOURCE_PASSWORD: 'dataSource.password',
  DATA_SOURCE_DATABASE: 'dataSource.database',
  DATA_SOURCE_SCHEMA: 'dataSource.schema',

  REDIS_URL: 'redis.url',
};

let computedConfig: Config | undefined = undefined;

function parseConfigFromFile(filepath: string): PartialDeep<Config> {
  const ext = path.extname(filepath);
  const configStr = fs.readFileSync(filepath).toString();
  switch (ext) {
    case '.json': {
      return JSON.parse(configStr);
    }
    case '.yaml':
    case '.yml': {
      return yaml.parse(configStr);
    }
    default:
      break;
  }
  return {};
}

function parseConfigFromEnv(): PartialDeep<Config> {
  const parsed: PartialDeep<Config> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key in envConfigMap) {
      const path = envConfigMap[key];
      if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
        set(parsed, path, value === 'true');
      } else if (!Number.isNaN(Number.parseInt(value))) {
        set(parsed, path, Number.parseInt(value));
      } else {
        set(parsed, path, value);
      }
    }
  }
  return parsed;
}

function loadConfig(): Config {
  let fileConfig: PartialDeep<Config> = {};
  const envConfig = parseConfigFromEnv();
  if (fs.existsSync(process.env.CONFIG_FILE)) {
    fileConfig = parseConfigFromFile(process.env.CONFIG_FILE);
  } else if (fs.existsSync('appconfig.yaml')) {
    fileConfig = parseConfigFromFile('appconfig.yaml');
  } else if (fs.existsSync('appconfig.yml')) {
    fileConfig = parseConfigFromFile('appconfig.yml');
  } else if (fs.existsSync('appconfig.json')) {
    fileConfig = parseConfigFromFile('appconfig.json');
  }
  computedConfig = defaultsDeep(envConfig, fileConfig, defaultConfig);
  return computedConfig;
}

export function useConfig(): Config {
  return computedConfig ?? loadConfig();
}
