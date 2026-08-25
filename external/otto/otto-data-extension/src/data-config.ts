export type DataExtensionConfig = {
  workspacePath: string;
  mempalaceRoot: string;
  enabled: boolean;
};

export function buildDefaultDataConfig(workspacePath: string, mempalaceRoot: string): DataExtensionConfig {
  return {
    workspacePath,
    mempalaceRoot,
    enabled: true
  };
}
