declare module "node:fs" {
  export type Dirent = {
    name: string;
  };

  export function existsSync(path: string): boolean;
  export function readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
}

declare module "node:path" {
  export function resolve(path: string): string;
}