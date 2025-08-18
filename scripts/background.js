// 全局状态
let state = 'idle'; // 'idle', 'running', 'paused', 'waiting_for_approval', 'waiting_for_user_input', 'finished', 'error'
let errorInfo = null; // 错误信息
let warnings = []; // 警告信息
let completionMessage = null; // 用于存储任务完成时的消息
let scriptConfig = { // 默认脚本配置
    "autoApprove": true,
    "showWarnings": true,
    "autoStart": false, 
    "restartOnError": false
};
let currentScript = []; // 当前脚本
let currentStep = 0; // 当前步骤，作为程序计数器
let activeTabId = null; // 激活的页面
let isExecuting = false; // 避免并行的锁
let variables = {}; // 变量结构: { varName: { value: 'someValue', type: 'string' | 'number' } }
let labelMap = {}; // 用于存储标签和对应的步骤索引
let keepAliveInterval = null; // 全局保活定时器

// 启动时和安装时自动运行
chrome.runtime.onStartup.addListener(tryAutoStart);
chrome.runtime.onInstalled.addListener(tryAutoStart);

async function tryAutoStart() {
    // 只有当没有任务正在运行时才启动
    if (state !== 'idle') {
        return;
    }

    const data = await chrome.storage.local.get(['automationScript']);
    let config;
    if (data.automationScript && data.automationScript.config) {
        config = data.automationScript.config;
    }

    if (config && config.autoStart) {
        console.log("检测到自动启动配置，正在启动脚本...");
        // 稍作延迟以确保浏览器环境准备就绪
        setTimeout(() => startScript(), 2000);
    }
}

// 消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.command) {
        case 'start':
            startScript(sendResponse);
            break;
        case 'next_step':
            if (state === 'waiting_for_approval') {
                // 手动模式：用户想要执行当前步骤
                state = 'running';
                executeNextStep();
            } else if (state === 'waiting_for_user_input') {
                // 用户完成了人工等待
                currentStep++; // 移动到 wait_for_user 指令之后的步骤
                if (scriptConfig.autoApprove) {
                    // 在自动模式下，恢复自动执行
                    state = 'running';
                    executeNextStep();
                } else {
                    // 在手动模式下，仅转换到对下一步的等待状态，不执行
                    state = 'waiting_for_approval';
                    broadcastStatus(); // 更新UI，显示我们现在正在等待下一步
                }
            }
            break;
        case 'pause':
            pauseScript();
            break;
        case 'resume':
            resumeScript();
            break;
        case 'stop':
            stopScript();
            break;
        case 'getStatus':
            (async () => {
                let scriptToShow = currentScript;
                // 在 idle 状态下，脚本和配置可能还未加载
                if (state === 'idle') {
                    const data = await chrome.storage.local.get(['automationScript']);
                    if (data.automationScript && data.automationScript.script) {
                        scriptToShow = data.automationScript.script;
                        // 即使在 idle 状态，也更新一下配置以供显示
                        scriptConfig = data.automationScript.config || scriptConfig;
                    } else {
                        // 如果没有存储的脚本，则显示一个空脚本数组
                        scriptToShow = [];
                    }
                }
                sendResponse({
                    status: state,
                    step: currentStep,
                    script: scriptToShow,
                    errorInfo: errorInfo,
                    warnings: warnings,
                    variables: variables,
                    completionMessage: completionMessage,
                    showWarnings: scriptConfig.showWarnings
                });
            })();
            return true;
    }
    return true;
});

async function broadcastStatus() {
    chrome.runtime.sendMessage({
        type: 'statusUpdate',
        status: state,
        step: currentStep,
        script: currentScript,
        errorInfo: errorInfo,
        warnings: warnings,
        variables: variables,
        completionMessage: completionMessage,
        showWarnings: scriptConfig.showWarnings
    });
}

// 获取变量，确保存在并返回其值
function getVariable(varName) {
    if (!variables.hasOwnProperty(varName)) {
        throw new Error(`变量 "${varName}" 未定义。`);
    }
    return variables[varName];
}

