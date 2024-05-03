import fse from 'fs-extra';
import { sep, join } from 'node:path';
import { SRC_DIR, getVantConfig } from './constant.js';
import { type InlineConfig, loadConfigFromFile, mergeConfig } from 'vite';

const { lstatSync, existsSync, readdirSync, readFileSync, outputFileSync } =
  fse;

export const EXT_REGEXP = /\.\w+$/;
export const SFC_REGEXP = /\.(vue)$/;
export const DEMO_REGEXP = new RegExp(`\\${sep}demo$`);
export const TEST_REGEXP = new RegExp(`\\${sep}test$`);
export const ASSET_REGEXP = /\.(png|jpe?g|gif|webp|ico|jfif|svg|woff2?|ttf)$/i;
export const STYLE_REGEXP = /\.(css|less|scss)$/;
export const SCRIPT_REGEXP = /\.(js|ts|jsx|tsx)$/;
export const JSX_REGEXP = /\.(j|t)sx$/;
export const ENTRY_EXTS = ['js', 'ts', 'tsx', 'jsx', 'vue'];

export function removeExt(path: string) {
  return path.replace('.js', '');
}

export function replaceExt(path: string, ext: string) {
  return path.replace(EXT_REGEXP, ext);
}

export function hasExportOrDefineOptions(code: string) {
  return (
    code.includes('export default') ||
    code.includes('export { default }') ||
    code.includes('defineOptions')
  );
}

export function getComponents() {
  const EXCLUDES = ['.DS_Store'];
  const dirs = readdirSync(SRC_DIR);

  return dirs
    .filter((dir) => !EXCLUDES.includes(dir))
    .filter((dir) =>
      ENTRY_EXTS.some((ext) => {
        const path = join(SRC_DIR, dir, `index.${ext}`);
        if (existsSync(path)) {
          return hasExportOrDefineOptions(readFileSync(path, 'utf-8'));
        }

        return false;
      }),
    );
}

export const isDir = (dir: string) => lstatSync(dir).isDirectory();
export const isDemoDir = (dir: string) => DEMO_REGEXP.test(dir);
export const isTestDir = (dir: string) => TEST_REGEXP.test(dir);
export const isAsset = (path: string) => ASSET_REGEXP.test(path);
export const isSfc = (path: string) => SFC_REGEXP.test(path);
export const isStyle = (path: string) => STYLE_REGEXP.test(path);
export const isScript = (path: string) => SCRIPT_REGEXP.test(path);
export const isJsx = (path: string) => JSX_REGEXP.test(path);

const camelizeRE = /-(\w)/g;
const pascalizeRE = /(\w)(\w*)/g;

export function camelize(str: string): string {
  return str.replace(camelizeRE, (_, c) => c.toUpperCase());
}

export function pascalize(str: string): string {
  return camelize(str).replace(
    pascalizeRE,
    (_, c1, c2) => c1.toUpperCase() + c2,
  );
}

export function decamelize(str: string, sep = '-') {
  return str
    .replace(/([a-z\d])([A-Z])/g, `$1${sep}$2`)
    .replace(/([A-Z])([A-Z][a-z\d]+)/g, `$1${sep}$2`)
    .toLowerCase();
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

export type ModuleEnv = 'esmodule' | 'commonjs';
export type NodeEnv = 'production' | 'development' | 'test';
export type BuildTarget = 'site' | 'package';

export function setModuleEnv(value: ModuleEnv) {
  process.env.BABEL_MODULE = value;
}

export function setNodeEnv(value: NodeEnv) {
  process.env.NODE_ENV = value;
}

export function setBuildTarget(value: BuildTarget) {
  process.env.BUILD_TARGET = value;
}

export function isDev() {
  return process.env.NODE_ENV === 'development';
}

// smarter outputFileSync
// skip output if file content unchanged
export function smartOutputFile(filePath: string, content: string) {
  if (existsSync(filePath)) {
    const previousContent = readFileSync(filePath, 'utf-8');

    if (previousContent === content) {
      return;
    }
  }

  outputFileSync(filePath, content);
}

export async function mergeCustomViteConfig(
  config: InlineConfig,
  mode: 'production' | 'development',
): Promise<InlineConfig> {
  const vantConfig = getVantConfig();
  const configureVite = vantConfig.build?.configureVite;

  const userConfig = await loadConfigFromFile(
    {
      mode,
      command: mode === 'development' ? 'serve' : 'build',
    },
    undefined,
    process.cwd(),
  );

  if (configureVite) {
    const ret = configureVite(config);
    if (ret) {
      config = ret;
    }
  }

  if (userConfig) {
    return mergeConfig(config, userConfig.config);
  }

  return config;
}

export { getVantConfig };
