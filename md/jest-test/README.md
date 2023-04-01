---
highlight: darcula
theme: smartblue
---


# 跟着 vant4 源码学习如何用 vue3 + ts 开发一个 loading 组件

本文为稀土掘金技术社区首发签约文章，14天内禁止转载，14天后未获授权禁止转载，侵权必究！

## 1. 前言

大家好，我是[若川](https://lxchuan12.gitee.io)。我倾力持续组织了一年[每周大家一起学习200行左右的源码共读活动](https://juejin.cn/post/7079706017579139102)，感兴趣的可以[点此扫码加我微信 `ruochuan12` 参与](https://juejin.cn/pin/7005372623400435725)。另外，想学源码，极力推荐关注我写的专栏[《学习源码整体架构系列》](https://juejin.cn/column/6960551178908205093)，目前是掘金关注人数（4.1k+人）第一的专栏，写有20余篇源码文章。

我们开发业务时经常会使用到组件库，一般来说，很多时候我们不需要关心内部实现。但是如果希望学习和深究里面的原理，这时我们可以分析自己使用的组件库实现。有哪些优雅实现、最佳实践、前沿技术等都可以值得我们借鉴。

相比于原生 `JS` 等源码。我们或许更应该学习，正在使用的组件库的源码，因为有助于帮助我们写业务和写自己的组件。

如果是 `Vue` 技术栈，开发移动端的项目，大多会选用 `vant` 组件库，目前（2022-10-31） `star` 多达 `20.4k`。我们可以挑选 `vant` 组件库学习，我会写一个[组件库源码系列专栏](https://juejin.cn/column/7140264842954276871)，欢迎大家关注。

第一篇是：[vant 4 即将正式发布，支持暗黑主题，那么是如何实现的呢](https://juejin.cn/post/7158239404484460574)

第二篇是：[跟着 vant4 源码学习如何用 vue3+ts 开发一个 loading 组件，仅88行代码](https://juejin.cn/post/7160465286036979748)。

学完本文，你将学到：

```bash
1. 学会如何用 vue3 + ts 开发一个 loading 组件
2. 学会使用 vue-devtools 打开组件文件，并可以学会其原理
3. 学会使用 @vue/babel-plugin-jsx 编写 jsx 组件
4. 等等
```

## 2. 准备工作

看一个开源项目，第一步应该是先看 [README.md](https://github.com/youzan/vant) 再看贡献文档 [github/CONTRIBUTING.md](https://github.com/youzan/vant/blob/main/.github/CONTRIBUTING.md)。

### 2.1 克隆源码 && 跑起来

You will need [Node.js >= 14](https://nodejs.org) and [pnpm](https://pnpm.io).

```bash
# 推荐克隆我的项目
git clone https://github.com/lxchuan12/vant-analysis
cd vant-analysis/vant

# 或者克隆官方仓库
git clone git@github.com:vant-ui/vant.git
cd vant

# 安装依赖，会运行所有 packages 下仓库的 pnpm i 钩子 pnpm prepare 和 pnpm i
pnpm i

# Start development
pnpm dev
```

我们先来看 `pnpm dev` 最终执行的什么命令。

`vant` 项目使用的是 `monorepo` 结构。查看根路径下的 `package.json`。

`vant/package.json => "test": "pnpm --dir ./packages/vant test"`
`vant/packages/vant/package.json` => "test": "vant-cli test"`

`pnpm test` 最终执行的是：`vant-cli test` 执行测试用例。本文主要是学习 [loading 组件](https://vant-contrib.gitee.io/vant/v4/#/zh-CN/loading) 的实现，所以我们就不深入 `vant-cli dev` 命令了。

## vant test


```js
import { Command } from 'commander';

import { cliVersion } from './index.js';

const program = new Command();

program.version(`@vant/cli ${cliVersion}`);

program
  .command('test')
  .description('Run unit tests through jest')
  .option(
    '--watch',
    'Watch files for changes and rerun tests related to changed files'
  )
  .action(async (options) => {
    const { test } = await import('./commands/jest.js');
    return test(options);
  });
```

## 

```js
import jest from 'jest';
import { setNodeEnv } from '../common/index.js';
import { genPackageEntry } from '../compiler/gen-package-entry.js';
import {
  ROOT,
  JEST_CONFIG_FILE,
  PACKAGE_ENTRY_FILE,
} from '../common/constant.js';
import type { Config } from '@jest/types';

export function test(command: Config.Argv) {
  setNodeEnv('test');

  genPackageEntry({
    outputPath: PACKAGE_ENTRY_FILE,
  });

  const config = {
    rootDir: ROOT,
    watch: command.watch,
    debug: command.debug,
    config: JEST_CONFIG_FILE,
    runInBand: command.runInBand,
    clearCache: command.clearCache,
    changedSince: command.changedSince,
    logHeapUsage: command.logHeapUsage,
    // make jest tests faster
    // see: https://ivantanev.com/make-jest-faster/
    maxWorkers: '50%',
  } as Config.Argv;

  jest
    .runCLI(config, [ROOT])
    .then((response) => {
      if (!response.results.success && !command.watch) {
        process.exit(1);
      }
    })
    .catch((err) => {
      console.log(err);

      if (!command.watch) {
        process.exit(1);
      }
    });
}

```


### 主入口

```js
import './plugin';
import Locale from '../src/locale';
import enUS from '../src/locale/lang/en-US';

Locale.use('en-US', enUS);

// promisify setTimeout
export function later(delay = 0): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

export * from './dom';
export * from './event';
export { mount } from '@vue/test-utils';
```

### plugin

```js
import { nextTick } from 'vue';
import { trigger } from './event';

function mockHTMLElementOffset() {
  Object.defineProperties(HTMLElement.prototype, {
    offsetParent: {
      get() {
        return this.parentNode || {};
      },
    },
    offsetLeft: {
      get() {
        return parseFloat(window.getComputedStyle(this).marginLeft) || 0;
      },
    },
    offsetTop: {
      get() {
        return parseFloat(window.getComputedStyle(this).marginTop) || 0;
      },
    },
    offsetHeight: {
      get() {
        return parseFloat(window.getComputedStyle(this).height) || 100;
      },
    },
    offsetWidth: {
      get() {
        return parseFloat(window.getComputedStyle(this).width) || 100;
      },
    },
  });
}

export function mockScrollIntoView() {
  const fn = jest.fn();
  Element.prototype.scrollIntoView = fn;
  return fn;
}

export function mockGetBoundingClientRect(rect: Partial<DOMRect>): () => void {
  const spy = jest.spyOn(Element.prototype, 'getBoundingClientRect');
  spy.mockReturnValue(rect as DOMRect);
  return () => spy.mockRestore();
}

export async function mockScrollTop(value: number) {
  Object.defineProperty(window, 'scrollTop', { value, writable: true });
  trigger(window, 'scroll');
  return nextTick();
}

mockScrollIntoView();
mockHTMLElementOffset();
mockGetBoundingClientRect({
  width: 100,
  height: 100,
  top: 0,
  left: 0,
  right: 100,
  bottom: 100,
});

```

### dom


```js
import { nextTick } from 'vue';
import { trigger } from './event';

function mockHTMLElementOffset() {
  Object.defineProperties(HTMLElement.prototype, {
    offsetParent: {
      get() {
        return this.parentNode || {};
      },
    },
    offsetLeft: {
      get() {
        return parseFloat(window.getComputedStyle(this).marginLeft) || 0;
      },
    },
    offsetTop: {
      get() {
        return parseFloat(window.getComputedStyle(this).marginTop) || 0;
      },
    },
    offsetHeight: {
      get() {
        return parseFloat(window.getComputedStyle(this).height) || 100;
      },
    },
    offsetWidth: {
      get() {
        return parseFloat(window.getComputedStyle(this).width) || 100;
      },
    },
  });
}

export function mockScrollIntoView() {
  const fn = jest.fn();
  Element.prototype.scrollIntoView = fn;
  return fn;
}

export function mockGetBoundingClientRect(rect: Partial<DOMRect>): () => void {
  const spy = jest.spyOn(Element.prototype, 'getBoundingClientRect');
  spy.mockReturnValue(rect as DOMRect);
  return () => spy.mockRestore();
}

export async function mockScrollTop(value: number) {
  Object.defineProperty(window, 'scrollTop', { value, writable: true });
  trigger(window, 'scroll');
  return nextTick();
}

mockScrollIntoView();
mockHTMLElementOffset();
mockGetBoundingClientRect({
  width: 100,
  height: 100,
  top: 0,
  left: 0,
  right: 100,
  bottom: 100,
});

```

### event

```js
import { ComponentPublicInstance, nextTick } from 'vue';
import { VueWrapper, DOMWrapper } from '@vue/test-utils';

function getTouch(el: Element | Window, x: number, y: number) {
  return {
    identifier: Date.now(),
    target: el,
    pageX: x,
    pageY: y,
    clientX: x,
    clientY: y,
    radiusX: 2.5,
    radiusY: 2.5,
    rotationAngle: 10,
    force: 0.5,
  };
}

// Trigger pointer/touch event
export function trigger(
  wrapper:
    | VueWrapper<ComponentPublicInstance<any, any, any>>
    | DOMWrapper<Element>
    | Element
    | Window,
  eventName: string,
  x = 0,
  y = 0,
  options: any = {}
) {
  const el = 'element' in wrapper ? wrapper.element : wrapper;
  const touchList = options.touchList || [getTouch(el, x, y)];

  if (options.x || options.y) {
    touchList.push(getTouch(el, options.x, options.y));
  }

  const event = document.createEvent('CustomEvent');
  event.initCustomEvent(eventName, true, true, {});

  Object.assign(event, {
    clientX: x,
    clientY: y,
    touches: touchList,
    targetTouches: touchList,
    changedTouches: touchList,
  });

  el.dispatchEvent(event);

  return nextTick();
}

// simulate drag gesture
export function triggerDrag(
  el:
    | VueWrapper<ComponentPublicInstance<any, any, any>>
    | DOMWrapper<Element>
    | HTMLElement,
  relativeX = 0,
  relativeY = 0
) {
  let x = relativeX;
  let y = relativeY;
  let startX = 0;
  let startY = 0;
  if (relativeX < 0) {
    startX = Math.abs(relativeX);
    x = 0;
  }
  if (relativeY < 0) {
    startY = Math.abs(relativeY);
    y = 0;
  }
  trigger(el, 'touchstart', startX, startY);
  trigger(el, 'touchmove', x / 4, y / 4);
  trigger(el, 'touchmove', x / 3, y / 3);
  trigger(el, 'touchmove', x / 2, y / 2);
  trigger(el, 'touchmove', x, y);
  trigger(el, 'touchend', x, y);

  return nextTick();
}
```
