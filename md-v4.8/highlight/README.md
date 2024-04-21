# highlight 高亮文本的组件

## 1. 前言

大家好，我是[若川](https://lxchuan12.gitee.io)，欢迎 `follow` [我的 github](https://github.com/ruochuan12)。我倾力持续组织了3年多[每周大家一起学习200行左右的源码共读活动](https://juejin.cn/post/7079706017579139102)，感兴趣的可以[点此扫码加我微信 `ruochuan02` 参与](https://juejin.cn/pin/7217386885793595453)。另外，想学源码，极力推荐关注我写的专栏[《学习源码整体架构系列》](https://juejin.cn/column/6960551178908205093)，目前是掘金关注人数（5.7k+人）第一的专栏，写有20余篇源码文章。

我们开发业务时经常会使用到组件库，一般来说，很多时候我们不需要关心内部实现。但是如果希望学习和深究里面的原理，这时我们可以分析自己使用的组件库实现。有哪些优雅实现、最佳实践、前沿技术等都可以值得我们借鉴。

相比于原生 `JS` 等源码。我们或许更应该学习，正在使用的组件库的源码，因为有助于帮助我们写业务和写自己的组件。

如果是 `Vue` 技术栈，开发移动端的项目，大多会选用 `vant` 组件库，目前（2022-11-29） `star` 多达 `20.5k`，[已经正式发布 4.0 了](https://vant-contrib.gitee.io/vant/#/zh-CN)。我们可以挑选 `vant` 组件库学习，我会写一个[vant 组件库源码系列专栏](https://juejin.cn/column/7140264842954276871)，欢迎大家关注。

**vant 组件库源码分析系列：**

- 1.[vant 4 即将正式发布，支持暗黑主题，那么是如何实现的呢](https://juejin.cn/post/7158239404484460574)
- 2.[跟着 vant 4 源码学习如何用 vue3+ts 开发一个 loading 组件，仅88行代码](https://juejin.cn/post/7160465286036979748)
- 3.[分析 vant 4 源码，如何用 vue3 + ts 开发一个瀑布流滚动加载的列表组件？](https://juejin.cn/post/7165661072785932296)
- 4.[分析 vant 4 源码，学会用 vue3 + ts 开发毫秒级渲染的倒计时组件，真是妙啊](https://juejin.cn/post/7169003604303413278)
- 5.[vant 4.0 正式发布了，分析其源码学会用 vue3 写一个图片懒加载组件！](https://juejin.cn/post/7171227417246171149)

这次我们来学习 `Lazyload` 懒加载组件，[可以点此查看 `lazyload` 文档体验](https://vant-contrib.gitee.io/vant/#/zh-CN/lazyload)。

学完本文，你将学到：

```bash
1. 
```

## 2. 准备工作

看一个开源项目，第一步应该是先看 [README.md](https://github.com/youzan/vant) 再看贡献文档 [github/CONTRIBUTING.md](https://github.com/youzan/vant/blob/main/.github/CONTRIBUTING.md)。

### 2.1 克隆源码 && 跑起来

You will need [Node.js >= 14](https://nodejs.org) and [pnpm](https://pnpm.io).

```bash
# 推荐克隆我的项目
git clone https://github.com/lxchuan12/vant-analysis
cd vant-analysis/vant-v4.8

# 或者克隆官方仓库
git clone git@github.com:youzan/vant.git
cd vant

# 启用 pnpm 包管理器
corepack enable

# 安装依赖，如果没安装 pnpm，可以用 npm i pnpm -g 安装，或者查看官网通过其他方式安装
pnpm i

# 启动服务
pnpm dev
```

执行 `pnpm dev` 后，这时我们打开高亮文本组件 `http://localhost:8080/#/zh-CN/highlight`。

## 3. 调试

```json
// vant-v4.8/package.json
{
  "private": true,
  "scripts": {
    "prepare": "husky install",
    "dev": "pnpm --dir ./packages/vant dev",
}
```

```json
// vant-v4.8/packages/vant/package.json
{
  "name": "vant",
  "version": "4.8.11",
    "scripts": {
        "dev": "vant-cli dev",
    }
}
```

```json
// vant-v4.8/packages/vant-cli/package.json
{
  "name": "@vant/cli",
  "version": "7.0.1",
  "type": "module",
  "bin": {
    "vant-cli": "./bin.js"
  },
}
```

```js
// vant-v4.8/packages/vant-cli/bin.js
#!/usr/bin/env node
import './lib/cli.js';
```

我们可以从 [vant-cli changelog](https://github.com/youzan/vant/blob/main/packages/vant-cli/changelog.md)得知，最新7.x版本，采用了 `rsbuild`，作为打包构建工具，弃用了原有的 `vite`。

[rsbuild output.sourceMap](https://rsbuild.dev/zh/config/output/source-map)

```js
// 类型
type SourceMap = {
  js?: RspackConfig['devtool'];
  css?: boolean;
};
// 默认值
const defaultSourceMap = {
  js: isDev ? 'cheap-module-source-map' : false,
  css: false,
};
```

可以搜索 `vant-v4.8/packages/vant-cli` 项目中的搜索 `sourceMap` 知道配置开启 `sourceMap`。

```js
output: {
    assetPrefix,
    // make compilation faster
    sourceMap: {
        // 代码里是js false，关闭，可以关闭，启用默认值
        // js: false,
        css: false,
    },
}
```

往期讲述了很多工具函数和脚手架相关的等，所以在此不再赘述。

### 3.1 利用 demo 调试源码


带着问题我们直接找到 `highlight demo` 文件：`vant/packages/vant/src/highlight/demo/index.vue`。为什么是这个文件，我在之前文章[跟着 vant4 源码学习如何用 vue3+ts 开发一个 loading 组件，仅88行代码](https://juejin.cn/post/7160465286036979748#heading-3)分析了其原理，感兴趣的小伙伴点击查看。这里就不赘述了。

```js
// vant-v4.8/packages/vant/src/highlight/demo/index.vue
<script setup lang="ts">
import VanHighlight from '..';
import { useTranslate } from '../../../docs/site';

const t = useTranslate({
  'zh-CN': {
    text1: '慢慢来，不要急，生活给你出了难题，可也终有一天会给出答案。',
    keywords1: '难题',
    keywords2: ['难题', '终有一天', '答案'],
    keywords3: '生活',
    multipleKeywords: '多字符匹配',
    highlightClass: '设置高亮标签类名',
  },
  'en-US': {
    text1:
      'Take your time and be patient. Life itself will eventually answer all those questions it once raised for you.',
    keywords1: 'questions',
    keywords2: ['time', 'life', 'answer'],
    keywords3: 'life',
    multipleKeywords: 'Multiple Keywords',
    highlightClass: 'Highlight Class Name',
  },
});
</script>

<template>
  <demo-block :title="t('basicUsage')">
    <van-highlight :keywords="t('keywords1')" :source-string="t('text1')" />
  </demo-block>

  <demo-block :title="t('multipleKeywords')">
    <van-highlight :keywords="t('keywords2')" :source-string="t('text1')" />
  </demo-block>

  <demo-block :title="t('highlightClass')">
    <van-highlight
      :keywords="t('keywords3')"
      :source-string="t('text1')"
      highlight-class="custom-class"
    />
  </demo-block>
</template>
```

## 4. 高亮


这段源码是一个 Vue 组件，实现了一个名为 highlight 的高亮组件。以下是对这段源码的分析和 highlight 组件实现原理的概述：

分析源码功能：
Props 定义：

定义了一系列 props，包括控制高亮的各种配置项，如是否自动转义、是否区分大小写、高亮样式类名等。
setup 函数：

在 setup 函数中，通过 computed 创建了一个名为 highlightChunks 的 computed 属性，该属性根据传入的关键词在原始字符串中生成并合并高亮块。
highlightChunks 的计算过程包括将关键词转为正则表达式，匹配原始字符串中的位置，并生成含有高亮样式标记的块。
renderContent 函数：

renderContent 函数根据 highlightChunks 的结果在原始字符串中提取每个块并生成相应的高亮或非高亮段落。
返回函数：

返回一个渲染函数，在渲染时根据 props 中的设置，生成相应的高亮标签或非高亮标签，并以适当的方式组织和呈现高亮内容。
实现原理概述：
提取关键字：

首先，根据传入的关键字（可以是字符串或字符串数组），将其转换为数组形式。
生成高亮块：

遍历关键字数组，根据是否需要转义和是否区分大小写，生成正则表达式进行匹配，找出原始字符串中的关键字位置，并记录下每个关键字的起始和结束位置以及是否需要高亮。
合并相邻块：

将相邻的高亮块合并为一个块，以减少多余的高亮标记。
生成最终内容：

根据高亮块的信息，在原始字符串中按要求插入高亮标签或非高亮标签，形成最终的高亮内容。
通过这些步骤，highlight 组件实现了在给定字符串中根据关键字进行高亮展示的功能。整体思路是根据关键字生成高亮块，然后在渲染时根据这些块的信息插入合适的标签实现高亮效果。


## 8. 加源码共读交流群

最后可以持续关注我[@若川](https://juejin.cn/user/1415826704971918)，欢迎 `follow` [我的 github](https://github.com/ruochuan12)。另外，想学源码，极力推荐关注我写的专栏[《学习源码整体架构系列》](https://juejin.cn/column/6960551178908205093)，目前是掘金关注人数（5.7k+人）第一的专栏，写有20余篇源码文章。

我倾力持续组织了3年多[每周大家一起学习200行左右的源码共读活动](https://juejin.cn/post/7079706017579139102)，感兴趣的可以[点此扫码加我微信 `ruochuan02` 参与](https://juejin.cn/pin/7217386885793595453)。

