document.addEventListener('DOMContentLoaded', () => {
    const taskListContainer = document.getElementById('task-list-container');
    const startButton = document.getElementById('startButton');
    const pauseButton = document.getElementById('pauseButton');
    const stopButton = document.getElementById('stopButton');
    const nextStepButton = document.getElementById('nextStepButton');
    const configButton = document.getElementById('configButton');
    const detailPanel = document.getElementById('detail-panel');
    const detailPanelContent = document.getElementById('detail-panel-content');
    const closeDetailPanel = document.getElementById('close-detail-panel');

    let currentStatusInfo = {}; // 用于存储最新的状态信息
    let activeDetailVariable = null; // 用于追踪当前在详细面板中显示的变量名

    // SVG 图标
    const icons = {
        pending: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-circle" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/></svg>`,
        completed: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-circle-fill" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></svg>`,
        running: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-right-circle-fill" viewBox="0 0 16 16"><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z"/></svg>`,
        waiting: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pause-circle-fill" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM6.25 5C5.56 5 5 5.56 5 6.25v3.5a1.25 1.25 0 1 0 2.5 0v-3.5C7.5 5.56 6.94 5 6.25 5zm3.5 0c-.69 0-1.25.56-1.25 1.25v3.5a1.25 1.25 0 1 0 2.5 0v-3.5C11 5.56 10.44 5 9.75 5z"/></svg>`,
        waiting_user: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-fill" viewBox="0 0 16 16"><path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>`,
        paused: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pause-circle-fill" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM6.25 5C5.56 5 5 5.56 5 6.25v3.5a1.25 1.25 0 1 0 2.5 0v-3.5C7.5 5.56 6.94 5 6.25 5zm3.5 0c-.69 0-1.25.56-1.25 1.25v3.5a1.25 1.25 0 1 0 2.5 0v-3.5C11 5.56 10.44 5 9.75 5z"/></svg>`,
        error: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-exclamation-circle-fill" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/></svg>`,
        warning: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-exclamation-triangle-fill" viewBox="0 0 16 16"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>`
    };

    function formatStepDetails(step) {
        if (step.description) {
            return step.description;
        }

        // 如果没有description，则根据命令生成一个默认的
        let details = step.command || '';
        if (step.selector) {
            if (typeof step.selector === 'object') {
                details += ` by ${step.selector.by}: ${step.selector.value}`;
            } else {
                details += `: ${step.selector}`;
            }
        } else if (step.url) {
            details += `: ${step.url}`;
        } else if (step.variableName) {
            details += `: ${step.variableName}`;
        } else if (step.expression) {
            details += `: ${step.expression}`;
        } else if (step.condition) {
            details += `: ${step.condition}`;
        } else if (step.label) {
            details = `Label: ${step.label}`;
        }

        return details || '(未命名步骤)';
    }

    // 判断字符串是否可能是HTML
    function isHtml(str) {
        const doc = new DOMParser().parseFromString(str, "text/html");
        return Array.from(doc.body.childNodes).some(node => node.nodeType === 1);
    }

    // 判断字符串是否可能是JSON
    function isJson(str) {
        try {
            const obj = JSON.parse(str);
            return !!obj && typeof obj === 'object';
        } catch (e) {
            return false;
        }
    }

    // 渲染详细信息面板内容的函数
    function renderDetailContent(variableName) {
        detailPanelContent.innerHTML = ''; // 清空
        const latestValue = currentStatusInfo.variables[variableName]?.value;

        if (latestValue === undefined) {
            detailPanelContent.textContent = '错误：找不到该变量的最新值。';
            return;
        }

        const currentStrValue = String(latestValue);
        const currentMightBeJson = isJson(currentStrValue);
        const currentMightBeHtml = isHtml(currentStrValue);

        if (currentMightBeJson) {
            const pre = document.createElement('pre');
            pre.textContent = JSON.stringify(JSON.parse(currentStrValue), null, 2);
            detailPanelContent.appendChild(pre);
        } else if (currentMightBeHtml) {
            detailPanelContent.innerHTML = currentStrValue;
        } else {
            const pre = document.createElement('pre');
            pre.textContent = currentStrValue;
            detailPanelContent.appendChild(pre);
        }
    }

    // 渲染变量值单元格
    function renderVariableValue(cell, value, variableName) {
        const strValue = String(value);
        const isLong = strValue.length > 50;
        const mightBeHtml = isHtml(strValue);
        const mightBeJson = isJson(strValue);

        if (isLong || mightBeHtml || mightBeJson) {
            cell.innerHTML = ''; // 清空单元格
            const link = document.createElement('a');
            link.href = '#';
            link.textContent = '查看完整内容';
            link.className = 'view-content-link';
            link.addEventListener('click', (e) => {
                e.preventDefault();
                activeDetailVariable = variableName; // 追踪当前显示的变量
                chrome.storage.session.set({ activeDetailVariable: variableName }); // 保存状态
                renderDetailContent(variableName);
                document.body.classList.add('detail-visible');
            });
            cell.appendChild(link);
        } else {
            cell.textContent = strValue;
        }
    }

    // 更新UI的函数
    function updateUI(statusInfo) {
        currentStatusInfo = statusInfo; // 存储最新状态
        const { status, step: currentStep, script, errorInfo, warnings, variables, completionMessage, showWarnings } = statusInfo;
        
        // 如果任务结束、停止或出错，则关闭详细信息面板
        if (status === 'idle') {
            if (document.body.classList.contains('detail-visible')) {
                document.body.classList.remove('detail-visible');
                activeDetailVariable = null;
                // 后台已经清除了session，这里无需再次清除
            }
        }
        
        // 如果详细面板是打开的，并且正在追踪一个变量，就刷新它
        if (activeDetailVariable && document.body.classList.contains('detail-visible')) {
            renderDetailContent(activeDetailVariable);
        }

        // 处理警告容器
        const warningsContainer = document.getElementById('warnings-container');
        const warningsList = document.getElementById('warnings-list');
        warningsList.innerHTML = '';
        if (showWarnings && warnings && warnings.length > 0) {
            warningsContainer.style.display = 'block';
            warnings.forEach(warning => {
                const li = document.createElement('li');
                
                const messageDiv = document.createElement('div');
                messageDiv.className = 'warning-message';
                messageDiv.textContent = `${warning.message}`;
                
                const detailsPre = document.createElement('pre');
                detailsPre.className = 'warning-details';
                detailsPre.textContent = JSON.stringify(warning.details, null, 2);

                li.appendChild(messageDiv);
                li.appendChild(detailsPre);
                warningsList.appendChild(li);
            });
        } else {
            warningsContainer.style.display = 'none';
        }

        // 处理变量表格
        const variablesContainer = document.getElementById('variables-container');
        const variablesBody = document.getElementById('variables-body');
        variablesBody.innerHTML = ''; // 清空旧数据
        if (variables && Object.keys(variables).length > 0) {
            variablesContainer.style.display = 'block';
            for (const key in variables) {
                const variable = variables[key];
                const row = document.createElement('tr');
                
                const nameCell = document.createElement('td');
                nameCell.textContent = key;
                row.appendChild(nameCell);

                const typeCell = document.createElement('td');
                typeCell.textContent = variable.type;
                row.appendChild(typeCell);

                const valueCell = document.createElement('td');
                renderVariableValue(valueCell, variable.value, key);
                row.appendChild(valueCell);

                variablesBody.appendChild(row);
            }
        } else {
            variablesContainer.style.display = 'none';
        }

        // 处理完成消息容器
        const completionContainer = document.getElementById('completion-container');
        const completionContent = document.getElementById('completion-content');
        if (completionMessage) {
            completionContainer.style.display = 'block';
            completionContent.textContent = completionMessage;
        } else {
            completionContainer.style.display = 'none';
        }

        // 处理错误容器
        const errorContainer = document.getElementById('error-container');
        const errorMessage = document.getElementById('error-message');
        const errorDetails = document.getElementById('error-details');
        
        // 默认隐藏错误容器
        errorContainer.style.display = 'none';

        // 渲染任务列表
        if (script && script.length > 0 && !(script.length === 1 && script[0].command === 'error')) {
            const ul = document.createElement('ul');
            script.forEach((step, index) => {
                const li = document.createElement('li');
                let icon = icons.pending;
                let liClass = 'pending';

                const hasWarning = warnings && warnings.some(w => w.step === index);

                if (status === 'error' && index === errorInfo?.step) {
                    liClass = 'error';
                    icon = icons.error;
                } else if (index < currentStep) {
                    liClass = 'completed';
                    icon = icons.completed;
                    if (hasWarning) {
                        liClass = 'warning';
                        icon = icons.warning;
                    }
                } else if (index === currentStep) {
                    switch (status) {
                        case 'running':
                            liClass = 'running';
                            icon = icons.running;
                            break;
                        case 'paused':
                            liClass = 'paused';
                            icon = icons.paused;
                            break;
                        case 'waiting_for_approval':
                            liClass = 'waiting';
                            icon = icons.waiting;
                            break;
                        case 'waiting_for_user_input':
                            liClass = 'waiting';
                            icon = icons.waiting_user;
                            break;
                    }
                }
                
                li.className = liClass;
                li.innerHTML = `<span class="status-icon">${icon}</span><span>${formatStepDetails(step)}</span>`;
                ul.appendChild(li);
            });
            taskListContainer.innerHTML = '';
            taskListContainer.appendChild(ul);
        } else {
            const isEmpty = !script || script.length === 0;
            const mainContainer = document.getElementById('main-container');
            mainContainer.innerHTML = `
                <h3>自动化脚本插件</h3>
                <div class="no-script-info">
                    <p>${isEmpty ? '当前没有活动的脚本。' : '加载活动脚本时出错。'}</p>
                    <p>请前往配置页面设置一个活动脚本。</p>
                    <button id="configButton">配置脚本</button>
                </div>
            `;
            document.getElementById('configButton').addEventListener('click', () => {
                chrome.runtime.openOptionsPage();
            });
            return; // Stop further UI updates
        }


        // 按钮更新
        startButton.disabled = true;
        pauseButton.disabled = true;
        stopButton.disabled = true;
        nextStepButton.disabled = true;
        pauseButton.textContent = '暂停';

        switch (status) {
            case 'running':
                pauseButton.disabled = false;
                stopButton.disabled = false;
                break;
            case 'paused':
                pauseButton.disabled = false;
                pauseButton.textContent = '继续';
                stopButton.disabled = false;
                break;
            case 'waiting_for_approval':
            case 'waiting_for_user_input':
                stopButton.disabled = false;
                nextStepButton.disabled = false;
                break;
            case 'error':
                // 显示错误信息
                if (errorInfo) {
                    errorContainer.style.display = 'block';
                    errorMessage.textContent = errorInfo.message || '未知错误';
                    
                    // 格式化错误详情
                    if (errorInfo.details) {
                        const detailsText = JSON.stringify(errorInfo.details, null, 2);
                        errorDetails.textContent = detailsText;
                    } else {
                        errorDetails.textContent = '无详细信息';
                    }
                }
                stopButton.disabled = false;
                break;
            case 'idle':
            default:
                startButton.disabled = false;
                break;
        }
    }

    // 恢复详细面板的状态
    chrome.storage.session.get(['activeDetailVariable'], (result) => {
        if (result.activeDetailVariable) {
            activeDetailVariable = result.activeDetailVariable;
            document.body.classList.add('detail-visible');
            // 内容将在第一次 updateUI 时被填充
        }
    });

    chrome.runtime.sendMessage({ command: 'getStatus' }, (response) => {
        if (chrome.runtime.lastError) {
            taskListContainer.innerHTML = `错误: 无法连接到后端。${chrome.runtime.lastError.message}`;
        } else if (response) {
            updateUI(response);
        }
    });

    // 监听来自后端的状态更新
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'statusUpdate') {
            updateUI(request);
        }
    });

    // 按钮事件监听
    startButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({
            command: 'start'
        });
    });

    pauseButton.addEventListener('click', () => {
        const command = pauseButton.textContent === '暂停' ? 'pause' : 'resume';
        chrome.runtime.sendMessage({ command: command });
    });

    stopButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ command: 'stop' });
    });

    nextStepButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ command: 'next_step' });
    });

    configButton.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // 关闭详细信息面板
    closeDetailPanel.addEventListener('click', () => {
        document.body.classList.remove('detail-visible');
        activeDetailVariable = null; // 停止追踪
        chrome.storage.session.remove('activeDetailVariable'); // 清除保存的状态
    });
});
