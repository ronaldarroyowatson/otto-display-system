declare module "node:fs" {
  export const promises: {
    readFile(path: string, encoding: string): Promise<string>;
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    writeFile(path: string, data: string, encoding: string): Promise<void>;
  };
}

declare module "node:path" {
  const path: {
    resolve(...parts: string[]): string;
    dirname(filePath: string): string;
  };
  export default path;
}