// 格式化字符串，替换 ${varName}
function formatString(template) {
    // 使用支持Unicode的正则表达式来匹配变量名，包括中文字符
    return template.replace(/\$\{([\p{L}\p{N}_]+)\}/gu, (match, varName) => {
        // format_string 可以使用任何类型的变量
        return getVariable(varName).value;
    });
}

// 解析并获取一个操作数的值（可以是变量或字面量）
function getOperandValue(operandStr) {
    operandStr = operandStr.trim();
    // 如果是数字字面量
    if (!isNaN(parseFloat(operandStr)) && isFinite(operandStr)) {
        return parseFloat(operandStr);
    }
    // 如果是字符串字面量
    if ((operandStr.startsWith("'") && operandStr.endsWith("'")) || (operandStr.startsWith('"') && operandStr.endsWith('"'))) {
        return operandStr.slice(1, -1);
    }
    // 否则，假定是变量名
    return getVariable(operandStr).value;
}

// 安全地执行条件表达式
function evaluateCondition(condition) {
    // 目前只支持单个条件
    const parts = condition.match(/(\S+)\s*(===|!==|==|!=|<=|>=|<|>)\s*(.*)/);
    if (!parts) {
        throw new Error(`无法解析条件表达式: "${condition}"`);
    }

    const [, leftStr, operator, rightStr] = parts;

    const leftVal = getOperandValue(leftStr);
    const rightVal = getOperandValue(rightStr);

    switch (operator) {
        case '==': return leftVal == rightVal;
        case '!=': return leftVal != rightVal;
        case '===': return leftVal === rightVal;
        case '!==': return leftVal !== rightVal;
        case '>': return leftVal > rightVal;
        case '<': return leftVal < rightVal;
        case '>=': return leftVal >= rightVal;
        case '<=': return leftVal <= rightVal;
        default: throw new Error(`不支持的条件运算符: "${operator}"`);
    }
}

// 安全地计算数学表达式
function calculateExpression(expression) {
    // 目前只支持单个二元运算
    const parts = expression.match(/(\S+)\s*([\+\-\*\/])\s*(.*)/);
     if (!parts) {
        throw new Error(`无法解析数学表达式: "${expression}"。仅支持简单的二元运算，如 "var1 + 10"。`);
    }
    const [, leftStr, operator, rightStr] = parts;

    const leftVal = getOperandValue(leftStr);
    const rightVal = getOperandValue(rightStr);

    if (typeof leftVal !== 'number' || typeof rightVal !== 'number') {
        throw new Error(`数学运算的两个操作数都必须是数字。在表达式 "${expression}" 中，得到的是 "${leftVal}" (类型 ${typeof leftVal}) 和 "${rightVal}" (类型 ${typeof rightVal})。`);
    }

    switch (operator) {
        case '+': return leftVal + rightVal;
        case '-': return leftVal - rightVal;
        case '*': return leftVal * rightVal;
        case '/': return leftVal / rightVal;
        default: throw new Error(`不支持的数学运算符: "${operator}"`);
    }
}


