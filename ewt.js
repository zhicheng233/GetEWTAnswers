// ==UserScript==
// @name         升学 E 网通 (EWT360) 试题答案获取
// @namespace    https://ewt.zhicheng233.top/examanswer
// @version      0.1
// @description  此脚本在 EWT 试题中获取试题答案喵~
// @author       志成🍥
// @match          https://web.ewt360.com/mystudy/
// @icon           https://web.ewt360.com/favicon.ico
// @license        GNU General Public License
// @grant          GM_getValue
// @grant          GM_setValue
// ==/UserScript==

(function() {
    'use strict';
    
    // 设置界面的样式
    const style = `
        .ewt-settings {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0,0,0,0.3);
            z-index: 10000;
        }
        .ewt-settings input {
            margin: 10px 0;
            padding: 5px;
            width: 200px;
        }
        .ewt-settings button {
            margin: 5px;
            padding: 5px 10px;
        }
    `;

    // 设置界面
    const createSettingsPanel = () => {
        const div = document.createElement('div');
        div.className = 'ewt-settings';
        div.innerHTML = `
            <h1>EWT答案获取设置</h1>
            <h2>请填写已完成的reportId，用于越权 BypassAPI鉴权</h2>
            <h3>如何获得?</h3>
            <p>选择已经完成的试题,复制URL(网址)上的&reportId=到下一个&的值,比如&reportId=19158466643xxxx&videoPoint=1 则复制19158466643xxxx
            <div>
                <label for="reportId">已完成的reportId：</label>
                <input type="text" id="reportId" value="${GM_getValue('getAnswerReportId', '')}">
            </div>
            <div>
                <button id="saveSettings">保存</button>
                <button id="cancelSettings">取消</button>
            </div>
            <div>
                <p>Ver.0.1 2025.1</p> 
                <p>By:志成🍥 ZCROM</p>
                <a href="https://blog.zhicheng233.top">个人博客</a>
                <a href="https://github.com/zhicheng233/GetEWTAnswers">Github</a>
                <p>请开发者打一局 maimai 或者请开发者买 糖🍬 如何？<a href="https://zhicheng233.top/Donate/">帮帮咱🥺~</a>
            </div>
        `;
        
        // 添加样式
        const styleElement = document.createElement('style');
        styleElement.textContent = style;
        document.head.appendChild(styleElement);
        
        return div;
    };

    // 保存设置
    const saveSettings = () => {
        const reportId = document.getElementById('reportId').value;
        GM_setValue('getAnswerReportId', reportId);
        const panel = document.querySelector('.ewt-settings');
        if (panel) panel.remove();
    };

    // 显示设置面板
    const showSettings = () => {
        const panel = createSettingsPanel();
        document.body.appendChild(panel);
        
        document.getElementById('saveSettings').addEventListener('click', saveSettings);
        document.getElementById('cancelSettings').addEventListener('click', () => panel.remove());
    };
    
    //请求参数
    var bizCode;
    var paperId;
    var platform;
    var reportId;
    //已经完成的reportId用于越权 BypassAPI鉴权
    var getAnswerReportId = GM_getValue('getAnswerReportId', '');

    // 检查是否需要设置
    if (!getAnswerReportId) {
        alert('首次使用，请先设置已完成的reportId！');
        showSettings();
        return;
    }

    // 添加设置按钮到页面
    const settingsButton = document.createElement('button');
    settingsButton.textContent = 'EWT脚本设置';
    settingsButton.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;';
    settingsButton.addEventListener('click', showSettings);
    document.body.appendChild(settingsButton);

    // 是否在答题url
    if (!document.location.hash.includes('exam/answer')) {
        return;
    }
    //获取一些必要参数
    //获取URL
    const url = window.location.href;

    const queryString = url.split('?')[1];

    const params = {};
    queryString.split('&').forEach(item => {
        const [key, value] = item.split('=');
        params[key] = value;
    });
        
    // 提取需要的参数
    bizCode = parseInt(params.bizCode);
    paperId = params.paperId;
    platform = params.platform;
    reportId = params.reportId;

    console.log('bizCode:', bizCode);
    console.log('paperId:', paperId);
    console.log('platform:', platform);
    console.log('reportId:', reportId);

    //获取QuestionId,返回一个数组
    const getQuestionIdList = async () => {
        const data = {
            client: 1,
            paperId: paperId,
            platform: platform,
            reportId: reportId,
            bizCode: bizCode,
            userId: ""
        };

        try {
            const response = await fetch('https://web.ewt360.com/api/answerprod/common/answer/answerSheetInfo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            console.log('Success:', result);
            const questionInfoList = result.data.questionInfoList;
            const questionIds = questionInfoList.map(question => {
                if (question.parentQuestionId !="0"){
                    return  question.parentQuestionId
                }else{
                    return  question.questionId
                }
                
            });
            console.log('QuestionIds:', questionIds);
            return questionIds;
        } catch (error) {
            console.error('Error:', error);
            alert('获取QuestionId失败 Error:' + error);
            return [];
        }
    };

    //获取题目答案 返回单题答案
    const getAnswerByQuestionId = async (questionId) => {
        var answers;
        
        const data = {
            questionId: questionId,
            paperId: paperId,
            reportId: getAnswerReportId,
            platform: platform,
            bizCode: bizCode,
        };
        try {
            const response = await fetch('https://web.ewt360.com/api/answerprod/web/answer/simple/question/analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            console.log('Success:', result);
            
            //处理有子题的情况
            if  (result.data.childQuestions.length != 0){
                answers = result.data.childQuestions.map(childQuestion => childQuestion.rightAnswer);
            }else{
                answers = result.data.rightAnswer;
            }
            
            console.log('Answers:', answers);
            return answers;
        } catch (error) {
            console.error('Error:', error);
            alert('获取答案失败 QuestionId:' +  questionId + 'Error:' + error + 'result' + result);
            return null;
        }
    };

    const openAnserPaper = (allAnswers) => {
        // 打开新窗口
        const newWindow = window.open('', '_blank', 'width=600,height=400');
        let htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>试题答案</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    ul { list-style-type: none; padding: 0; }
                    li { background: #f0f0f0; margin: 5px 0; padding: 10px; }
                </style>
            </head>
            <body>
                <h1>试题答案</h1>
                <ul>
        `;

        // 遍历数组
        allAnswers.forEach(item => {
            htmlContent += `<li>${item}</li>`;
        });

        htmlContent += `
                    <div>
                        <p>Ver.0.1 2025.1</p> 
                        <p>By:志成🍥 ZCROM</p>
                        <a href="https://zhicheng233.top">主页</a>
                        <a href="https://blog.zhicheng233.top">个人博客</a>
                        <a href="https://github.com/zhicheng233/GetEWTAnswers">Github</a>
                        <p>请开发者打一局 maimai 或者请开发者买 糖🍬 如何？<a href="https://zhicheng233.top/Donate/">帮帮咱🥺~</a>
                    </div>
                </ul>
            </body>
            </html>
        `;
        // 将HTML内容写入新窗口
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        console.debug(htmlContent);

    };
    const main = async () => {
        var questionIdsList = await getQuestionIdList();
        var allAnswers = [];
        var lastParentQuestionId

        for (const questionId of questionIdsList) {
            //处理ParentQuestionId的重复，虽然其childQuestionId不同但他们的ParentQuestionId是一样的
            if (questionId == lastParentQuestionId){
                continue;
            }
            lastParentQuestionId = questionId;
            //获取答案
            const answer = await getAnswerByQuestionId(questionId);
            if (answer !== null) {
                allAnswers.push(answer);
            }
        }
        console.debug('AllAnswers:', allAnswers);
        openAnserPaper(allAnswers);
    };
    main();
    
})();