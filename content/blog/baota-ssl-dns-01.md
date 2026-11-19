---
title: "我把宝塔上每月手换的证书，交给了 acme.sh"
description: 宝塔里管着好几个站点，以前每个月都得重新申请证书、替换文件。后来我让 acme.sh 负责续期，又查了查 Nginx 到底把哪张证书发给了访客。
date: 2026-08-10
tags:
  - 知识
draft: false
badges:
  - server
  - ssl
---

以前每个月，我都得进一趟宝塔。申请免费证书，找到对应站点，换掉证书和私钥，再去换下一站。一个站点的时候还好，自己的服务器上多部署几个站点，这活儿就有点烦了。

我想要的很简单。以后在 `example.com` 底下加个站，只要还是一级子域名，就能沿用同一张通配符证书。等证书该换了，服务器自己去申请，Nginx 自己把新证书用起来。

我当时用的是腾讯云的 OpenCloudOS 9.6，站点归宝塔 Linux 面板管，前面跑 Nginx 1.27.4。云厂商或 CDN 的托管证书也能自动续期，看你的套餐包不包含通配符、换服务商时要不要重新配置。我想把证书文件和续期日志都留在自己机器上，所以选了自托管。你只有一个域名，面板也替你续得好好的，那就继续用，能省掉下面这一趟。

## 「为什么申请证书要动 DNS」

Let's Encrypt 签发域名验证型证书（DV），它要先确认你有权使用申请单上的域名。客户端与签发机构约定这套验证、申请的流程，用的协议叫 ACME，通配符证书走 ACME v2。acme.sh 是用 Shell 写的客户端，我的服务器不用为它另外装 Python。如果你平时就在用 Certbot，也可以沿用，关键在于怎么验证域名。