// 开始运行脚本
async function startScript(sendResponse) {
    // 如果已经在运行，则不执行任何操作
    if (state !== 'idle' && state !== 'finished') {
        if (sendResponse) {
            sendResponse({ status: state, message: "脚本已在运行中。" });
        }
        return;
    }

    errorInfo = null;
    warnings = [];
    completionMessage = null;
    chrome.storage.session.remove('activeDetailVariable'); // 清除会话状态
    variables = {
        _last_error_message: { value: "", type: 'string' } // 初始化系统变量
    };
    labelMap = {};

    let fullScript;
    const data = await chrome.storage.local.get(['automationScript']);
    if (data.automationScript && data.automationScript.script && data.automationScript.script.length > 0) {
        fullScript = data.automationScript;
    } else {
        // 如果没有找到有效的脚本，则使用一个空的脚本结构
        fullScript = {
            "config": { "autoApprove": true, "showWarnings": true },
            "script": []
        };
    }
    
    scriptConfig = fullScript.config || { "autoApprove": true, "showWarnings": true, "restartOnError": false };
    currentScript = fullScript.script || [];

    // 预处理脚本，创建标签映射
    currentScript.forEach((step, index) => {
        if (step.label) {
            labelMap[step.label] = index;
        }
    });

    currentStep = 0;
    state = 'running';

    // 检查是否有激活的标签页
    let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs.length === 0) {
        // 如果没有激活的标签页，创建一个新的
        console.log("未找到激活的标签页，正在创建一个新标签页以进行自动化操作...");
        const newTab = await chrome.tabs.create({});
        activeTabId = newTab.id;
    } else {
        activeTabId = tabs[0].id;
    }

    broadcastStatus();
    executeNextStep(); // 开始执行第一步
    if (sendResponse) {
        sendResponse({
            status: state
        });
    }

    // 启动全局保活定时器
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    keepAliveInterval = setInterval(() => {
        chrome.runtime.getPlatformInfo(() => {});
    }, 1000);
}

function pauseScript() {
    if (state === 'running') {
        state = 'paused';
        broadcastStatus();
    }
}

function resumeScript() {
    if (state === 'paused') {
        state = 'running';
        broadcastStatus();
        executeNextStep(); 
    }
}

function stopScript() {
    state = 'idle';
    currentStep = 0;
    errorInfo = null;
    warnings = [];
    completionMessage = null;
    variables = {};
    labelMap = {};
    isExecuting = false; // 确保锁被释放
    chrome.storage.session.remove('activeDetailVariable'); // 清除会话状态
    if (keepAliveInterval) clearInterval(keepAliveInterval); // 停止保活
    broadcastStatus();
}

function finishScript() {
    state = 'finished';
    completionMessage = '所有任务已成功完成！';
    if (keepAliveInterval) clearInterval(keepAliveInterval); // 停止保活
    broadcastStatus();
}

function waitForTabLoad(tabId, timeout = 30000) {
    return new Promise(async (resolve, reject) => {
        let timeoutId = null;
        let listener = null;

        const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
            if (listener) chrome.tabs.onUpdated.removeListener(listener);
        };

        try {
            const tab = await chrome.tabs.get(tabId);
            if (tab.status === 'complete') {
                cleanup();
                return resolve({ success: true });
            }
        } catch (error) {
            cleanup();
            return reject(new Error(`检查标签页状态失败: ${error.message}`));
        }

        timeoutId = setTimeout(() => {
            cleanup();
            reject(new Error(`页面加载超时（${timeout}ms）。`));
        }, timeout);

        listener = (updatedTabId, changeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
                cleanup();
                resolve({ success: true });
            }
        };
        chrome.tabs.onUpdated.addListener(listener);
    });
}

async function sendMessageToContentScript(tabId, message) {
    try {
        // 首先尝试注入脚本。如果脚本已存在，Chrome不会重复注入，所以这是安全的。
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['scripts/content.js'],
        });
    } catch (error) {
        // 如果注入失败（例如在受保护的页面），立即抛出明确的错误。
        const tab = await chrome.tabs.get(tabId);
        const friendlyUrl = tab.url.length > 70 ? tab.url.substring(0, 67) + '...' : tab.url;
        throw new Error(`无法在当前页面 (${friendlyUrl}) 上执行操作。此页面可能受浏览器保护。`);
    }

    // 注入成功后，我们确信内容脚本存在，现在可以发送消息。
    const response = await chrome.tabs.sendMessage(tabId, message);
    if (response && !response.success) {
        throw new Error(response.error || '内容脚本返回了一个未指定的错误。');
    }
    return response;
}

