// ==UserScript==
// @name         升学 E 网通 (EWT360) 试题答案获取
// @namespace    https://ewt.zhicheng233.top/examanswer
// @version      0.7
// @description  此脚本在 EWT 试题中获取试题答案（支持图片显示 + 提交答案）
// @author       志成🍥
// @match        https://web.ewt360.com/answer-pc/exam/answer*
// @icon         https://web.ewt360.com/favicon.ico
// @license      GNU General Public License
// @grant        GM_getValue
// @grant        GM_setValue
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
.ewt-modal-body .q-ans img, .ewt-modal-body .q-parse img {
    max-width: 100%; vertical-align: middle; max-height: 40px;
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
.ewt-settings {
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: white; padding: 20px; border-radius: 8px;
    box-shadow: 0 0 10px rgba(0,0,0,0.3); z-index: 100000;
}
.ewt-settings input { margin: 10px 0; padding: 5px; width: 260px; }
.ewt-settings button { margin: 5px; padding: 5px 10px; }
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

    // ==================== 答案弹窗 ====================
    const showAnswerModal = (results, choiceAnswers, questions, paperId, platform, submitBizCode) => {
        document.querySelectorAll('.ewt-overlay').forEach(el => el.remove());
        bubble.classList.remove('show');

        const overlay = document.createElement('div');
        overlay.className = 'ewt-overlay';

        let html = `
        <div class="ewt-modal">
            <div class="ewt-modal-header">
                <span>试题答案 (共 ${results.length} 题)</span>
                <div class="ewt-modal-header-btns">
                    <button class="ewt-modal-minimize" title="收起">&#8212;</button>
                    <button class="ewt-modal-close" title="关闭">&times;</button>
                </div>
            </div>
            <div class="ewt-modal-body">`;

        results.forEach(r => {
            html += `<div class="q">
                <div class="q-num">[${r.num}] ${r.group}</div>
                <div class="q-ans">答案: ${r.answer}</div>`;
            if (r.knowledge) html += `<div class="q-know">知识点: ${r.knowledge}</div>`;
            if (r.analysis) html += `<div class="q-parse">解析: ${r.analysis}</div>`;
            if (r.images && r.images.length) {
                r.images.forEach(src => {
                    html += `<div><img src="${src}" style="max-width:100%;margin-top:6px;border-radius:4px;" /></div>`;
                });
            }
            html += `</div>`;
        });

        html += `</div>
            <div class="ewt-modal-footer">
                Ver.0.7 · By:志成&#127818; ZCROM ·
                <a href="https://zhicheng233.top" target="_blank">主页</a> ·
                <a href="https://blog.zhicheng233.top" target="_blank">博客</a> ·
                <a href="https://github.com/zhicheng233/GetEWTAnswers" target="_blank">Github</a>`;

        if (choiceAnswers.size > 0) {
            html += `<button class="ewt-btn-submit" id="ewtSubmitBtn">提交选择题答案 (${choiceAnswers.size} 题)</button>
                     <div class="ewt-submit-msg" id="ewtSubmitMsg"></div>`;
        }

        html += `</div></div>`;

        overlay.innerHTML = html;
        document.body.appendChild(overlay);

        // 收起
        const minimize = () => {
            overlay.classList.add('minimized');
            bubble.classList.add('show');
        };

        overlay.querySelector('.ewt-modal-minimize').addEventListener('click', minimize);

        // 浮动气泡点击 → 展开
        bubble.onclick = () => {
            overlay.classList.remove('minimized');
            bubble.classList.remove('show');
        };

        // 关闭
        const close = () => {
            overlay.remove();
            bubble.classList.remove('show');
        };
        overlay.querySelector('.ewt-modal-close').addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay && !overlay.classList.contains('minimized')) close();
        });
        document.addEventListener('keydown', function esc(e) {
            if (e.key === 'Escape' && !overlay.classList.contains('minimized')) {
                close();
                document.removeEventListener('keydown', esc);
            }
        });

        // 提交按钮
        const submitBtn = overlay.querySelector('#ewtSubmitBtn');
        const submitMsg = overlay.querySelector('#ewtSubmitMsg');
        if (submitBtn) {
            submitBtn.addEventListener('click', async () => {
                submitBtn.disabled = true;
                submitBtn.textContent = '正在提交...';
                submitMsg.textContent = '';
                try {
                    const ok = await submitAnswers(paperId, platform, questions, choiceAnswers, submitBizCode);
                    submitMsg.textContent = ok ? '提交成功!' : '提交失败';
                    submitMsg.style.color = ok ? '#27ae60' : '#e74c3c';
                    if (ok) submitBtn.remove();
                } catch (e) {
                    submitMsg.textContent = '提交出错: ' + e.message;
                    submitMsg.style.color = '#e74c3c';
                    submitBtn.disabled = false;
                    submitBtn.textContent = '重试提交';
                }
            });
        }
    };

    // ==================== 设置面板 ====================
    const showSettings = () => {
        document.querySelectorAll('.ewt-settings').forEach(el => el.remove());
        const div = document.createElement('div');
        div.className = 'ewt-settings';
        div.innerHTML = `
            <h1>EWT答案获取设置</h1>
            <h2>请填写 token，用于 API 鉴权</h2>
            <h3>如何获得?</h3>
            <p>打开浏览器开发者工具(F12) → Network → 任意一个 gateway.ewt360.com 的请求 → Request Headers → 复制 token 字段的值<br>
            <b>格式类似 xxxxx-x-xxxxxxxxxxxxx</b></p>
            <div>
                <label for="token">token：</label>
                <input type="password" id="token" value="${GM_getValue('ewtToken', '')}">
                <button id="toggleToken">显示</button>
            </div>
            <div>
                <button id="saveSettings">保存</button>
                <button id="cancelSettings">取消</button>
            </div>
            <div>
                <p>Ver.0.7 2026.6</p>
                <p>By:志成🍥 ZCROM</p>
                <a href="https://zhicheng233.top">主页</a>
                <a href="https://blog.zhicheng233.top">个人博客</a>
                <a href="https://github.com/zhicheng233/GetEWTAnswers">Github</a>
                <p>请开发者打一局 maimai 或者请开发者买 糖🍬 如何？<a href="https://zhicheng233.top/Donate/">帮帮咱🥺~</a>
            </div>
        `;
        document.body.appendChild(div);

        const tokenInput = document.getElementById('token');
        const toggleBtn = document.getElementById('toggleToken');
        toggleBtn.addEventListener('click', () => {
            if (tokenInput.type === 'password') {
                tokenInput.type = 'text';
                toggleBtn.textContent = '隐藏';
            } else {
                tokenInput.type = 'password';
                toggleBtn.textContent = '显示';
            }
        });

        document.getElementById('saveSettings').addEventListener('click', () => {
            GM_setValue('ewtToken', tokenInput.value);
            div.remove();
        });
        document.getElementById('cancelSettings').addEventListener('click', () => div.remove());
    };

    // ==================== 初始化 ====================
    let token = GM_getValue('ewtToken', '');

    if (!token) {
        alert('首次使用，请先设置 token！\n\nF12 → Network → gateway.ewt360.com 任意请求 → Request Headers → 复制 token');
        showSettings();
    }

    const settingsBtn = document.createElement('button');
    settingsBtn.textContent = 'EWT设置';
    settingsBtn.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;padding:6px 12px;border-radius:6px;border:1px solid #ccc;background:#fff;cursor:pointer;';
    settingsBtn.addEventListener('click', showSettings);
    document.body.appendChild(settingsBtn);

    // ==================== URL 参数 ====================
    const qs = window.location.href.split('?')[1] || '';
    const params = {};
    qs.split('&').forEach(item => {
        const [k, v] = item.split('=');
        if (k) params[k] = decodeURIComponent(v || '');
    });

    const paperId = params.paperId;
    const platform = params.platform || '1';
    const submitBizCode = params.bizCode || '205';

    if (!paperId) throw new Error('未找到 paperId');

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

    const getQuestions = async (reportId, bizCode) => {
        const url = `${BASE}/api/answerprod/common/answer/sheet/getAnswerSheetSubGroup`;
        const body = { paperId, reportId, platform, bizCode, homeworkId: '0', client: 4 };
        const resp = await fetch(url, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) });
        const data = await resp.json();
        if (!data.success) throw new Error(JSON.stringify(data));
        const questions = [];
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

    const submitAnswers = async (paperId, platform, questions, choiceAnswers, bizCode) => {
        const newRid = await getReportId(bizCode);

        const questionList = [];
        for (const q of questions) {
            const qid = q.questionId;
            if (choiceAnswers.has(qid)) {
                const opts = choiceAnswers.get(qid);
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
        const body = {
            paperId, reportId: newRid, platform,
            questionList, bizCode, assignPoints: false,
        };
        const resp = await fetch(url, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) });
        const data = await resp.json();
        return data.success === true;
    };

    // ==================== 工具 ====================
    const cleanHtml = (text) => {
        if (!text) return '';
        text = text.replace(/<img[^>]*Wirisformula[^>]*src="([^"]*)"[^>]*>/g,
            '<img src="$1" style="max-height:36px;vertical-align:middle;" />');
        text = text.replace(/<br[^>]*>/g, '\n');
        text = text.replace(/<(?!img\b|\/img\b)[^>]+>/g, '');
        text = text.replace(/&ldquo;/g, '\u201c').replace(/&rdquo;/g, '\u201d');
        text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
        text = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        text = text.replace(/\n{3,}/g, '\n\n');
        return text.trim();
    };

    const cleanAnswerHtml = (text) => {
        if (!text) return '';
        text = text.replace(/<img[^>]*src="([^"]*)"[^>]*>/g,
            ' <img src="$1" style="max-height:36px;vertical-align:middle;" /> ');
        text = text.replace(/<br[^>]*>/g, ' ');
        text = text.replace(/<(?!img\b|\/img\b)[^>]+>/g, '');
        text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
        text = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        text = text.replace(/\s+/g, ' ').trim();
        return text;
    };

    const extractOpts = (rightAnswer) => {
        if (!rightAnswer || !Array.isArray(rightAnswer)) return [];
        return rightAnswer.filter(x => /^[A-Z]+$/.test(x.trim())).map(x => x.trim());
    };

    // ==================== 主流程 ====================
    const main = async () => {
        if (!token) return alert('请先设置 token！点击右上角 EWT设置');

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
                    answerStr = cleanAnswerHtml(ans.rightAnswer[0]);
                } else {
                    answerStr = '(主观题)';
                }

                const images = (ans.attachmentImages || []).length
                    ? ans.attachmentImages
                    : [];

                results.push({
                    num: q.questionNumber,
                    group: q.groupName,
                    answer: answerStr,
                    knowledge: (ans.knowledges || []).map(k => k.title).join('、'),
                    analysis: cleanHtml(ans.analyse || ''),
                    images,
                });
            }

            showAnswerModal(results, choiceAnswers, questions, paperId, platform, submitBizCode);

        } catch (e) {
            alert('获取失败: ' + e.message);
            console.error(e);
        }
    };

    main();

})();
