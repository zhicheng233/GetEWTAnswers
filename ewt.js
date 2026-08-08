// ==UserScript==
// @name         升学 E 网通 (EWT360) 试题答案获取
// @namespace    https://ewt.zhicheng233.top/examanswer
// @version      1.1
// @description  此脚本在 EWT 试题中获取试题答案（支持图片显示 + 提交答案，自动从Cookie读取token）
// @author       志成🍥
// @match        https://web.ewt360.com/answer-pc/exam/answer*
// @icon         https://web.ewt360.com/favicon.ico
// @license      GNU General Public License
// @grant        none
// @downloadURL  https://update.greasyfork.org/scripts/524802/%E5%8D%87%E5%AD%A6%20E%20%E7%BD%91%E9%80%9A%20%28EWT360%29%20%E8%AF%95%E9%A2%98%E7%AD%94%E6%A1%88%E8%8E%B7%E5%8F%96.user.js
// @updateURL    https://update.greasyfork.org/scripts/524802/%E5%8D%87%E5%AD%A6%20E%20%E7%BD%91%E9%80%9A%20%28EWT360%29%20%E8%AF%95%E9%A2%98%E7%AD%94%E6%A1%88%E8%8E%B7%E5%8F%96.meta.js
// ==/UserScript==

(function () {
    'use strict';

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
.ewt-modal-body .q-ans { color: #e74c3c; margin: 4px 0; }
.ewt-modal-body .q-ans img {
    max-width: 100%; vertical-align: middle; max-height: 40px;
}
.ewt-modal-body .q-parse img {
    max-width: 100%; height: auto; max-height: 220px;
    vertical-align: middle; margin-top: 6px;
}
.ewt-modal-body .q-know { color: #888; font-size: 12px; }
.ewt-modal-body .q-parse { color: #555; font-size: 12px; white-space: pre-wrap; margin-top: 4px; }
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
    document.head.appendChild(styleEl);

    // 全局浮动气泡
    const bubble = document.createElement('button');
    bubble.className = 'ewt-float-bubble';
    bubble.textContent = '答案';
    bubble.title = '展开答案';
    document.body.appendChild(bubble);

    // ==================== Cookie 获取工具：读取 token Cookie ====================
    function getCookie(name) {
        const cookiePairs = document.cookie.split('; ');
        for (const pair of cookiePairs) {
            const [key, val] = pair.split('=');
            if (key === name) return decodeURIComponent(val);
        }
        return '';
    }
    const token = getCookie('token');

    // ==================== 安全 DOM 工具 ====================
    const el = (tag, cls, attrs) => {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (attrs) Object.entries(attrs).forEach(([k, v]) => { if (v != null) e[k] = v; });
        return e;
    };

    const txt = (text) => document.createTextNode(text || '');

    // 将安全的 HTML 字符串（仅含 <img>）转为 DOM 片段
    const safeHtmlToFragment = (htmlStr) => {
        const frag = document.createDocumentFragment();
        if (!htmlStr) return frag;
        // 只放行 <img src="..."> 且 src 必须是 http://file.ewt360.com/ 开头
        const imgRe = /<img\s+src="(https?:\/\/file\.ewt360\.com\/[^"]*)"(?:\s+style="([^"]*)")?\s*\/?>/gi;
        let lastIdx = 0;
        let m;
        while ((m = imgRe.exec(htmlStr)) !== null) {
            if (m.index > lastIdx) {
                frag.appendChild(txt(htmlStr.slice(lastIdx, m.index)));
            }
            const img = document.createElement('img');
            img.src = m[1];
            if (m[2]) img.style.cssText = m[2];
            else { img.style.maxHeight = '36px'; img.style.verticalAlign = 'middle'; }
            frag.appendChild(img);
            lastIdx = m.index + m[0].length;
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

        const minimizeBtn = el('button', 'ewt-modal-minimize', { textContent: '\u2014', title: '收起' });
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
                console.log(JSON.stringify(r.analysis.replace(/\\</g, "<").replace(/\\:/g, ":")));
                qDiv.appendChild(parseDiv);
            }

            if (r.images && r.images.length) {
                r.images.forEach(src => {
                    if (/^https?:\/\/file\.ewt360\.com\//.test(src)) {
                        const img = el('img', '', {
                            src, style: 'max-width:100%;margin-top:6px;border-radius:4px;'
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
        footerFrag.appendChild(txt('Ver.1.1 \u00b7 By:\u5fd7\u6210\uD83C\uDF52 ZCROM \u00b7 '));

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

    // ==================== URL 参数 ====================
    const qs = window.location.href.split('?')[1] || '';
    const urlParams = {};
    qs.split('&').forEach(item => {
        const [k, v] = item.split('=');
        if (k) urlParams[k] = decodeURIComponent(v || '');
    });

    const paperId = urlParams.paperId;
    const platform = urlParams.platform || '1';
    const submitBizCode = urlParams.bizCode || '205';

    if (!paperId) throw new Error('\u672a\u627e\u5230 paperId');

    // ==================== API ====================
    const apiHeaders = () => ({
        'Content-Type': 'application/json',
        'token': token,
        'User-Agent': UA,
    });

    const getReportId = async (bizCode) => {
        const url = `${BASE}/api/answerprod/web/answer/report?paperId=${paperId}&platform=${platform}&bizCode=${bizCode}&token=${token}`;
        const resp = await fetch(url, { headers: { 'User-Agent': UA } });
        const data = await resp.json();
        if (!data.success) throw new Error(JSON.stringify(data));
        return data.data.reportId;
    };

    //因为另外一个questionId接口需要userId
    const getUserId = async () => {
        const url = `${BASE}/api/usercenter/user/baseinfo`;
        const resp = await fetch(url, { headers: apiHeaders() });
        const data = await resp.json();
        if (!data.success) throw new Error(JSON.stringify(data));
        return data.data.userId;
    }

    const getQuestions = async (reportId, bizCode) => {
        const url = `${BASE}/api/answerprod/common/answer/sheet/getAnswerSheetSubGroup`;
        const body = { paperId, reportId, platform, bizCode, homeworkId: '0', client: 4 };
        const resp = await fetch(url, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) });
        const data = await resp.json();
        const questions = [];
        if (!data.success) {
            //另一个API,如果是非题组会到这，实际上应该有方法去判断该界面是不是题组的，但我懒得去看了，直接失败就用另一个API(
            const userId = await getUserId();
            const url = `${BASE}/api/answerprod/common/answer/answerSheetInfo`;
            const body = { paperId, reportId, platform, bizCode, userId, client: 1 };
            const resp = await fetch(url, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) });
            const data = await resp.json();

            for (const q of data.data.questionInfoList) {
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
        throw new Error(JSON.stringify(data));

    };

    const updateReport = async (reportId, bizCode) => {
        const url = `${BASE}/api/answerprod/web/answer/submitpaper`;
        const body = { paperId, reportId, bizCode, platform, totalSeconds: 600, homeworkId: '0' };
        const resp = await fetch(url, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) });
        const data = await resp.json();
        if (!data.success) throw new Error(JSON.stringify(data));
    };

    const getAnswer = async (reportId, questionId, bizCode) => {
        const url = `${BASE}/api/answerprod/web/answer/simple/question/analysis`;
        const body = { paperId, reportId, platform, questionId, bizCode, homeworkId: '0', client: 4 };
        const resp = await fetch(url, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) });
        const data = await resp.json();
        return data.success ? data.data : null;
    };

    const submitAnswers = async (pId, pf, qs, ca, bc) => {
        const newRid = await getReportId(bc);
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
        const body = { paperId: pId, reportId: newRid, platform: pf, questionList, bizCode: bc, assignPoints: false };
        const resp = await fetch(url, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) });
        const data = await resp.json();
        return data.success === true;
    };

    // ==================== HTML 清洗（仅保留图片） ====================
    const cleanHtmlKeepImg = (text) => {
        if (!text) return '';
        text = text.replace(/<img[^>]*Wirisformula[^>]*src="([^"]*)"[^>]*>/g,
            '<img src="$1" />');
        text = text.replace(/<br[^>]*>/g, '\n');
        text = text.replace(/<(?!img\b|\/img\b)[^>]+>/g, '');
        text = text.replace(/&ldquo;/g, '\u201c').replace(/&rdquo;/g, '\u201d');
        text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
        text = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        text = text.replace(/\n{3,}/g, '\n\n');
        return text.trim();
    };

    const extractOpts = (rightAnswer) => {
        if (!rightAnswer || !Array.isArray(rightAnswer)) return [];
        return rightAnswer.filter(x => /^[A-Z]+$/.test(x.trim())).map(x => x.trim());
    };

    // ==================== 主流程 ====================
    const main = async () => {
        // 校验Cookie中是否存在token
        if (!token) {
            alert('未在Cookie中检测到token，请刷新页面重新登录EWT360！');
            return;
        }

        try {
            const rid = await getReportId(BIZ_VIEW);
            const questions = await getQuestions(rid, BIZ_VIEW);
            await updateReport(rid, BIZ_VIEW);

            const choiceAnswers = new Map();
            const results = [];

            for (const q of questions) {
                const ans = await getAnswer(rid, q.questionId, BIZ_VIEW);
                if (!ans) continue;

                const opts = extractOpts(ans.rightAnswer || []);
                if (opts.length && !q.subjective) {
                    choiceAnswers.set(q.questionId, opts);
                }

                let answerStr;
                if (opts.length) {
                    answerStr = opts.map(o => o.split('').join(', ')).join('  |  ');
                } else if (ans.rightAnswer && ans.rightAnswer.length) {
                    answerStr = cleanHtmlKeepImg(ans.rightAnswer[0]);
                } else {
                    answerStr = '(\u4e3b\u89c2\u9898)';
                }

                const images = (ans.attachmentImages || []).length ? ans.attachmentImages : [];

                results.push({
                    num: q.questionNumber,
                    group: q.groupName,
                    answer: answerStr,
                    knowledge: (ans.knowledges || []).map(k => k.title).join('\u3001'),
                    analysis: cleanHtmlKeepImg(ans.analyse || ''),
                    images,
                });
            }

            showAnswerModal(results, choiceAnswers, questions, paperId, platform, submitBizCode);
        } catch (e) {
            alert('\u83b7\u53d6\u5931\u8d25: ' + e.message);
            console.error(e);
        }
    };

    main();

})();