async function executeNextStep() {
    if (state !== 'running' || isExecuting) {
        if (currentStep >= currentScript.length && state !== 'idle' && state !== 'finished') {
            finishScript();
        }
        return;
    }

    if (currentStep >= currentScript.length) {
        finishScript();
        return;
    }

    isExecuting = true;
    let nextStepIndex = currentStep + 1; // 在 try 外部声明
    let step = { ...currentScript[currentStep] }; // 提前复制，以便检查命令

    try {
        try {
            await sendMessageToContentScript(activeTabId, { command: 'clear_highlights' });
        } catch (error) {
            // 在这种情况下，即使清除高亮失败，也应该继续执行，所以忽略错误
        }
        
        broadcastStatus();

        // 通用深度解析：递归地解析一个对象/数组中的所有字符串参数
        function deepFormat(obj) {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }

            if (Array.isArray(obj)) {
                return obj.map(item => deepFormat(item));
            }

            const newObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const value = obj[key];
                    if (typeof value === 'string') {
                        newObj[key] = formatString(value);
                    } else if (typeof value === 'object') {
                        newObj[key] = deepFormat(value);
                    } else {
                        newObj[key] = value;
                    }
                }
            }
            return newObj;
        }

        // 在执行任何命令前，深度解析其所有参数
        const originalCommand = step.command; // 保存原始命令，因为它不应被解析
        step = deepFormat(step);
        step.command = originalCommand;

        // 特殊类型转换：确保解析后的某些参数是正确的数字类型
        if (step.selector && typeof step.selector.index === 'string') {
            step.selector.index = parseInt(step.selector.index, 10);
            if (isNaN(step.selector.index)) {
                throw new Error(`选择器中的 index "${step.selector.index}" 解析后不是一个有效的数字。`);
            }
        }
        if (step.command === 'wait' && typeof step.milliseconds === 'string') {
            step.milliseconds = parseInt(step.milliseconds, 10);
             if (isNaN(step.milliseconds)) {
                throw new Error(`wait 指令的 milliseconds "${step.milliseconds}" 解析后不是一个有效的数字。`);
            }
        }
        if (step.command === 'click') {
            if (typeof step.clicks === 'string') {
                step.clicks = parseInt(step.clicks, 10);
                if (isNaN(step.clicks)) throw new Error(`click 指令的 clicks "${step.clicks}" 解析后不是一个有效的数字。`);
            }
            if (typeof step.clickDelay === 'string') {
                step.clickDelay = parseInt(step.clickDelay, 10);
                if (isNaN(step.clickDelay)) throw new Error(`click 指令的 clickDelay "${step.clickDelay}" 解析后不是一个有效的数字。`);
            }
        }

        switch (step.command) {
            case 'goto':
                if (step.newTab) {
                    const newTab = await chrome.tabs.create({ url: step.url, active: true });
                    activeTabId = newTab.id;
                } else {
                    await chrome.tabs.update(activeTabId, { url: step.url });
                }
                await waitForTabLoad(activeTabId, step.timeout);
                break;
            case 'wait':
                await new Promise(resolve => setTimeout(resolve, step.milliseconds));
                break;
            case 'click':
                await sendMessageToContentScript(activeTabId, step);
                // 点击后也等待页面加载
                await waitForTabLoad(activeTabId, step.timeout);
                break;
            case 'type':
                await sendMessageToContentScript(activeTabId, step);
                break;
            case 'select':
                if (!step.selector || step.value === undefined) {
                    throw new Error(`select 命令需要 "selector" 和 "value" 参数。`);
                }
                await sendMessageToContentScript(activeTabId, step);
                // 选择选项后，页面可能会重新加载或动态更新，所以像 click 一样等待加载完成
                await waitForTabLoad(activeTabId, step.timeout);
                break;
            case 'scrape_text':
                if (!step.outputVariable) {
                    throw new Error(`scrape_text 命令需要 "outputVariable" 参数。`);
                }
                const scrapeResponse = await sendMessageToContentScript(activeTabId, step);
                variables[step.outputVariable] = { value: scrapeResponse.data || "", type: 'string' };
                break;
            case 'scrape_html':
                if (!step.outputVariable) {
                    throw new Error(`scrape_html 命令需要 "outputVariable" 参数。`);
                }
                const scrapeHtmlResponse = await sendMessageToContentScript(activeTabId, step);
                variables[step.outputVariable] = { value: scrapeHtmlResponse.data || "", type: 'string' };
                break;
            case 'init_variable':
                if (!step.variableName || step.value === undefined || !step.type) {
                    throw new Error(`init_variable 命令需要 "variableName", "value", 和 "type" 参数。`);
                }
                if (step.type !== 'number' && step.type !== 'string') {
                    throw new Error(`init_variable 的 "type" 参数必须是 "number" 或 "string"。`);
                }
                let initValue = step.value;
                if (step.type === 'number') {
                    initValue = parseFloat(initValue);
                    if (isNaN(initValue)) {
                        throw new Error(`为变量 "${step.variableName}" 提供的值 "${step.value}" 不是一个有效的数字。`);
                    }
                }
                variables[step.variableName] = { value: initValue, type: step.type };
                break;
            case 'calculate':
                if (!step.outputVariable || !step.expression) {
                    throw new Error(`calculate 命令需要 "outputVariable" 和 "expression" 参数。`);
                }
                const result = calculateExpression(step.expression);
                variables[step.outputVariable] = { value: result, type: 'number' };
                break;
            case 'format_string':
                 if (!step.outputVariable || !step.template) {
                    throw new Error(`format_string 命令需要 "outputVariable" 和 "template" 参数。`);
                }
                const formattedString = formatString(step.template);
                variables[step.outputVariable] = { value: formattedString, type: 'string' };
                break;
            case 'parse_number':
                if (!step.inputVariable || !step.outputVariable) {
                    throw new Error(`parse_number 命令需要 "inputVariable" 和 "outputVariable" 参数。`);
                }
                const inputVar = getVariable(step.inputVariable);
                if (inputVar.type !== 'string') {
                    throw new Error(`parse_number 的输入变量 "${step.inputVariable}" 必须是 string 类型。`);
                }
                const parsedNum = parseFloat(inputVar.value);
                if (isNaN(parsedNum)) {
                    throw new Error(`无法将字符串 "${inputVar.value}" 解析为数字。`);
                }
                variables[step.outputVariable] = { value: parsedNum, type: 'number' };
                break;
            case 'jump':
                if (step.targetLabel && labelMap.hasOwnProperty(step.targetLabel)) {
                    nextStepIndex = labelMap[step.targetLabel];
                } else {
                    throw new Error(`跳转失败：未找到标签 "${step.targetLabel}"`);
                }
                break;
            case 'conditional_jump':
                if (evaluateCondition(step.condition)) {
                    if (step.targetLabel && labelMap.hasOwnProperty(step.targetLabel)) {
                        nextStepIndex = labelMap[step.targetLabel];
                    } else {
                        throw new Error(`条件跳转失败：未找到标签 "${step.targetLabel}"`);
                    }
                }
                break;
            case 'api_request':
                if (!step.url) {
                    throw new Error(`api_request 命令需要 "url" 参数。`);
                }

                const controller = new AbortController();
                const timeout = step.timeout || 30000; // 默认30秒超时
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                const requestOptions = {
                    method: step.data ? 'POST' : 'GET',
                    headers: step.header || {},
                    signal: controller.signal
                };

                if (step.data) {
                    if (typeof step.data === 'object') {
                        requestOptions.body = JSON.stringify(step.data);
                        if (!requestOptions.headers['Content-Type']) {
                            requestOptions.headers['Content-Type'] = 'application/json';
                        }
                    } else {
                        requestOptions.body = step.data;
                    }
                }

                try {
                    const apiResponse = await fetch(step.url, requestOptions);
                    clearTimeout(timeoutId); // 清除超时计时器

                    if (!apiResponse.ok) {
                        throw new Error(`API 请求失败，状态码: ${apiResponse.status} ${apiResponse.statusText}`);
                    }
                    const responseText = await apiResponse.text();
                    
                    try {
                        const responseJson = JSON.parse(responseText);
                        // 仅当定义了 outputs 时才处理
                        if (step.outputs) {
                            const getValueByPath = (obj, path) => {
                                return path.split('.').reduce((acc, part) => acc && acc[part], obj);
                            };
                            for (const path in step.outputs) {
                                if (step.outputs.hasOwnProperty(path)) {
                                    const variableName = step.outputs[path];
                                    const value = getValueByPath(responseJson, path);
                                    if (value !== undefined) {
                                        const type = typeof value === 'number' ? 'number' : 'string';
                                        let finalValue = value;
                                        if (type === 'string' && typeof value === 'object' && value !== null) {
                                            finalValue = JSON.stringify(value);
                                        }
                                        variables[variableName] = { value: finalValue, type: type };
                                    } else {
                                        throw new Error(`在API响应中未找到路径 "${path}"。`);
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        // 仅当定义了 outputs 时才处理解析错误
                        if (step.outputs) {
                            if (step.outputs.hasOwnProperty('_raw')) {
                                const variableName = step.outputs['_raw'];
                                variables[variableName] = { value: responseText, type: 'string' };
                            } else {
                                throw new Error(`API 响应不是有效的 JSON，且未指定 "_raw" 输出变量。解析错误: ${error.message}`);
                            }
                        }
                        // 如果没有定义 outputs，则忽略 JSON 解析错误
                    }
                } catch (error) {
                    if (error.name === 'AbortError') {
                        throw new Error(`API 请求超时（${timeout}ms）。`);
                    }
                    throw error; // 重新抛出其他网络或解析错误
                }
                break;
            case 'wait_for_user':
                state = 'waiting_for_user_input';
                broadcastStatus();
                // 暂停执行，不推进 currentStep。等待 next_step 消息来推进。
                isExecuting = false;
                return;
            case 'switch_tab':
                if (!step.url_pattern && !step.title_pattern) {
                    throw new Error(`switch_tab 命令需要 "url_pattern" 或 "title_pattern" 参数。`);
                }

                const previousTabId = activeTabId; // 保存原始标签页ID
                const queryOptions = {};
                if (step.url_pattern) {
                    queryOptions.url = step.url_pattern;
                }

                const tabs = await chrome.tabs.query(queryOptions);
                
                let targetTab = null;
                if (step.title_pattern) {
                    const titleRegex = new RegExp(step.title_pattern.replace(/\*/g, '.*'));
                    targetTab = tabs.find(tab => titleRegex.test(tab.title));
                } else if (tabs.length > 0) {
                    targetTab = tabs[0];
                }

                if (targetTab) {
                    await chrome.tabs.update(targetTab.id, { active: true });
                    await chrome.windows.update(targetTab.windowId, { focused: true });
                    activeTabId = targetTab.id;
                    await waitForTabLoad(activeTabId, step.timeout);

                    // 如果设置了 closePreviousTab 并且新旧标签页不同，则关闭旧标签页
                    if (step.closePreviousTab === true && targetTab.id !== previousTabId) {
                        await chrome.tabs.remove(previousTabId);
                    }
                } else {
                    throw new Error(`未找到匹配的标签页 (URL: "${step.url_pattern}", Title: "${step.title_pattern}")。`);
                }
                break;
            case 'switch_iframe':
                // selector 是可选的，所以不需要检查
                await sendMessageToContentScript(activeTabId, step);
                break;
            case 'get_tab_info':
                if (!step.getProperty || !step.outputVariable) {
                    throw new Error(`get_tab_info 命令需要 "getProperty" 和 "outputVariable" 参数。`);
                }
                if (step.getProperty !== 'url' && step.getProperty !== 'title') {
                    throw new Error(`get_tab_info 的 "getProperty" 参数必须是 "url" 或 "title"。`);
                }
                const tabInfo = await chrome.tabs.get(activeTabId);
                const value = tabInfo[step.getProperty];
                variables[step.outputVariable] = { value: value, type: 'string' };
                break;
            case 'get_cookies':
                if (!step.outputVariable) {
                    throw new Error(`get_cookies 命令需要 "outputVariable" 参数。`);
                }

                // 构建 cookie 查询的 details 对象
                const cookieDetails = {};
                if (step.url) {
                    cookieDetails.url = step.url;
                } else {
                    // 如果没有提供url，就使用当前活动标签页的url
                    const tabInfo = await chrome.tabs.get(activeTabId);
                    cookieDetails.url = tabInfo.url;
                }

                // 支持 chrome.cookies.get/getAll 的所有过滤参数
                if (step.name) cookieDetails.name = step.name;
                if (step.domain) cookieDetails.domain = step.domain;
                if (step.path) cookieDetails.path = step.path;
                if (step.secure) cookieDetails.secure = step.secure;
                if (step.session) cookieDetails.session = step.session;

                // 如果指定了 name，则获取单个 cookie
                if (step.name) {
                    const cookie = await chrome.cookies.get(cookieDetails);
                    // 将 cookie 对象（或 null）转换为 JSON 字符串存储
                    variables[step.outputVariable] = { value: JSON.stringify(cookie), type: 'string' };
                } else {
                    // 否则获取所有匹配的 cookies
                    const cookies = await chrome.cookies.getAll(cookieDetails);
                    // 将 cookies 数组转换为 JSON 字符串存储
                    variables[step.outputVariable] = { value: JSON.stringify(cookies), type: 'string' };
                }
                break;
            default:
                // 对于带标签的空操作步骤，直接跳过
                if (step.label && !step.command) break;
                throw new Error(`未知命令：${step.command}`);
        }

        // 成功执行后，清除错误信息
        variables['_last_error_message'] = { value: "", type: 'string' };

        currentStep = nextStepIndex;
        isExecuting = false; // 在调度下一步或等待之前释放锁

        if (scriptConfig.autoApprove) {
            // 如果这是最后一步，完成脚本，否则继续
            if (currentStep >= currentScript.length) {
                finishScript();
            } else {
                setTimeout(executeNextStep, 100);
            }
        } else {
            // 在非自动模式下，执行完一步后，总是等待批准
            if (currentStep >= currentScript.length) {
                finishScript();
            } else {
                state = 'waiting_for_approval';
                broadcastStatus();
            }
        }
    } catch (error) {
        const step = currentScript[currentStep];
        isExecuting = false; // 在所有错误路径中释放锁

        if (step && step.continueOnError) {
            // 记录警告并继续
            warnings.push({
                step: currentStep,
                message: error.message,
                details: step
            });
            // 设置系统错误变量
            variables['_last_error_message'] = { value: error.message, type: 'string' };

            currentStep = nextStepIndex; // 标记当前步骤已“完成”（尽管是带警告的），然后继续
            broadcastStatus(); // 广播状态，让UI可以更新警告
            
            // 如果这是最后一步，完成脚本，否则继续
            if (currentStep >= currentScript.length) {
                finishScript();
            } else {
                setTimeout(executeNextStep, 100); // 立即尝试执行下一步
            }
        } else {
            // 记录致命错误并停止
            errorInfo = {
                step: currentStep,
                message: error.message,
                details: step
            };

            if (scriptConfig.restartOnError) {
                console.log("脚本出错，根据配置将在2秒后重启...", errorInfo);
                // 广播一次错误状态，以便UI可以短暂显示错误信息
                state = 'error';
                broadcastStatus();
                // 然后重置并重启
                setTimeout(() => {
                    stopScript(); // 重置状态
                    startScript(); // 重启脚本
                }, 2000);
            } else {
                state = 'error';
                if (keepAliveInterval) clearInterval(keepAliveInterval); // 停止保活
                broadcastStatus();
            }
        }
    }
}
