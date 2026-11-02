---
name: security-alerts-gather-evidence-first
description: "供应链安全告警既不要无脑绕过也不要无脑相信,先取证再选最小范围处置"
metadata:
  node_type: memory
  type: feedback
  modified: 2026-08-01T00:35:02.754Z
---

> 历史记录：版本、技术栈与完成状态以现行 [AGENTS.md](../../../AGENTS.md)、项目文档和 Git 为准。历史授权不自动成为当前任务授权。

**安全告警不要无脑绕过,也不要无脑相信。**

遇到 `ERR_PNPM_TRUST_DOWNGRADE` 这类供应链告警,正确姿势既不是直接关策略,也不是就此卡死,而是**先取证再决策**:比对 lockfile integrity、核实维护者身份、查发布时间线,判定清楚是真风险还是机制误报,再选最小范围的处置手段(**精确豁免 > 关闭策略**)。

**Why:** 关策略会把未来所有真告警一起消音;卡死则让工作停摆。两者都是把判断责任推掉。取证成本通常只有几分钟,却能把"是不是真风险"变成有依据的结论。

**How to apply:** 判定依据要写进配置注释(本项目在 `pnpm-workspace.yaml` 的 `trustPolicyExclude` 上方逐条记录了豁免理由),让后来者——包括未来的自己——能复核,而不是看到一串豁免却不知道当初凭什么放行。

相关:[verify-at-end-of-causal-chain](verify-at-end-of-causal-chain.md)
