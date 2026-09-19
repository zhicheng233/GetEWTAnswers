// ==UserScript==
// @name         升学 E 网通 (EWT360) 试题答案获取
// @namespace    https://ewt.zhicheng233.top/examanswer
// @version      1.5.1
// @description  此脚本在 EWT 试题中获取试题答案（全自动获取 token + 图片显示 + 提交答案 + 作业页 201 旁路/proofread）
// @author       志成🍥, 知识pro, 2P2O5, hmruu
// @match        https://web.ewt360.com/answer-pc/exam/answer*
// @icon         https://web.ewt360.com/favicon.ico
// @license      GNU General Public License
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @downloadURL https://update.greasyfork.org/scripts/524802/%E5%8D%87%E5%AD%A6%20E%20%E7%BD%91%E9%80%9A%20%28EWT360%29%20%E8%AF%95%E9%A2%98%E7%AD%94%E6%A1%88%E8%8E%B7%E5%8F%96.user.js
// @updateURL https://update.greasyfork.org/scripts/524802/%E5%8D%87%E5%AD%A6%20E%20%E7%BD%91%E9%80%9A%20%28EWT360%29%20%E8%AF%95%E9%A2%98%E7%AD%94%E6%A1%88%E8%8E%B7%E5%8F%96.meta.js
// ==/UserScript==

