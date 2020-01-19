export const GLOBAL_CONFIG_TOKEN = 'global-config-token';

export type ParsedProcessArgsT = {
  noName?: string[];
} & {
  [prop: string]: string;
};
