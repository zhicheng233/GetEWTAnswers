# 😱GetEWTAnswers

![GitHub Release](https://img.shields.io/github/v/release/zhicheng233/GetEWTAnswers)
![GitHub Created At](https://img.shields.io/github/created-at/zhicheng233/GetEWTAnswers)
![GitHub last commit](https://img.shields.io/github/last-commit/zhicheng233/GetEWTAnswers)
![GitHub License](https://img.shields.io/github/license/zhicheng233/GetEWTAnswers)
![GitHub forks](https://img.shields.io/github/forks/zhicheng233/GetEWTAnswers?style=social)
![GitHub Repo stars](https://img.shields.io/github/stars/zhicheng233/GetEWTAnswers)
![GitLab Issues](https://img.shields.io/gitlab/issues/open/zhicheng233%2FGetEWTAnswers)

😱升学 E 网通 (EWT360) 试题答案获取

脚本主页：[https://greasyfork.org/zh-CN/scripts/524802-升学-e-网通-ewt360-试题答案获取](https://greasyfork.org/zh-CN/scripts/524802-%E5%8D%87%E5%AD%A6-e-%E7%BD%91%E9%80%9A-ewt360-%E8%AF%95%E9%A2%98%E7%AD%94%E6%A1%88%E8%8E%B7%E5%8F%96)

[Github仓库](https://github.com/zhicheng233/GetEWTAnswers)

**此脚本在各浏览器与JavaScript引擎中均具有良好的兼容性（ Internet Explorer与Duktape除外）。**

重新逆向2025 EWT 相关 API
> 2025 7月份更新ewt获得被30min攻克的优秀成绩，杂鱼，杂鱼~

> 2025这B e网通对接口做了鉴权，判断是否完成题目，但是做了跟没做一样，因为可以拿已经完成的reportId去越权获得未完成试题的答案🤣👉

## 📌如何使用
该项目为Tampermonkey(油猴)脚本，你需要在你的浏览器内安装一个用户脚本管理器。

<summary>

#### 💻桌面端

</summary>
<details>

- Microsoft
   Edge：[Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

- Chrome：[Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) 或 [Violentmonkey](https://chrome.google.com/webstore/detail/violent-monkey/jinjaccalgkegednnccohejagnlnfdag)
- Firefox：[Greasemonkey](https://addons.mozilla.org/firefox/addon/greasemonkey/)
   、[Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/)
   或 [Violentmonkey](https://addons.mozilla.org/firefox/addon/violentmonkey/)
- Safari：[Tampermonkey](https://www.tampermonkey.net/?browser=safari)
   或 [Userscripts](https://apps.apple.com/app/userscripts/id1463298887)

 </details>
<summary>


#### 📱手机端（Android）
</summary>

<details>

 - Microsoft Edge：扩展-

 - Firefox：[Greasemonkey](https://addons.mozilla.org/firefox/addon/greasemonkey/)
  、[Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/)
  或 [Violentmonkey](https://addons.mozilla.org/firefox/addon/violentmonkey/)
</details>

<summary>

#### 🍎手机端（iOS）
</summary>
<details>

- Safari：[Tampermonkey](https://www.tampermonkey.net/?browser=safari)
  或 [Userscripts](https://apps.apple.com/app/userscripts/id1463298887)
</details>

安装完脚本管理器后安装此用户脚本

访问:[Greasyfork脚本主页](https://greasyfork.org/zh-CN/scripts/524802-%E5%8D%87%E5%AD%A6-e-%E7%BD%91%E9%80%9A-ewt360-%E8%AF%95%E9%A2%98%E7%AD%94%E6%A1%88%E8%8E%B7%E5%8F%96)


~~由于EWT对API进行了鉴权，你需要获取一个已经完成的试题的reportId~~

~~如何获得?~~

~~选择已经完成的试题（一定是已经完成的！！！还有不能用课后习题的，必须得是 试卷类型！！）,复制URL(网址)上的&reportId=到下一个&的值,比如&reportId=19158466643xxxx&videoPoint=1 则复制19158466643xxxx~~

~~将获取到的reportId填入到脚本设置中去~~~

目前脚本已高度自动化，无需任何操作

## 🤔有问题?
在询问之前请确定您已经认真阅读上方 ⌈如何使用⌋ 确保不是自身操作问题，咱已经遇到好几个没好好读README的了(
如果有问题请尽量通过Github仓库给项目提Issues来询问，而不是通过邮箱、QQ或者B站，这样你的问题无法获得除咱之外的其他人帮助，同时你的案例也无法帮助其他人，提问之前请先看看Github仓库中Issues是否有人提过类似的问题，咱的时间与精力是有限的喵w//..

## 🛠️相关API
<details>
    
    URL:
        https://web.ewt360.com/api/answerprod/common/answer/answerSheetInfo
    请求方式:
        POST
    参数:
        client: 1,
        paperId: paperId,
        platform: platform,
        reportId: reportId,
        bizCode: bizCode,
        userId: ""

该API用于获取该试题的所有questionInfo

    URL:
        https://web.ewt360.com/api/answerprod/web/answer/simple/question/info
    请求方式:
        POST
    参数:
        questionId: questionId,
        paperId: paperId,
        reportId: getAnswerReportId,
        platform: platform,
        bizCode: 201
该API用于返回试题答案
</details>

## 🍭捐赠
<p>请开发者打一局 maimai 或者请开发者买 糖🍬 如何？<a href="https://zhicheng233.top/Donate/">帮帮咱🥺~</a>

## 🥰致谢
本项目的完成离不开这些贡献者的努力，感谢他们的无私付出~
欢迎各位提交PRw//~

<a href="https://github.com/zhicheng233/GetEWTAnswers/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=zhicheng233/GetEWTAnswers" />
</a>

**愿我们在顶峰相见~**

## :star:Star趋势

<a href="https://www.star-history.com/?repos=zhicheng233%2FGetEWTAnswers&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=zhicheng233/GetEWTAnswers&type=date&theme=dark&legend=top-left&sealed_token=AVvcIL__Hv8XQ-I5uNTz3KAmYOkOhxc3feNNM70j2yBuq9cpkDeVQ9JtosYtG3VbsbPzqDz6rTp1fTz_gXX-BXAnT2mrOgi_uC4_TU_ZHoNyqsPHFfPc_wgKB6fPnT_PicyTueotiWp30K7lA0su8EF0FPvlAJ9f-G--7MegS76w2Y4gI4_ehVAlH5ZA" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=zhicheng233/GetEWTAnswers&type=date&legend=top-left&sealed_token=AVvcIL__Hv8XQ-I5uNTz3KAmYOkOhxc3feNNM70j2yBuq9cpkDeVQ9JtosYtG3VbsbPzqDz6rTp1fTz_gXX-BXAnT2mrOgi_uC4_TU_ZHoNyqsPHFfPc_wgKB6fPnT_PicyTueotiWp30K7lA0su8EF0FPvlAJ9f-G--7MegS76w2Y4gI4_ehVAlH5ZA" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=zhicheng233/GetEWTAnswers&type=date&legend=top-left&sealed_token=AVvcIL__Hv8XQ-I5uNTz3KAmYOkOhxc3feNNM70j2yBuq9cpkDeVQ9JtosYtG3VbsbPzqDz6rTp1fTz_gXX-BXAnT2mrOgi_uC4_TU_ZHoNyqsPHFfPc_wgKB6fPnT_PicyTueotiWp30K7lA0su8EF0FPvlAJ9f-G--7MegS76w2Y4gI4_ehVAlH5ZA" />
 </picture>
</a>