假设只给 `www.example.com` 签证书，可以走 HTTP-01。客户端把校验文件放在站点约定的路径，签发机构通过 80 端口来取。换成我想要的 `*.example.com`，HTTP-01 就用不上了。我选的是 DNS-01，由客户端在 `_acme-challenge.example.com` 写入指定的 TXT 记录，等签发机构查到，再把记录清掉。[Let's Encrypt 的验证方式说明](https://letsencrypt.org/zh-cn/docs/challenge-types/)

这里有个容易漏的域名。`*.example.com` 管得到 `blog.example.com`，管不到 `example.com` 自己，也管不到再深一层的 `dev.blog.example.com`。所以后面的命令会同时写上主域名和通配符。要是你的站点就固定那两三个名字，同一张证书里逐个列出来也行。

## 「给续期单独配一把 DNS 密钥」

后来查服务器配置时，我在 `~/.acme.sh/account.conf` 里翻到了一对明文的 SecretId 和 SecretKey。回头看腾讯云插件，它会把凭据记在这个文件里，否则当前 SSH 会话一关，下次定时续期就没法自己改 DNS 了。也正因为它会留下来，这里别顺手填主账号的密钥。[腾讯云 DNS 插件源码](https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_tencent.sh)

我在腾讯云控制台里这样配：

1. 进“访问管理（CAM）”的“用户列表”，新建一个子用户。访问方式选“编程访问”，控制台登录用不上。
2. 给它 DNSPod 的解析权限。`QcloudDNSPodFullAccess` 是 DNSPod 全读写，能添加和清理 TXT，也能改其他解析记录。只打算管一个域名的话，可以再用自定义策略把授权收窄。`QcloudDNSPodReadOnlyAccess` 做不了这次验证。[DNSPod 的权限说明](https://cloud.tencent.com/document/product/302/105720)
3. 在子用户的“API 密钥”页新建密钥，保存 SecretId 和 SecretKey。我会在备注里写上用途，比如“example.com 证书续期”，以后再回来还能认得它。

::warning{title="关掉弹窗前先保存 SecretKey"}
腾讯云从 2023 年 11 月 30 日起只在创建时展示 SecretKey。以后能查到的是 SecretId，拿着它找不回另一半。[腾讯云的密钥说明](https://cloud.tencent.com/document/product/598/37140)
::

## 「签一张主域名和子域名都能用的证书」

第一次做，可以先挑个不影响业务的测试域名走一遍。下面用 `example.com` 占位，邮箱、域名都换成自己的。在服务器的 SSH 或宝塔终端，用以后负责续期的那个用户安装：

```bash
curl https://get.acme.sh | sh -s email=你的邮箱
```

安装目录是这个用户的 `~/.acme.sh`，安装器也会给它登记 cron 任务。重新连一次 SSH 就能用 `acme.sh` 命令了。用 Bash 的话，也可以就地执行 `source ~/.bashrc`，再用 `acme.sh --version` 确认。

用腾讯云的 `dns_tencent` 插件，当前 shell 需要两个环境变量。我把变量名列在下面。在 Bash 里可以等提示出来再粘贴，免得带着密钥的命令留在历史记录里。其他 DNS 服务商要换插件和变量名，按服务商查[官方插件列表](https://github.com/acmesh-official/acme.sh/wiki/dnsapi)。

```bash
read -r -p 'SecretId: ' Tencent_SecretId
read -rs -p 'SecretKey: ' Tencent_SecretKey
printf '\n'
export Tencent_SecretId Tencent_SecretKey
```

接着签发。这里显式选 Let's Encrypt，把 `*.example.com` 用引号包起来，免得星号被 shell 展开。

```bash
acme.sh --issue --server letsencrypt --dns dns_tencent -d example.com -d '*.example.com'
```

通常等几十秒到几分钟，终端就会有签发结果。卡在等 TXT 时，查权威 DNS 上那条记录是否已经可见。如果 DNS API 直接报鉴权失败，回头核对子用户的密钥和权限。需要留日志时可以在命令后加 `--log`，默认日志路径是 `~/.acme.sh/acme.sh.log`。插件自己会保存续期用的凭据，不用再往 `.bashrc` 里抄一份。

## 「把证书送到 Nginx 正在读的地方」

签发成功后，文件先落在 acme.sh 自己的工作目录里。宝塔管的站点有自己的证书路径。先看该站点 Nginx 配置里的 `ssl_certificate` 和 `ssl_certificate_key`，认准是哪两个文件，再做安装。下面是我的目录写法：

```bash {2,3}
acme.sh --install-cert -d example.com \
  --key-file /www/server/panel/vhost/cert/example.com/privkey.pem \
  --fullchain-file /www/server/panel/vhost/cert/example.com/fullchain.pem \
  --reloadcmd "systemctl reload nginx"
```

签发时写两个 `-d`，这里用第一个域名就能找到整张证书。换成你的实际路径，确认目录存在、续期用户能写进去。最后一行也要对一下：你的 Nginx 得确实能由这条命令重载。acme.sh 会记住安装路径和重载命令，以后续期成功还会照做。[acme.sh 的 Nginx 安装示例](https://github.com/acmesh-official/acme.sh#3%EF%B8%8F%E2%83%A3-install-the-cert-to-apachenginx-etc)

如果这个站点还没在宝塔里启用 HTTPS，也可以先到“网站 → 对应站点 → SSL → 其他证书”手工接一次。“证书内容”填 `fullchain.pem`（域名证书连同中间证书链），“私钥内容”填 `privkey.pem`。只粘第一段证书，有些客户端能补出中间证书，有些会直接报链不完整。面板保存之后，再对一次上面那两个安装路径，否则这次手工粘贴管用，下次自动换的却可能是另一份文件。

## 「闭坑指南」

我跑 `acme.sh --list` 时，发现清单里有两个域名只差一个字母，各有一张通配符证书，其中一张找不到续期记录。光看这张清单，还真说不准哪个站点在用哪张。最后我会分别查三处：

- **客户端收到哪张。** 对直连 Nginx 的站点，用 `curl -vI https://你的域名` 或浏览器的证书查看器，看线上证书的域名、签发时间和到期时间，再和刚安装的证书核对。如果前面还有 CDN，公网连接看到的是 CDN 出示的那张，源站要另外核对。
- **下次谁来跑。** 用安装 acme.sh 的用户执行 `crontab -l`。像下面这行，每天 14:51 起一次检查，到了续期时间才重新签发。换了用户，看到的就是另一份 crontab。
- **清单里每个名字还有没有用。** 拿 `acme.sh --list` 里的主域名和站点配置逐个对，尤其是长得很像的名字。续期出问题，再顺着 cron 任务、DNS 权限、TXT 生效情况、Nginx 重载这几处找，能少翻不少日志。

```bash
51 14 * * * "/root/.acme.sh"/acme.sh --cron --home "/root/.acme.sh" > /dev/null
```

宝塔自己的日志清理和监控任务也挤在 crontab 里。以后整理那一长串任务时，给这行 `--cron` 留着。下个月能省掉的那趟面板操作，就靠它了。
