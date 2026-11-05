---
title: "《与爱因斯坦漫步月球》"
description: 记录《与爱因斯坦漫步月球》里的精细编码、组块和记忆宫殿，以及如何用开发问题练习回忆和纠错。
date: 2026-11-05
tags:
  - 阅读
draft: false
badges: [readingNote]
---

## 「重点概念」

- **精细编码（elaborative encoding）**。把新信息和已有知识联系起来，为回忆建立线索。福尔用 *Baker* 和 *baker* 举例。同一个词，作为职业“面包师”时，容易让人联想到面包和烤箱。作为陌生人的姓氏时，现成的联想较少。书中用 “think in more memorable ways” 概括这种思路。 [原书节选](https://www.penguin.com.au/books/moonwalking-with-einstein-9780141032139/extracts/2553-moonwalking-with-einstein) · [福尔访谈](https://dianerehm.org/shows/2011-03-15/joshua-foer-moonwalking-einstein/)
- **组块（chunking）**。用已有知识把多个项目组织成一个有意义的单位。受试者 S.F. 把 `3492` 编码成自己熟悉的跑步成绩 **3 分 49.2 秒**，借一个熟悉的成绩回忆四个数字。 [原始研究](https://gwern.net/doc/psychology/neuroscience/memory/1980-ericsson.pdf)

## 「知识点」

- **再认与回忆是不同的任务。** 书中，Ed 先快速展示 30 张图，半小时后再让参与者从每对图中选出见过的一张。原书称之为 “two-alternative picture recognition exam”。重看文档时认得出原来的解释，检验的是再认。合上文档后能否讲清原理和适用条件，需要单独检查。 [原书第 2 章节选](https://www.penguin.com.au/books/moonwalking-with-einstein-9780141032139/extracts/2553-moonwalking-with-einstein)
- **记忆训练的成绩要结合任务和策略看。** S.F. 经过 230 多小时的实验室练习，数字记忆广度从 7 提高到 79。训练早期，研究者换成他无法用跑步成绩编码的数字序列时，表现回落到接近起点。 [原始研究](https://gwern.net/doc/psychology/neuroscience/memory/1980-ericsson.pdf)
- **熟练后可能进入平台期（OK Plateau）。** 书中用打字举例。动作自动化后，照常打字往往难以继续提高。练习可以针对一个具体弱点，并持续检查结果。原文将反馈写作 “getting constant and immediate feedback on their performance”。 [原书第 8 章节选](https://blog.supplysideliberal.com/post/51204513930/joshua-foer-on-deliberate-practice)

## 「方法论」

### 1. 用记忆宫殿按顺序提取要点

选一条熟悉的路线，把要记的内容转成画面，依次放在固定位置。回忆时沿路线走一遍，每个位置提示一个要点。

- **书中例子**。在西蒙尼德斯的传说里，他凭宴会的座位布局回想起宾客原先坐在哪里。 [原书序章节选](https://www.penguin.com.au/books/moonwalking-with-einstein-9780141032139/extracts/2553-moonwalking-with-einstein)
- **应用场景**。脱稿做技术分享时，用门口的报错截图、书桌上的定位日志和窗边的修复对照图，依次提示「故障现象」「定位证据」「处理方案」。

### 2. 用 PAO 把六位数字编成一个画面

给每组两位数分配人物、动作和物体。记六位数时，从第一组取人物、第二组取动作、第三组取物体，再合成一个场景。 [出版社第 8 章教学指南](https://assetbucketpublic.7169.prh.com/9780/143/120/537/sales-assets/9780143120537_9780143120537_EducatorGuide_5.pdf)

- **示例**。假设 `28` 对应的人物是厨师，`47` 对应的动作是踢，`92` 对应的物体是纸箱。`284792` 就编码成“厨师踢纸箱”。
- **应用场景**。练习记忆长串随机数字时，用固定编码表生成一组画面，再按顺序放进记忆宫殿。

### 3. 用开发问题练习回忆和纠错

读完一篇和当前开发有关的文档，合上原文，用自己的话解释一个具体问题，再翻回去核对遗漏的条件。隔两三天，只看问题，换一个条件重新判断。

- **示例**。创建订单超时后，服务端可能已经完成操作，只是客户端没收到响应。决定是否重试前，先查接口是否支持用同一个请求标识去重，以及该标识的适用范围和有效期。 [AWS 幂等 API](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)
- **改变条件**。假设接口有幂等保障，但服务端持续过载。重试依然会增加负载，需要重新判断是否继续，并检查次数上限、总时限、退避和抖动。 [AWS 超时、重试与退避](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- **应用场景**。遇到上传超时，先判断文件是否可能已经保存、重复提交有什么副作用、客户端是否已经重试。再带着这些问题查接口契约。