(function () {
    'use strict';
    // ==== 版本号 记得改这里====
    const Version = '1.5.1';
    // ==== token 嗅探器：必须在任何页面请求之前安装 ====
    const TOKEN_RE = /^\d{3,}-\d+-[A-Za-z0-9]{8,}$/;
    const TOKEN_LOOSE = /\b\d{3,}-\d+-[A-Za-z0-9]{8,}\b/;
    let sniffedToken = '';
    const tokenWaiters = [];
    function onSniff(tk) {
        if (!tk || sniffedToken) return;
        sniffedToken = tk;
        try { GM_setValue('ewtToken', tk); } catch (e) { }
        while (tokenWaiters.length) tokenWaiters.shift()(tk);
    }
    (function installSniffer() {
        const oSet = XMLHttpRequest.prototype.setRequestHeader;
        XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
            try {
                if (String(k).toLowerCase() === 'token' && TOKEN_RE.test(String(v))) onSniff(String(v));
            } catch (e) { }
            return oSet.apply(this, arguments);
        };
        const oOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (m, u) {
            try {
                const mm = String(u).match(/[?&]token=([^&]+)/);
                if (mm) { const t = decodeURIComponent(mm[1]); if (TOKEN_RE.test(t)) onSniff(t); }
            } catch (e) { }
            return oOpen.apply(this, arguments);
        };
        const oFetch = window.fetch;
        if (oFetch) {
            window.fetch = function (input, init) {
                try {
                    let tk = '';
                    if (init && init.headers) {
                        const h = init.headers;
                        if (typeof Headers !== 'undefined' && h instanceof Headers) tk = h.get('token') || '';
                        else if (Array.isArray(h)) { const f = h.find((p) => String(p[0]).toLowerCase() === 'token'); tk = f ? f[1] : ''; }
                        else tk = h.token || h.Token || '';
                    }
                    if (!tk) {
                        const u = typeof input === 'string' ? input : (input && input.url) || '';
                        const mm = String(u).match(/[?&]token=([^&]+)/);
                        if (mm) tk = decodeURIComponent(mm[1]);
                    }
                    if (TOKEN_RE.test(String(tk))) onSniff(String(tk));
                } catch (e) { }
                return oFetch.apply(this, arguments);
            };
        }
    })();

    const BASE = 'https://gateway.ewt360.com';
    const BIZ_VIEW = '201';
    const UA = 'Mozilla/5.0';

    const CSS = `
.ewt-overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5); z-index: 99998;
    display: flex; align-items: center; justify-content: center;
}
.ewt-overlay.minimized {
    background: transparent; pointer-events: none;
}
.ewt-overlay.minimized .ewt-modal { display: none; }
.ewt-modal {
    background: #fff; border-radius: 12px; width: 560px;
    max-height: 85vh; display: flex; flex-direction: column;
    box-shadow: 0 8px 30px rgba(0,0,0,0.25); z-index: 99999;
}
.ewt-modal-header {
    padding: 14px 20px; border-bottom: 1px solid #eee;
    font-size: 18px; font-weight: bold;
    display: flex; justify-content: space-between; align-items: center;
}
.ewt-modal-header-btns { display: flex; gap: 8px; align-items: center; }
.ewt-modal-minimize, .ewt-modal-close {
    cursor: pointer; font-size: 18px; color: #999; line-height: 1;
    background: none; border: none; padding: 2px 6px;
}
.ewt-modal-minimize:hover, .ewt-modal-close:hover { color: #333; }
.ewt-modal-body {
    padding: 16px 20px; overflow-y: auto; flex: 1;
    line-height: 1.6; font-size: 14px;
}
.ewt-modal-body .q {
    background: #f7f8fa; margin: 8px 0; padding: 12px;
    border-radius: 8px; border-left: 3px solid #4a90d9;
}
.ewt-modal-body .q-num { font-weight: bold; color: #333; }
.ewt-modal-body .q-ans { color: #e74c3c; margin: 4px 0; white-space: pre-wrap; }

/* 行内公式：随字号缩放，基线偏移由行内 style 提供，这里不覆盖 vertical-align */
.ewt-modal-body img.ewt-math {
    display: inline; margin: 0 1px;
    max-width: 100%;   /* 仅防超宽公式撑破弹窗，不限高 */
}
/* 公式行比纯文字行高，放宽行距避免上下行的公式互相挤压 */
.ewt-modal-body .q-ans { line-height: 2.1; }

/* 结构式等配图：默认随文字内联，不打断句子 */
.ewt-modal-body img.ewt-figure {
    max-width: 100%; height: auto;
    display: inline-block; vertical-align: middle;
    margin: 0 2px;
}
/* 大图（附件插图、实验装置）才独占一行 */
.ewt-modal-body img.ewt-figure.ewt-block {
    display: block; margin: 6px 0; max-height: 260px; width: auto;
}
/* 兜底：没有分类的图片 */
.ewt-modal-body .q-ans img:not(.ewt-math):not(.ewt-figure),
.ewt-modal-body .q-parse img:not(.ewt-math):not(.ewt-figure) {
    max-width: 100%; height: auto; vertical-align: middle;
}
.ewt-modal-body .q-know { color: #888; font-size: 12px; }
.ewt-modal-body .q-parse {
    color: #555; font-size: 12px; white-space: pre-wrap;
    margin-top: 4px; line-height: 2.1;
}
.ewt-modal-footer {
    padding: 12px 20px; border-top: 1px solid #eee;
    font-size: 12px; color: #999; text-align: center;
}
.ewt-modal-footer a { color: #4a90d9; margin: 0 4px; }
.ewt-btn-submit {
    display: block; margin: 12px auto 0; padding: 8px 24px;
    background: #4a90d9; color: #fff; border: none; border-radius: 6px;
    font-size: 14px; cursor: pointer;
}
.ewt-btn-submit:hover { background: #3a7bc8; }
.ewt-btn-submit:disabled { background: #aaa; cursor: not-allowed; }
.ewt-submit-msg { text-align: center; margin-top: 8px; font-size: 13px; }
.ewt-footer-more-toggle {
    display: block; margin: 10px auto 0; padding: 4px 12px;
    background: none; border: none; color: #888; font-size: 12px;
    cursor: pointer; text-decoration: underline;
}
.ewt-footer-more-toggle:hover { color: #4a90d9; }
.ewt-footer-more { display: none; margin-top: 4px; }
.ewt-footer-more.open { display: block; }
.ewt-float-bubble {
    position: fixed; bottom: 80px; right: 20px; z-index: 99999;
    width: 52px; height: 52px; border-radius: 50%;
    background: #4a90d9; color: #fff; border: none;
    box-shadow: 0 4px 14px rgba(0,0,0,0.3); cursor: pointer;
    font-size: 13px; font-weight: bold; line-height: 1.2;
    display: none; align-items: center; justify-content: center;
    text-align: center;
}
.ewt-float-bubble:hover { background: #3a7bc8; transform: scale(1.06); }
.ewt-float-bubble.show { display: flex; }
`;

    const styleEl = document.createElement('style');
    styleEl.textContent = CSS;

    // 全局浮动气泡
    const bubble = document.createElement('button');
    bubble.className = 'ewt-float-bubble';
    bubble.textContent = '答案';
    bubble.title = '展开答案';

    // document-start 时 head/body 可能尚未存在，延后挂载
    const whenReady = (fn) => {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
        else fn();
    };
    whenReady(() => {
        (document.head || document.documentElement).appendChild(styleEl);
        document.body.appendChild(bubble);
    });

    // ==================== Cookie 获取工具：读取 token Cookie ====================
    function getCookie(name) {
        const cookiePairs = document.cookie.split('; ');
        for (const pair of cookiePairs) {
            const [key, val] = pair.split('=');
            if (key === name) return decodeURIComponent(val);
        }
        return '';
    }
    // 保存 Cookie 中的初始 token；后续可由缓存、存储扫描或嗅探结果更新。
    const cookieToken = getCookie('token');

    // ==================== 安全 DOM 工具 ====================
    const el = (tag, cls, attrs) => {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (attrs) Object.entries(attrs).forEach(([k, v]) => { if (v != null) e[k] = v; });
        return e;
    };

    const txt = (text) => document.createTextNode(text || '');

    // 从一段 <img ...> 里取指定属性值。
    // 前置必须是标签起始或空白，不能用 \b —— \b 会让 src 命中 data-src、
    // width 命中 data-width，取到错误的值。
    const attrOf = (tag, name) => {
        const re = new RegExp('(?:^<[a-z]+|\\s)' + name + '\\s*=\\s*"([^"]*)"', 'i');
        const m = re.exec(tag);
        return m ? m[1] : '';
    };

    // 平台返回的是 http://file.ewt360.com/...，在 HTTPS 页面下触发混合内容警告
    // （Chrome 自动升级，Firefox 会直接拦）。白名单照常按 http(s) 校验，
    // 输出统一升级成 https，避免两个浏览器行为不一致。
    const normHttps = (u) => u.replace(/^http:\/\//i, 'https://');

    // 推荐微课的播放页地址。lessons[].url 形如
    // /site-study/#/playVideo?courseId=14734&lessonId=66614&from=report_recommend
    const LESSON_HOST = 'https://web.ewt360.com';
    const buildLessonUrl = (l) => {
        if (l && typeof l.url === 'string' && l.url.indexOf('/') === 0) {
            return LESSON_HOST + l.url;
        }
        // url 缺失时用 courseId/lessonId 自行拼
        if (l && l.courseId && l.lessonId) {
            return LESSON_HOST + '/site-study/#/playVideo?courseId=' +
                encodeURIComponent(l.courseId) + '&lessonId=' + encodeURIComponent(l.lessonId);
        }
        return '';
    };

    // 将安全的 HTML 字符串（仅含 <img>）转为 DOM 片段
    const safeHtmlToFragment = (htmlStr) => {
        const frag = document.createDocumentFragment();
        if (!htmlStr) return frag;
        // 先匹配任意 <img ...>，再单独抽 src 校验白名单。
        // 属性顺序不固定：答案图是 src alt width height，公式图的 src 排在第 4 位。
        const imgRe = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
        const attr = attrOf;   // 统一用同一个取属性实现，避免两份规则不一致
        let lastIdx = 0;
        let m;
        while ((m = imgRe.exec(htmlStr)) !== null) {
            if (m.index > lastIdx) {
                frag.appendChild(txt(htmlStr.slice(lastIdx, m.index)));
            }
            const tag = m[0];
            const src = attr(tag, 'src');
            // 白名单外的图直接丢弃（不降级成文本，避免把标签源码显示给用户）
            if (/^https?:\/\/file\.ewt360\.com\//.test(src)) {
                const img = document.createElement('img');
                img.src = normHttps(src);
                const style = attr(tag, 'style');
                const w = attr(tag, 'width');
                const h = attr(tag, 'height');
                const cls = attr(tag, 'class');
                const isMath = /ewt-math/.test(cls) ||
                    /Wirisformula|data-type\s*=\s*"mathType"/i.test(tag);

                if (isMath) {
                    // 行内公式：沿用平台的 style（其中的 vertical-align 是按本公式高度
                    // 算好的基线偏移，覆盖它会让公式浮在文字上方或沉到下方）。
                    // 尺寸交给 CSS 按字号缩放，不写死像素。
                    img.className = 'ewt-math';
                    if (style) img.style.cssText = style;
                } else {
                    // 小图跟着文字内联，明显偏大的才独占一行
                    const big = (/^\d+$/.test(w) && +w > 240) ||
                        (/^\d+$/.test(h) && +h > 80);
                    img.className = 'ewt-figure' + (big ? ' ewt-block' : '');
                    if (style) img.style.cssText = style;
                    // width/height 属性转成内联尺寸，避免被压扁
                    if (w) img.style.width = /\D/.test(w) ? w : w + 'px';
                    if (h) img.style.height = /\D/.test(h) ? h : h + 'px';
                }
                frag.appendChild(img);
            }
            lastIdx = m.index + tag.length;
        }
        if (lastIdx < htmlStr.length) {
            frag.appendChild(txt(htmlStr.slice(lastIdx)));
        }
        return frag;
    };

    // ==================== 答案弹窗 ====================
    const showAnswerModal = (results, choiceAnswers, questions, paperId, platform, submitBizCode) => {
        document.querySelectorAll('.ewt-overlay').forEach(el => el.remove());
        bubble.classList.remove('show');

        const overlay = el('div', 'ewt-overlay');
        const modal = el('div', 'ewt-modal');

        // header
        const header = el('div', 'ewt-modal-header');
        header.appendChild(txt('试题答案 (共 ' + results.length + ' 题)'));
        const headerBtns = el('div', 'ewt-modal-header-btns');

        const minimizeBtn = el('button', 'ewt-modal-minimize', { textContent: '–', title: '收起' });    //不知道@zspro打个—(\u2014)是hyw(
        const closeBtn = el('button', 'ewt-modal-close', { textContent: '\u00d7', title: '关闭' });
        headerBtns.appendChild(minimizeBtn);
        headerBtns.appendChild(closeBtn);
        header.appendChild(headerBtns);
        modal.appendChild(header);

        // body
        const body = el('div', 'ewt-modal-body');
        results.forEach(r => {
            const qDiv = el('div', 'q');

            const numDiv = el('div', 'q-num');
            numDiv.textContent = '[' + r.num + '] ' + r.group;
            qDiv.appendChild(numDiv);

            const ansDiv = el('div', 'q-ans');
            ansDiv.appendChild(txt('答案: '));
            ansDiv.appendChild(safeHtmlToFragment(r.answer));
            qDiv.appendChild(ansDiv);

            if (r.knowledge) {
                const knowDiv = el('div', 'q-know');
                knowDiv.textContent = '知识点: ' + r.knowledge;
                qDiv.appendChild(knowDiv);
            }

            if (r.analysis) {
                const parseDiv = el('div', 'q-parse');
                parseDiv.appendChild(txt('解析: '));
                parseDiv.insertAdjacentHTML("beforeend", r.analysis.replace(/\\</g, "<").replace(/\\:/g, ":"));
                qDiv.appendChild(parseDiv);
            }

            if (r.lessons && r.lessons.length) {
                const lsDiv = el('div', 'q-know');
                lsDiv.appendChild(txt('推荐微课: '));
                r.lessons.forEach((l, li) => {
                    if (li) lsDiv.appendChild(txt('、'));
                    // lessons[].url 是站内相对路径，拼成绝对地址后新标签打开去真实观看
                    const href = buildLessonUrl(l);
                    if (href) {
                        const a = el('a', '', { href, target: '_blank', rel: 'noopener' });
                        a.style.cssText = 'color:#4a90d9;text-decoration:underline';
                        a.textContent = l.title + '(' + l.time + ')';
                        a.title = '点击打开播放页观看';
                        lsDiv.appendChild(a);
                    } else {
                        lsDiv.appendChild(txt(l.title + '(' + l.time + ')'));
                    }
                });
                qDiv.appendChild(lsDiv);
            }

            if (r.images && r.images.length) {
                r.images.forEach(src => {
                    if (/^https?:\/\/file\.ewt360\.com\//.test(src)) {
                        const img = el('img', '', {
                            src: normHttps(src), style: 'max-width:100%;margin-top:6px;border-radius:4px;'
                        });
                        qDiv.appendChild(img);
                    }
                });
            }

            body.appendChild(qDiv);
        });
        modal.appendChild(body);

        // footer
        const footer = el('div', 'ewt-modal-footer');
        const footerFrag = document.createDocumentFragment();
        footerFrag.appendChild(txt('Ver.' + Version + ' · By:志成🍥 ZCROM · 知识pro · 2P2O5 · hmruu · '));

        const linkHome = el('a', '', { href: 'https://zhicheng233.top', target: '_blank', textContent: '\u4e3b\u9875' });
        const linkBlog = el('a', '', { href: 'https://blog.zhicheng233.top', target: '_blank', textContent: '\u535a\u5ba2' });
        const linkGh = el('a', '', { href: 'https://github.com/zhicheng233/GetEWTAnswers', target: '_blank', textContent: 'Github' });

        footerFrag.appendChild(linkHome);
        footerFrag.appendChild(txt(' \u00b7 '));
        footerFrag.appendChild(linkBlog);
        footerFrag.appendChild(txt(' \u00b7 '));
        footerFrag.appendChild(linkGh);
        footer.appendChild(footerFrag);

        // 提交按钮
        let submitBtn, submitMsg;
        if (choiceAnswers.size > 0) {
            submitBtn = el('button', 'ewt-btn-submit', {
                textContent: '\u63d0\u4ea4\u9009\u62e9\u9898\u7b54\u6848 (' + choiceAnswers.size + ' \u9898)',
                id: 'ewtSubmitBtn'
            });
            submitMsg = el('div', 'ewt-submit-msg', { id: 'ewtSubmitMsg' });
            footer.appendChild(submitBtn);
            footer.appendChild(submitMsg);
        }

        // ---- 底下可折叠：推荐微课 + 导出 Markdown ----
        const morePanel = el('div', 'ewt-footer-more');
        const moreToggle = el('button', 'ewt-footer-more-toggle', {
            type: 'button',
            textContent: '展开更多 ▾',
            title: '推荐微课 / 导出',
        });
        moreToggle.addEventListener('click', () => {
            const open = morePanel.classList.toggle('open');
            moreToggle.textContent = open ? '收起 ▴' : '展开更多 ▾';
        });

        {
            const seen = new Set();
            const allLessons = [];
            results.forEach((r) => (r.lessons || []).forEach((l) => {
                const k = String(l.lessonId);
                if (k && !seen.has(k)) { seen.add(k); allLessons.push(l); }
            }));
            if (allLessons.length) {
                const wrap = el('div');
                wrap.style.cssText = 'margin-top:10px;padding-top:8px;border-top:1px solid #eee;font-size:12px;color:#666';
                wrap.appendChild(txt('本卷关联 ' + allLessons.length + ' 个推荐微课，逐个打开观看：'));
                const btnRow = el('div');
                btnRow.style.cssText = 'margin-top:6px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap';
                allLessons.forEach((l, i) => {
                    const href = buildLessonUrl(l);
                    if (!href) return;
                    const a = el('a', '', { href, target: '_blank', rel: 'noopener' });
                    a.style.cssText = 'padding:4px 8px;background:#eef4fb;color:#2c6fb5;border-radius:4px;text-decoration:none;font-size:11px';
                    a.textContent = (i + 1) + '. ' + l.title + ' · ' + l.time;
                    btnRow.appendChild(a);
                });
                wrap.appendChild(btnRow);
                morePanel.appendChild(wrap);
            }
        }

        // 导出 Markdown。用本地时间，toISOString 是 UTC，会和用户看到的时间差几小时。
        const mdMeta = () => {
            const d = new Date();
            const p = (n) => String(n).padStart(2, '0');
            const ymd = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
            const hms = p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
            return {
                paperId,
                bizCode: submitBizCode,
                exportedAt: ymd + ' ' + hms,
                url: location.href,
                stamp: ymd + '_' + hms.replace(/:/g, '-'),
            };
        };

        const mdBtn = el('button', 'ewt-btn-submit', { textContent: '导出 Markdown' });
        mdBtn.style.background = '#27ae60';
        mdBtn.addEventListener('click', () => {
            const meta = mdMeta();
            const md = resultsToMarkdown(results, meta);
            const name = 'EWT-答案-' + (paperId || 'paper') + '-' + meta.stamp + '.md';
            // Blob + createObjectURL，不需要额外 @grant
            const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown;charset=utf-8' }));
            const a = el('a', '', { href: url, download: name });
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            // 立刻 revoke 会让部分浏览器的下载中断，延后回收
            setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 4000);
            mdBtn.textContent = '已导出 ' + results.length + ' 题';
            setTimeout(() => { mdBtn.textContent = '导出 Markdown'; }, 2500);
        });
        morePanel.appendChild(mdBtn);

        footer.appendChild(moreToggle);
        footer.appendChild(morePanel);

        modal.appendChild(footer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // 收起
        const minimize = () => {
            overlay.classList.add('minimized');
            bubble.classList.add('show');
        };
        minimizeBtn.addEventListener('click', minimize);

        // 气泡展开
        bubble.onclick = () => {
            overlay.classList.remove('minimized');
            bubble.classList.remove('show');
        };

        // 关闭
        const close = () => {
            overlay.remove();
            bubble.classList.remove('show');
        };
        closeBtn.addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay && !overlay.classList.contains('minimized')) close();
        });
        document.addEventListener('keydown', function esc(e) {
            if (e.key === 'Escape' && !overlay.classList.contains('minimized')) {
                close();
                document.removeEventListener('keydown', esc);
            }
        });

        // 提交
        if (submitBtn) {
            submitBtn.addEventListener('click', async () => {
                // 作业页提交=用当前选择把作业正式交卷，必须显式确认，防止误触
                if (isHomework && typeof confirm !== 'undefined' && !confirm('作业页提交会用当前选择的答案把作业正式交卷，确定继续？')) {
                    return;
                }
                submitBtn.disabled = true;
                submitBtn.textContent = '\u6b63\u5728\u63d0\u4ea4...';
                submitMsg.textContent = '';
                try {
                    const ok = await submitAnswers(paperId, platform, questions, choiceAnswers, submitBizCode);
                    submitMsg.textContent = ok ? '\u63d0\u4ea4\u6210\u529f!' : '\u63d0\u4ea4\u5931\u8d25';
                    submitMsg.style.color = ok ? '#27ae60' : '#e74c3c';
                    if (ok) submitBtn.remove();
                } catch (err) {
                    submitMsg.textContent = '\u63d0\u4ea4\u51fa\u9519: ' + err.message;
                    submitMsg.style.color = '#e74c3c';
                    submitBtn.disabled = false;
                    submitBtn.textContent = '\u91cd\u8bd5\u63d0\u4ea4';
                }
            });
        }
    };

    // ==================== 设置面板 ====================
    const showSettings = () => {
        document.querySelectorAll('.ewt-settings').forEach(el => el.remove());
        const div = el('div', 'ewt-settings');

        const h1 = el('h1', '', { textContent: 'EWT\u7b54\u6848\u83b7\u53d6\u8bbe\u7f6e' });
        const h2 = el('h2', '', { textContent: '\u8bf7\u586b\u5199 token\uff0c\u7528\u4e8e API \u9274\u6743' });
        const h3 = el('h3', '', { textContent: '\u5982\u4f55\u83b7\u5f97?' });

        const p1 = el('p');
        p1.appendChild(txt('\u6253\u5f00\u6d4f\u89c8\u5668\u5f00\u53d1\u8005\u5de5\u5177(F12) \u2192 Network \u2192 \u4efb\u610f\u4e00\u4e2a gateway.ewt360.com \u7684\u8bf7\u6c42 \u2192 Request Headers \u2192 \u590d\u5236 token \u5b57\u6bb5\u7684\u503c'));
        p1.appendChild(el('br'));
        const b = el('b', '', { textContent: '\u683c\u5f0f\u7c7b\u4f3c xxxxx-x-xxxxxxxxxxxxx' });
        p1.appendChild(b);

        const labelToken = el('label', '', { textContent: 'token\uff1a', htmlFor: 'token' });
        const tokenInput = el('input', '', { type: 'password', id: 'token', value: GM_getValue('ewtToken', '') });
        const toggleBtn = el('button', '', { textContent: '\u663e\u793a', id: 'toggleToken' });
        toggleBtn.addEventListener('click', () => {
            if (tokenInput.type === 'password') {
                tokenInput.type = 'text';
                toggleBtn.textContent = '\u9690\u85cf';
            } else {
                tokenInput.type = 'password';
                toggleBtn.textContent = '\u663e\u793a';
            }
        });

        const btnRow = el('div');
        const saveBtn = el('button', '', { textContent: '\u4fdd\u5b58', id: 'saveSettings' });
        const cancelBtn = el('button', '', { textContent: '\u53d6\u6d88', id: 'cancelSettings' });
        btnRow.appendChild(saveBtn);
        btnRow.appendChild(cancelBtn);

        const infoDiv = el('div');
        const verP = el('p', '', { textContent: 'Ver.' + Version + ' 2026.8' });
        const authorP = el('p', '', { textContent: 'By:\u5fd7\u6210\uD83C\uDF52 ZCROM \u00B7 \u77E5\u8BC6pro' });
        const linkHome = el('a', '', { href: 'https://zhicheng233.top', textContent: '\u4e3b\u9875' });
        const linkBlog = el('a', '', { href: 'https://blog.zhicheng233.top', textContent: '\u4e2a\u4eba\u535a\u5ba2' });
        const linkGh = el('a', '', { href: 'https://github.com/zhicheng233/GetEWTAnswers', textContent: 'Github' });
        const donateP = el('p');
        donateP.appendChild(txt('\u8bf7\u5f00\u53d1\u8005\u6253\u4e00\u5c40 maimai \u6216\u8005\u8bf7\u5f00\u53d1\u8005\u4e70 \u7cd6\uD83C\uDF6c \u5982\u4f55\uff1f'));
        const donateA = el('a', '', { href: 'https://zhicheng233.top/Donate/', textContent: '\u5e2e\u5e2e\u54b1\ud83e\udd7a~' });
        donateP.appendChild(donateA);

        infoDiv.appendChild(verP);
        infoDiv.appendChild(authorP);
        infoDiv.appendChild(linkHome);
        infoDiv.appendChild(txt(' '));
        infoDiv.appendChild(linkBlog);
        infoDiv.appendChild(txt(' '));
        infoDiv.appendChild(linkGh);
        infoDiv.appendChild(donateP);

        [h1, h2, h3, p1, labelToken, tokenInput, toggleBtn, btnRow, infoDiv].forEach(e => div.appendChild(e));

        document.body.appendChild(div);

        saveBtn.addEventListener('click', () => {
            GM_setValue('ewtToken', tokenInput.value);
            div.remove();
        });
        cancelBtn.addEventListener('click', () => div.remove());
    };

    // ==================== token 自动获取 ====================
    // cookie / localStorage / sessionStorage 全量扫描
    function scanStores() {
        const hits = [];
        document.cookie.split(';').forEach((kv) => {
            const i = kv.indexOf('=');
            if (i <= 0) return;
            let v = kv.slice(i + 1).trim();
            try { v = decodeURIComponent(v); } catch (e) { }
            hits.push(v);
        });
        [localStorage, sessionStorage].forEach((st) => {
            if (!st) return;
            for (let i = 0; i < st.length; i++) {
                try { hits.push(st.getItem(st.key(i)) || ''); } catch (e) { }
            }
        });

        for (const v of hits) if (TOKEN_RE.test(v)) return v;
        for (const v of hits) {
            if (!v || v.length > 20000) continue;
            const m = v.match(/"(?:token|accessToken|ewtToken)"\s*:\s*"([^"]{10,})"/);
            if (m && TOKEN_RE.test(m[1])) return m[1];
        }
        for (const v of hits) {
            if (!v || v.length > 20000) continue;
            const m = v.match(TOKEN_LOOSE);
            if (m) return m[0];
        }
        return '';
    }

    // 综合获取：缓存 → 存储扫描 → 等待嗅探
    function resolveToken(timeoutMs) {
        const cached = GM_getValue('ewtToken', '');
        if (TOKEN_RE.test(cached)) return Promise.resolve(cached);
        const scanned = scanStores();
        if (scanned) { GM_setValue('ewtToken', scanned); return Promise.resolve(scanned); }
        if (sniffedToken) return Promise.resolve(sniffedToken);
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                const late = scanStores();
                if (late) { GM_setValue('ewtToken', late); resolve(late); }
                else resolve('');
            }, timeoutMs || 10000);
            tokenWaiters.push((tk) => { clearTimeout(timer); resolve(tk); });
        });
    }

    // ==================== 初始化 ====================
    let token = cookieToken;

    whenReady(() => {
        const settingsBtn = el('button', '', { textContent: 'EWT\u8bbe\u7f6e' });
        settingsBtn.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;padding:6px 12px;border-radius:6px;border:1px solid #ccc;background:#fff;cursor:pointer;';
        settingsBtn.addEventListener('click', showSettings);
        document.body.appendChild(settingsBtn);

        const retryBtn = el('button', '', { textContent: '重新获取' });
        retryBtn.style.cssText = 'position:fixed;top:10px;right:90px;z-index:9999;padding:6px 12px;border-radius:6px;border:1px solid #ccc;background:#fff;cursor:pointer;';
        retryBtn.addEventListener('click', () => { GM_setValue('ewtToken', ''); sniffedToken = ''; main(); });
        document.body.appendChild(retryBtn);
    });

    // ==================== URL 参数 ====================
    // 脚本 @run-at document-start：SPA 可能稍后才把 reportId 写进地址栏。
    // 所以不能只在加载时读一次；runMain 每次都重新解析 location.href。
    const parseUrlParams = (href, search, hash) => {
        const urlParams = {};
        const ingest = (qs) => {
            if (!qs) return;
            String(qs).split('&').forEach((item) => {
                const i = item.indexOf('=');
                if (i <= 0) return;
                const k = item.slice(0, i);
                if (urlParams[k]) return;
                const raw = item.slice(i + 1);
                try { urlParams[k] = decodeURIComponent(raw); } catch (e) { urlParams[k] = raw; }
            });
        };
        const fromSeg = (seg) => {
            if (!seg) return;
            ingest(seg.includes('?') ? seg.slice(seg.indexOf('?') + 1) : String(seg).replace(/^[?#]/, ''));
        };
        // href 整段（1.1 的做法）+ search + hash，谁先出现用谁
        if (href) {
            const qi = String(href).indexOf('?');
            if (qi >= 0) ingest(String(href).slice(qi + 1).replace(/#.*$/, ''));
        }
        fromSeg(search);
        fromSeg(hash);
        return urlParams;
    };

    let paperId, platform, homeworkId, isHomework, urlReportId, submitBizCode;

    const applyUrlParams = () => {
        const loc = window.location || {};
        const urlParams = parseUrlParams(loc.href || '', loc.search || '', loc.hash || '');
        paperId = urlParams.paperId;
        platform = urlParams.platform || '1';
        homeworkId = urlParams.homeworkId || '0';
        isHomework = !!(homeworkId && homeworkId !== '0');
        urlReportId = urlParams.reportId || '';
        submitBizCode = urlParams.bizCode || '205';
        return urlParams;
    };
    applyUrlParams();

    // ==================== API ====================
    const apiHeaders = () => ({
        'Content-Type': 'application/json',
        'token': token,
        'User-Agent': UA,
    });

    // hwOverride: 传字符串则用该 homeworkId；传 false/跳过则不带作业 id（1.1 旁路）。
    // 作业页正式 report 绝不能 submitpaper；旁路是另建的 201 临时 report + homeworkId:'0'。
    const getReportId = async (bizCode, hwOverride) => {
        let hw = '';
        if (hwOverride === false || hwOverride === '0') {
            hw = '';
        } else if (typeof hwOverride === 'string') {
            hw = '&homeworkId=' + hwOverride;
        } else if (homeworkId && homeworkId !== '0') {
            hw = '&homeworkId=' + homeworkId;
        }
        const url = `${BASE}/api/answerprod/web/answer/report?paperId=${paperId}&platform=${platform}&bizCode=${bizCode}${hw}&token=${token}`;
        const resp = await fetch(url, { headers: { 'User-Agent': UA } });
        const data = await resp.json();
        RAW.push({ api: 'report', ok: !!data.success, bizCode, hwOverride: hwOverride === undefined ? null : hwOverride, resp: data });
        if (!data.success) throw new Error('创建 report 失败: ' + JSON.stringify(data).slice(0, 300));
        // 作业页上 data.data 可能不是 {reportId} 而是 ID 本身，兼容两种形状；
        // 拿不到就抛描述性错误，而不是把空 reportId 一路带下去（服务端报"报告id不能为空"）
        const rid = data.data && typeof data.data === 'object' ? data.data.reportId : data.data;
        if (!rid) throw new Error('创建 report 未返回 reportId，原始返回见 window.__EWT_RAW: ' + JSON.stringify(data).slice(0, 300));
        return rid;
    };

    //因为另外一个questionId接口需要userId
    const getUserId = async () => {
        const url = `${BASE}/api/usercenter/user/baseinfo`;
        const resp = await fetch(url, { headers: apiHeaders() });
        const data = await resp.json();
        if (!data.success) throw new Error(JSON.stringify(data));
        return data.data.userId;
    }

    const getQuestions = async (reportId, bizCode, hwId) => {
        const hw = hwId != null ? hwId : homeworkId;
        const url = `${BASE}/api/answerprod/common/answer/sheet/getAnswerSheetSubGroup`;
        const body = { paperId, reportId, platform, bizCode, homeworkId: hw, client: 4 };
        const resp = await fetch(url, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) });
        const data = await resp.json();
        const questions = [];
        if (!data.success) {
            //另一个API,如果是非题组会到这，实际上应该有方法去判断该界面是不是题组的，但我懒得去看了，直接失败就用另一个API(
            RAW.push({ api: 'getAnswerSheetSubGroup', ok: false, resp: data });
            const userId = await getUserId();
            const url2 = `${BASE}/api/answerprod/common/answer/answerSheetInfo`;
            const body2 = { paperId, reportId, platform, bizCode, userId, homeworkId: hw, client: 1 };
            const resp2 = await fetch(url2, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body2) });
            const data2 = await resp2.json();
            RAW.push({ api: 'answerSheetInfo', ok: !!data2.success, resp: data2 });

            // data.data 可能是 null（作业页 report 对不上时），不要直接 .questionInfoList 崩掉
            const list = data2 && data2.data && data2.data.questionInfoList;
            if (!list) {
                throw new Error('获取题目列表失败，原始返回已存入 window.__EWT_RAW：' + JSON.stringify(data2).slice(0, 300));
            }
            for (const q of list) {
                questions.push({
                    questionId: q.questionId,
                    questionNumber: q.questionNumber,
                    cateId: q.cateId || 1,
                    subjective: q.subjective || false,
                    groupName: '',
                });
            }
            return questions;

        } else {
            RAW.push({ api: 'getAnswerSheetSubGroup', ok: true, resp: data });
            for (const group of data.data.groupQuestionList) {
                for (const q of group.questionList) {
                    questions.push({
                        questionId: q.questionId,
                        questionNumber: q.questionNumber,
                        cateId: q.cateId || 1,
                        subjective: q.subjective || false,
                        groupName: group.groupName || '',
                    });
                }
            }
            return questions;
        }
    };

    // 按 questionId 去重，避免题组接口返回重叠条目
    const dedupe = (list) => {
        const seen = new Set();
        return list.filter((q) => {
            const k = String(q.questionId);
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });
    };

    // opts.tempBypass: 对「无作业绑定的临时 201 report」交卷（homeworkId 固定 '0'）。
    // 仍禁止对作业页 URL 自带的正式 reportId 交卷。
    const updateReport = async (reportId, bizCode, opts) => {
        const tempBypass = !!(opts && opts.tempBypass);
        if (isHomework && !tempBypass) throw new Error('作业页禁止 submitpaper（会真交卷），已拦截');
        if (tempBypass && urlReportId && String(reportId) === String(urlReportId)) {
            throw new Error('拒绝：临时旁路 reportId 与作业正式 reportId 相同，已拦截');
        }
        const url = `${BASE}/api/answerprod/web/answer/submitpaper`;
        const body = {
            paperId, reportId, bizCode, platform, totalSeconds: 600,
            homeworkId: tempBypass ? '0' : homeworkId,
        };
        const resp = await fetch(url, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) });
        const data = await resp.json();
        RAW.push({ api: 'submitpaper', ok: !!data.success, tempBypass, resp: data });
        if (!data.success) throw new Error(JSON.stringify(data));
    };

    // 收集原始返回，便于排查字段缺失
    const RAW = [];

    const getAnswer = async (reportId, questionId, bc, hwId) => {
        const url = `${BASE}/api/answerprod/web/answer/simple/question/analysis`;
        const body = {
            paperId, reportId, platform, questionId, bizCode: bc,
            homeworkId: hwId != null ? hwId : homeworkId,
            client: 4,
        };
        const resp = await fetch(url, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) });
        const data = await resp.json();
        RAW.push({ questionId, ok: !!data.success, resp: data });
        if (!data.success) { console.warn('[EWT] analysis 失败', questionId, data); return null; }
        return data.data;
    };

    // 作业页专用取答案：报告页的「逐题订正」接口。
    // 关键发现（2026-08-05 白盒实验）：答题页接口 question/analysis 在未交卷时被服务端扣答案，
    // 但报告页接口 proofread/question 在【未交卷】状态下就返回：
    //   · 全部题目的 analyse（解析全漏）
    //   · 主观题的完整 rightAnswer
    //   · 客观题 rightAnswer 字段被扣空，但答案写在解析尾句（「故本题选C」），另行提取。
    // 只读 GET，绝不触发任何提交，作业保持未交卷。
    const getAnswerProofread = async (reportId, questionId, bc) => {
        const qs = `paperId=${encodeURIComponent(paperId)}&reportId=${encodeURIComponent(reportId)}` +
            `&platform=${encodeURIComponent(platform)}&questionId=${encodeURIComponent(questionId)}` +
            `&smallQuestionId=${encodeURIComponent(questionId)}&bizCode=${encodeURIComponent(bc)}` +
            `&homeworkId=${encodeURIComponent(homeworkId)}`;
        const url = `${BASE}/api/answerprod/app/answer/proofread/question?${qs}`;
        const resp = await fetch(url, { headers: apiHeaders() });
        const data = await resp.json();
        RAW.push({ api: 'proofread', questionId, ok: !!data.success, resp: data });
        if (!data.success) { console.warn('[EWT] proofread 失败', questionId, data); return null; }
        return data.data;
    };

    // 兼容多种字段名，取到第一个非空值
    const pick = (obj, keys) => {
        for (const k of keys) {
            const v = obj && obj[k];
            if (v == null) continue;
            if (Array.isArray(v) ? v.length : String(v).trim()) return v;
        }
        return null;
    };

    const ANALYSIS_KEYS = ['analyse', 'analysis', 'analyseText', 'answerAnalyse', 'answerAnalysis', 'questionAnalyse', 'parse', 'explain', 'explanation'];
    const ANSWER_KEYS = ['rightAnswer', 'answer', 'answers', 'rightAnswers', 'correctAnswer', 'standardAnswer'];

    const submitAnswers = async (pId, pf, qs, ca, bc) => {
        // 作业页同样不能新建 report（返回空壳），直接往 URL 的 reportId 上提交
        const newRid = (isHomework && urlReportId) ? urlReportId : await getReportId(bc);
        const questionList = [];
        for (const q of qs) {
            const qid = q.questionId;
            if (ca.has(qid)) {
                const opts = ca.get(qid);
                const flat = [];
                opts.forEach(opt => flat.push(...opt.split('')));
                questionList.push({
                    id: qid,
                    myAnswers: flat,
                    questionNo: parseInt(q.questionNumber),
                    questionNumber: q.questionNumber,
                    totalSeconds: 0,
                    cateId: q.cateId,
                });
            }
        }
        const url = `${BASE}/api/answerprod/web/answer/submitAnswer`;
        const body = { paperId: pId, reportId: newRid, platform: pf, questionList, bizCode: bc, assignPoints: false, homeworkId };
        const resp = await fetch(url, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) });
        const data = await resp.json();
        return data.success === true;
    };

    // ==================== HTML 清洗（仅保留图片） ====================
    const cleanHtmlKeepImg = (text) => {
        if (!text) return '';
        // 统一重建所有 <img>：只保留白名单 src + style/width/height，丢掉其余属性。
        // 两个目的：
        //  1) 解析文本走 insertAdjacentHTML，原样保留的属性里若有 onerror 就是 XSS 口子；
        //  2) 公式图要保留平台算好的 vertical-align（每个公式的基线偏移各不相同），
        //     同时打上 class 以便和结构式配图分开设样式。
        // 属性值可能含 > （如 alt="a>b"），故用 "非引号或引号包裹段" 反复吞，
        // 而不是 [^>]* —— 后者会在属性值内部的 > 处提前截断，把标签残片漏成文本。
        text = text.replace(/<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi, (tag) => {
            const src = attrOf(tag, 'src');
            if (!/^https?:\/\/file\.ewt360\.com\//.test(src)) return '';
            const isMath = /Wirisformula|data-type\s*=\s*"mathType"/i.test(tag);
            const st = attrOf(tag, 'style');
            const w = attrOf(tag, 'width');
            const h = attrOf(tag, 'height');
            // 小图（结构式量级）跟着文字内联；明显偏大的才独占一行
            const big = (/^\d+$/.test(w) && +w > 240) || (/^\d+$/.test(h) && +h > 80);
            const cls = isMath ? 'ewt-math' : ('ewt-figure' + (big ? ' ewt-block' : ''));
            let out = '<img class="' + cls + '" src="' + normHttps(src) + '"';
            // style 里的实体引号（&quot;）不能在清洗阶段存活：后面的实体解码会把它们
            // 还原成真实引号，突破 style 属性逃逸出 onerror 等注入。
            if (st) out += ' style="' + st.replace(/"/g, '').replace(/&quot;/gi, '') + '"';
            if (!isMath && /^\d+$/.test(w)) out += ' width="' + w + '"';
            if (!isMath && /^\d+$/.test(h)) out += ' height="' + h + '"';
            return out + ' />';
        });
        text = text.replace(/<br[^>]*>/g, '\n');
        text = text.replace(/<(?!img\b|\/img\b)[^>]+>/g, '');
        // 平台返回的富文本里常带 HTML 实体：引号、破折号、省略号、数学符号等。
        // 答案弹窗对非图片文本用 textNode 展示（不会二次解析实体），所以必须在清洗阶段转成真实字符。
        text = text.replace(/&nbsp;/g, ' ')
            .replace(/&ldquo;/g, '\u201c').replace(/&rdquo;/g, '\u201d')
            .replace(/&lsquo;/g, '\u2018').replace(/&rsquo;/g, '\u2019')
            .replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013')
            .replace(/&hellip;/g, '\u2026')
            .replace(/&middot;/g, '\u00b7')
            .replace(/&times;/g, '\u00d7').replace(/&divide;/g, '\u00f7')
            .replace(/&laquo;/g, '\u00ab').replace(/&raquo;/g, '\u00bb')
            .replace(/&copy;/g, '\u00a9').replace(/&reg;/g, '\u00ae')
            .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
            .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
        text = text.replace(/\n{3,}/g, '\n\n');
        return text.trim();
    };

    const extractOpts = (rightAnswer) => {
        if (!rightAnswer || !Array.isArray(rightAnswer)) return [];
        return rightAnswer.filter(x => /^[A-Z]+$/.test(x.trim())).map(x => x.trim());
    };

    // 客观题在未交卷作业里 rightAnswer 被扣空，但解析尾句通常写明答案。
    // 措辞随学科而变，实测见过：
    //   · 政治卷：「故本题选C」——选后直接跟字母
    //   · 数学卷：「故选：B．」——选后夹全角冒号
    // 两类触发词分开约束，避免误命中叙述性文字：
    //   分支①「选/应选」是动词，后面直接跟字母就是强信号，连接符可有可无
    //          （只允许冒号/空白，不允许「为/是」，否则「选择」「选项」会被沾上）。
    //   分支②「(正确)答案/(正确)选项」是名词，必须有连接符「为/是/冒号」才算，
    //          否则「答案A是干扰项」这种叙述会把 A 误当答案。
    // 取最后一处匹配：解析常先逐项分析、结论写在末尾，末尾那个才是正解。
    const extractChoiceFromAnalysis = (analysisText) => {
        if (!analysisText) return '';
        const plain = String(analysisText).replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ');
        const re = /(?:故?选|应选)[：:\s]*([A-H]{1,4})(?![A-Za-z])|(?:正确)?(?:答案|选项)[为是：:\s]+([A-H]{1,4})(?![A-Za-z])/g;
        let m, last = '';
        while ((m = re.exec(plain)) !== null) last = m[1] || m[2];
        return last;
    };

    // ==================== 导出 Markdown ====================
    // results[].answer / .analysis 已经过 cleanHtmlKeepImg：纯文本 + 白名单 <img>。
    // 这里把 <img> 换成 Markdown 图片语法，其余文本转义掉 Markdown 元字符。
    const mdEscape = (s) => String(s)
        .replace(/([\\`*_[\]<>])/g, '\\$1')
        // 行首的 "1. " "- " "# " "> " 会被解析成列表/标题/引用，只在行首转义
        .replace(/^(\s*)(\d+)\. /gm, '$1$2\\. ')
        // 转义符必须在标记字符之前："\- 一" 才能失效，"-\ 一" 仍会开出列表
        .replace(/^(\s*)([-+#]) /gm, '$1\\$2 ');

    // Markdown 的换行需要行尾两个空格才算硬换行，否则多空填空会被合并成一行
    const mdHardBreaks = (s) => s.replace(/\n/g, '  \n');

    const htmlToMd = (html) => {
        if (!html) return '';
        const IMG = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
        let out = '';
        let last = 0;
        let m;
        while ((m = IMG.exec(html)) !== null) {
            out += mdEscape(html.slice(last, m.index));
            const src = attrOf(m[0], 'src');
            if (/^https?:\/\/file\.ewt360\.com\//.test(src)) {
                const isMath = /ewt-math|Wirisformula|data-type\s*=\s*"mathType"/i.test(m[0]);
                out += '![' + (isMath ? '公式' : '图片') + '](' + normHttps(src) + ')';
            }
            last = m.index + m[0].length;
        }
        out += mdEscape(html.slice(last));
        return mdHardBreaks(out);
    };

    const resultsToMarkdown = (results, meta) => {
        const info = meta || {};
        const lines = [];
        lines.push('# 试题答案' + (info.paperId ? '（试卷 ' + info.paperId + '）' : ''));
        lines.push('');
        lines.push('- 题数：' + results.length);
        if (info.exportedAt) lines.push('- 导出时间：' + info.exportedAt);
        if (info.url) lines.push('- 来源：' + info.url);
        lines.push('');
        lines.push('---');
        lines.push('');

        results.forEach((r) => {
            lines.push('## ' + mdEscape('[' + r.num + ']' + (r.group ? ' ' + r.group : '')));
            lines.push('');
            lines.push('**答案**');
            lines.push('');
            lines.push(htmlToMd(r.answer) || '(未返回答案)');
            lines.push('');
            if (r.knowledge) {
                lines.push('**知识点**：' + mdEscape(r.knowledge));
                lines.push('');
            }
            if (r.analysis) {
                lines.push('**解析**');
                lines.push('');
                lines.push(htmlToMd(r.analysis));
                lines.push('');
            }
            if (r.images && r.images.length) {
                r.images.forEach((src) => {
                    if (/^https?:\/\/file\.ewt360\.com\//.test(src)) {
                        lines.push('![附图](' + src + ')');
                        lines.push('');
                    }
                });
            }
            if (r.lessons && r.lessons.length) {
                lines.push('**推荐微课**');
                lines.push('');
                r.lessons.forEach((l) => {
                    const href = buildLessonUrl(l);
                    const label = mdEscape(l.title || '微课') + (l.time ? '（' + l.time + '）' : '');
                    lines.push(href ? '- [' + label + '](' + href + ')' : '- ' + label);
                });
                lines.push('');
            }
        });

        return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
    };

    // ==================== 主流程 ====================
    const toast = (msg, color) => {
        let t = document.getElementById('ewt-toast');
        if (!t) {
            t = el('div', '', { id: 'ewt-toast' });
            t.style.cssText = 'position:fixed;top:50px;right:10px;z-index:100001;padding:8px 14px;border-radius:6px;background:#333;color:#fff;font-size:13px;box-shadow:0 2px 10px rgba(0,0,0,.3);';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.style.background = color || '#333';
        clearTimeout(t._tm);
        t._tm = setTimeout(() => t.remove(), 4000);
    };

    let running = false;
    const main = async () => {
        if (running) return;
        running = true;
        try { await runMain(); } finally { running = false; }
    };

    const runMain = async () => {
        RAW.length = 0;
        // applyUrlParams();  review: 实际上多此一举了，直接让其重定向到带reportId的URL后再进行操作，而不是失败了再进行检测
        // 作业页 SPA 有时先落到无 reportId 的地址，再 replaceState 补上。短等一会儿。
        // if (isHomework && !urlReportId) {
        // review:说实话，我没看明白@zspro的Agent在这里加个isHomework的意义是什么,因为当URL匹配/answer-pc/exam/answer?的时候就保证了该界面一定是作答界面
        // 加个isHomework会导致才处理 练习 的时候因为没有 homeworkId 而导致无法进入applyUrlParams();
        if (!urlReportId) {
            const t0 = Date.now();
            while (!urlReportId && Date.now() - t0 < 2500) {
                await new Promise((r) => setTimeout(r, 200));
                applyUrlParams();
            }
        }
        console.log('[EWT] v' + Version + ' homeworkId=' + homeworkId + ' reportId=' + urlReportId +
            ' isHomework=' + isHomework + ' href=' + (window.location && window.location.href));
        if (!paperId) {
            toast('\u672a\u627e\u5230 paperId\uff0c\u8bf7\u5728\u8bd5\u9898\u4f5c\u7b54\u9875\u8fd0\u884c', '#e74c3c');
            return;
        }
        toast('\u6b63\u5728\u81ea\u52a8\u83b7\u53d6 token...');
        token = await resolveToken(10000);

        if (!token) {
            toast('\u81ea\u52a8\u83b7\u53d6 token \u5931\u8d25\uff0c\u8bf7\u624b\u52a8\u8bbe\u7f6e', '#e74c3c');
            showSettings();
            return;
        }
        toast('token \u5df2\u5c31\u7eea\uff0c\u6b63\u5728\u62c9\u53d6\u7b54\u6848...', '#27ae60');

        try {
            // 取答案两条路：
            //  A) 新建 bizCode=201 临时 report → submitpaper(homeworkId:'0') → question/analysis
            //     （志成 1.1 的做法；作业页也常能走通，且 analysis 会带满 childQuestions + rightAnswer）
            //  B) 作业页回退：复用 URL 正式 reportId + proofread（绝不对正式 report submitpaper）
            // 普通答题页只走 A。作业页优先 A，失败再 B。
            let rid, qBiz, fetchHw, useProofread = false, mode = '';
            let questions;

            if (isHomework) {
                // 作业 URL 经常没有 reportId（例如只带 homeworkId+paperId）。
                // 201 旁路不依赖它，必须先试；proofread 才需要 URL 上的正式 reportId。
                try {
                    rid = await getReportId(BIZ_VIEW, false);
                    qBiz = BIZ_VIEW;
                    fetchHw = '0';
                    questions = dedupe(await getQuestions(rid, qBiz, fetchHw));
                    if (!questions.length) throw new Error('201 旁路答题卡为空');
                    await updateReport(rid, BIZ_VIEW, { tempBypass: true });
                    mode = 'homework-201-bypass';
                } catch (bypassErr) {
                    console.warn('[EWT] 作业页 201 旁路失败:', bypassErr && bypassErr.message);
                    if (!urlReportId) {
                        throw new Error('作业页 201 旁路失败，且 URL 缺少 reportId，无法回退 proofread: ' +
                            (bypassErr && bypassErr.message ? bypassErr.message : String(bypassErr)));
                    }
                    rid = urlReportId;
                    qBiz = submitBizCode;
                    fetchHw = homeworkId;
                    useProofread = true;
                    mode = 'homework-proofread';
                    questions = dedupe(await getQuestions(rid, qBiz, fetchHw));
                }
            } else {
                rid = await getReportId(BIZ_VIEW);
                qBiz = BIZ_VIEW;
                fetchHw = homeworkId;
                useProofread = false;
                mode = 'normal-201';
                questions = dedupe(await getQuestions(rid, qBiz, fetchHw));
                await updateReport(rid, BIZ_VIEW);
            }

            console.log('[EWT] mode=' + mode + ' bizCode=' + qBiz + ' reportId=' + rid +
                ' hw=' + fetchHw + ' \u9898\u76ee\u6570=' + questions.length, questions);

            const choiceAnswers = new Map();
            const results = [];

            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                const ans = useProofread
                    ? await getAnswerProofread(rid, q.questionId, qBiz)
                    : await getAnswer(rid, q.questionId, qBiz, fetchHw);
                if (!ans) continue;

                // 题组：父题字段为空，答案/解析挂在 childQuestions 上
                const asArr = (v) => (v == null ? [] : (Array.isArray(v) ? v : [String(v)]));
                let rawArr = asArr(pick(ans, ANSWER_KEYS));
                let rawAnalysisSrc = pick(ans, ANALYSIS_KEYS);
                let fromKids = false;   // 数组来自子题（每项=一空）还是本题的多选答案

                const kids = Array.isArray(ans.childQuestions) ? ans.childQuestions : [];
                if (kids.length) {
                    // 子题只提供原始内容，编号统一交给下面的多空分支处理。
                    // 这里若自己先编一遍号，会和多空编号叠加成 "(1) (1) xxx"。
                    const kidAns = [];
                    const kidAna = [];
                    kids.forEach((c, ci) => {
                        const a = asArr(pick(c, ANSWER_KEYS));
                        if (a.length) kidAns.push(a.join(' / '));
                        const an = pick(c, ANALYSIS_KEYS);
                        if (an) kidAna.push('(' + (ci + 1) + ') ' + String(an));
                    });
                    if (!rawArr.length && kidAns.length) { rawArr = kidAns; fromKids = true; }
                    if (!rawAnalysisSrc && kidAna.length) rawAnalysisSrc = kidAna.join('\n');
                }

                // 题组的字母来自各子题（每题一个空），不是本题的多选答案：
                // 既不能提交为一题的 myAnswers，也不能合并成 "A | D | C" 丢掉空号。
                const opts = fromKids ? [] : extractOpts(rawArr);
                if (opts.length && !q.subjective) {
                    choiceAnswers.set(q.questionId, opts);
                }

                let answerStr;
                if (opts.length) {
                    answerStr = opts.map(o => o.split('').join(', ')).join('  |  ');
                } else if (rawArr.length === 1) {
                    answerStr = cleanHtmlKeepImg(rawArr[0]);
                } else if (rawArr.length) {
                    // 多空填空：逐空编号并各占一行，否则 9 个空挤成一行无法对应题号。
                    // 某项答案自带“(1)”“（1）”序号时，是否再叠加外层序号取决于来源：
                    //  · 题组（fromKids）——每个子题是一道独立题目，即使答案自带小序号
                    //    （如文言文翻译的（1）（2）句）也必须带上外层题号，否则题号会
                    //    从 (3) 直接跳到 (5)，与解析的“(4) （1）关键字词”同一格式；
                    //  · 多空填空——同一题内的多个空，答案自带序号时再加外层才是真重复
                    //    （叠成“(1) (1) take advantage of”）。
                    answerStr = rawArr
                        .map((x, xi) => {
                            const cleaned = cleanHtmlKeepImg(x);
                            const hasOwnNumber = /^\s*(?:\(\d+\)|（\d+）)/.test(cleaned);
                            return (fromKids || !hasOwnNumber) ? '(' + (xi + 1) + ') ' + cleaned : cleaned;
                        })
                        .join('\n');
                } else {
                    // \u5ba2\u89c2\u9898\u7684 rightAnswer \u5728\u672a\u4ea4\u5377\u4f5c\u4e1a\u91cc\u88ab\u670d\u52a1\u7aef\u6263\u7a7a\uff08\u524d\u7aef\u5ba1\u8ba1\u786e\u8ba4\uff1a\u95e8\u63a7\u5728\u670d\u52a1\u7aef\uff0c
                    // \u975e\u524d\u7aef\u9690\u85cf\uff09\u3002\u653f\u6cbb/\u6570\u5b66\u7684\u89e3\u6790\u5c3e\u53e5\u5199\u4e86\u660e\u6587\u7b54\u6848\uff08\u300c\u6545\u672c\u9898\u9009C\u300d\uff09\uff0c\u80fd\u63d0\u53d6\u5e76\u6807\u6ce8\u6765\u6e90\uff1b
                    // \u82f1\u8bed\u542c\u529b/\u9605\u8bfb\u7684\u89e3\u6790\u53ea\u6709\u539f\u6587/\u5927\u610f\u3001\u4e0d\u542b\u660e\u6587\u7b54\u6848\uff0c\u63d0\u53d6\u4e0d\u5230\u3002
                    // \u63d0\u53d6\u4e0d\u5230\u65f6\u522b\u53ea\u4e22\u300c(\u672a\u8fd4\u56de\u7b54\u6848)\u300d\u8ba9\u4eba\u4ee5\u4e3a\u811a\u672c\u574f\u4e86\uff1a\u6709\u89e3\u6790\u5c31\u5f15\u5bfc\u770b\u4e0b\u65b9\u89e3\u6790\u81ea\u884c\u5224\u65ad\u3002
                    const derived = extractChoiceFromAnalysis(rawAnalysisSrc);
                    if (derived) {
                        answerStr = derived.split('').join(', ') + '\uff08\u7531\u89e3\u6790\u63a8\u5f97\uff09';
                    } else if (rawAnalysisSrc && String(rawAnalysisSrc).trim()) {
                        answerStr = '\u26a0\ufe0f \u89e3\u6790\u672a\u542b\u660e\u6587\u7b54\u6848\uff0c\u89c1\u4e0b\u65b9\u89e3\u6790/\u539f\u6587\uff0c\u53ef\u81ea\u884c\u5224\u65ad';
                    } else {
                        answerStr = '(\u672a\u8fd4\u56de\u7b54\u6848)';
                    }
                }

                const rawAnalysis = rawAnalysisSrc;
                const images = (ans.attachmentImages || []).length ? ans.attachmentImages : [];

                results.push({
                    // questionNumber 可能是 "0"（题组），"0" 为真值故需显式判断
                    num: (q.questionNumber && String(q.questionNumber) !== '0')
                        ? q.questionNumber : (i + 1),
                    group: q.groupName || ans.subjectQuestionTypeName || '',
                    answer: answerStr,
                    knowledge: (ans.knowledges || []).map(k => k.title).join('\u3001')
                        || ans.knowledgeTitle || '',
                    analysis: cleanHtmlKeepImg(rawAnalysis == null ? '' : String(rawAnalysis)),
                    images,
                    lessons: (ans.lessons || []).map(l => ({
                        title: l.videoTitle, time: l.playTime, url: l.url,
                        courseId: l.courseId, lessonId: l.lessonId,
                        ratio: Number(l.playRatio || 0),
                    })),
                });
            }

            const noAns = results.filter(r => r.answer === '(\u672a\u8fd4\u56de\u7b54\u6848)').length;
            const noAna = results.filter(r => !r.analysis).length;
            // \u6709\u89e3\u6790\u4f46\u63d0\u4e0d\u51fa\u660e\u6587\u7b54\u6848\uff08\u82f1\u8bed\u542c\u529b/\u9605\u8bfb\u90a3\u7c7b\uff09\uff0c\u8bd5\u9898\u4e32\u4ee5 \u26a0\ufe0f \u5f00\u5934\u3002
            // \u65e2\u4e0d\u662f\u7a7a\u58f3\uff08\u4e0d\u8ba1 noAns\uff09\u4e5f\u4e0d\u662f\u6ca1\u89e3\u6790\uff08\u4e0d\u8ba1 noAna\uff09\uff0c\u5355\u72ec\u8ba1\u6570\u3002
            const needSelfJudge = results.filter(r => typeof r.answer === 'string' && r.answer.indexOf('\u26a0\ufe0f') === 0).length;
            if (noAns || noAna || needSelfJudge) {
                console.warn('[EWT] mode=' + mode + ' ' + noAns + ' \u9898\u65e0\u7b54\u6848, ' + noAna +
                    ' \u9898\u65e0\u89e3\u6790, ' + needSelfJudge +
                    ' \u9898\u89e3\u6790\u65e0\u660e\u6587\u7b54\u6848(\u9700\u770b\u89e3\u6790\u81ea\u5224)\u3002\u539f\u59cb\u8fd4\u56de\u89c1 window.__EWT_RAW');
            }
            // 同时写沙箱 window 和页面真实 window，供挂机脚本读取推荐微课
            window.__EWT_RAW = RAW;
            try { if (typeof unsafeWindow !== 'undefined') unsafeWindow.__EWT_RAW = RAW; } catch (e) { }

            showAnswerModal(results, choiceAnswers, questions, paperId, platform, submitBizCode);
        } catch (e) {
            // \u5931\u8d25\u65f6\u4e5f\u8981\u628a\u539f\u59cb\u8fd4\u56de\u66b4\u9732\u51fa\u6765\uff0c\u5426\u5219\u8c03\u8bd5\u6309\u94ae\u53ea\u5728\u6210\u529f\u5f39\u7a97\u91cc\u6709
            try {
                window.__EWT_RAW = RAW;
                if (typeof unsafeWindow !== 'undefined') unsafeWindow.__EWT_RAW = RAW;
            } catch (e2) { }
            console.log('[EWT] \u5931\u8d25\u65f6\u7684\u539f\u59cb\u8fd4\u56de\u89c1 window.__EWT_RAW', RAW);
            alert('\u83b7\u53d6\u5931\u8d25: ' + e.message);
            console.error(e);
        }
    };

    whenReady(main);

})();
