document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const scriptSelector = document.getElementById('scriptSelector');
    const newScriptBtn = document.getElementById('newScriptBtn');
    const saveScriptBtn = document.getElementById('saveScriptBtn');
    const saveAsBtn = document.getElementById('saveAsBtn');
    const deleteScriptBtn = document.getElementById('deleteScriptBtn');
    const exportScriptBtn = document.getElementById('exportScriptBtn');
    const importScriptInput = document.getElementById('importScriptInput');
    const setActiveBtn = document.getElementById('setActiveBtn');
    const activeScriptIndicator = document.getElementById('activeScriptIndicator');

    const configEditor = document.getElementById('configEditor');
    const stepList = document.getElementById('step-list');
    const addStepBtn = document.getElementById('addStepBtn');

    const modal = document.getElementById('step-modal');
    const closeModalBtn = document.querySelector('.close-button');
    const stepForm = document.getElementById('step-form');
    const saveStepBtn = document.getElementById('saveStepBtn');
    const editingStepIndexInput = document.getElementById('editing-step-index');

    const messageDiv = document.getElementById('message');

    // App State
    let scripts = {};
    let currentScriptName = null;
    let currentScriptData = null;
    let activeScriptName = null;

    // --- Command Definitions ---
    const commandDefs = {
        "label": {
            description: "定义一个锚点（标签），用于跳转指令（如 jump, conditional_jump）的目标。",
            params: [
                // 'label' is handled specially in the UI, but we define it here for completeness
            ]
        },
        "init_variable": {
            description: "创建一个新变量，并明确其类型和初始值。",
            params: [
                { name: "variableName", type: "text", required: true, placeholder: "my_variable", description: "您要创建的变量名。" },
                { name: "type", type: "select", options: ["string", "number"], required: true, description: "变量的类型。" },
                { name: "value", type: "text", required: true, placeholder: "initial value", description: "变量的初始值。" },
                { name: "description", type: "text", placeholder: "e.g., 初始化最大重试次数" },
                { name: "continueOnError", type: "checkbox", default: false, description: "如果勾选，此步骤出错时脚本将继续执行。" }
            ]
        },
        "scrape_text": {
            description: "从页面上的一个元素抓取其可见文本。",
            params: [
                { name: "selector", type: "selector_group", required: true },
                { name: "outputVariable", type: "text", required: true, placeholder: "scraped_text_var", description: "用于存储结果的变量名。" },
                { name: "description", type: "text", placeholder: "e.g., 抓取用户名" },
                { name: "timeout", type: "text", default: 5000, placeholder: "5000", description: "等待元素出现的最长时间（毫秒）。" },
                { name: "stability", type: "text", default: 300, placeholder: "300", description: "元素出现后，额外等待其位置和大小稳定的时间（毫秒）。" },
                { name: "continueOnError", type: "checkbox", default: false, description: "如果勾选，此步骤出错时脚本将继续执行。" }
            ]
        },
        "scrape_html": {
            description: "从页面上的一个元素抓取其外部HTML (outerHTML)。",
            params: [
                { name: "selector", type: "selector_group" },
                { name: "outputVariable", type: "text", required: true, placeholder: "scraped_html_var", description: "用于存储结果的变量名。" },
                { name: "description", type: "text", placeholder: "e.g., 抓取主要内容区域的HTML" },
                { name: "timeout", type: "text", default: 5000, placeholder: "5000", description: "等待元素出现的最长时间（毫秒）。" },
                { name: "stability", type: "text", default: 300, placeholder: "300", description: "元素出现后，额外等待其位置和大小稳定的时间（毫秒）。" },
                { name: "continueOnError", type: "checkbox", default: false, description: "如果勾选，此步骤出错时脚本将继续执行。" }
            ]
        },
        "get_tab_info": {
            description: "获取当前活动标签页的URL或标题。",
            params: [
                { name: "getProperty", type: "select", options: ["url", "title"], required: true, description: "指定要获取的属性。" },
                { name: "outputVariable", type: "text", required: true, placeholder: "tab_info_var", description: "用于存储结果的变量名。" },
                { name: "description", type: "text", placeholder: "e.g., 获取当前页面的URL" },
                { name: "continueOnError", type: "checkbox", default: false, description: "如果勾选，此步骤出错时脚本将继续执行。" }
            ]
        },
        "parse_number": {
            description: "将一个字符串类型的变量转换为数字类型。",
            params: [
                { name: "inputVariable", type: "text", required: true, placeholder: "string_var_to_parse", description: "源变量名，其类型必须是string。" },
                { name: "outputVariable", type: "text", required: true, placeholder: "parsed_number_var", description: "用于存储数字结果的新变量名。" },
                { name: "description", type: "text", placeholder: "e.g., 解析价格文本为数字" },
                { name: "continueOnError", type: "checkbox", default: false, description: "如果勾选，此步骤出错时脚本将继续执行。" }
            ]
        },
        "calculate": {
            description: "执行一个简单的二元数学运算。",
            params: [
                { name: "expression", type: "text", required: true, placeholder: "var1 + 10", description: "仅支持两个操作数和一个运算符 (+, -, *, /)。" },
                { name: "outputVariable", type: "text", required: true, placeholder: "result_var", description: "用于存储计算结果的变量名。" },
                { name: "description", type: "text", placeholder: "e.g., 计数器加一" },
                { name: "continueOnError", type: "checkbox", default: false, description: "如果勾选，此步骤出错时脚本将继续执行。" }
            ]
        },
        "format_string": {
            description: "使用一个模板和现有变量的值来创建一个新的字符串。",
            params: [
                { name: "template", type: "textarea", required: true, placeholder: "Hello, ${name}!", description: "使用 ${variableName} 语法来引用变量。" },
                { name: "outputVariable", type: "text", required: true, placeholder: "formatted_string_var", description: "用于存储最终字符串的变量名。" },
                { name: "description", type: "text", placeholder: "e.g., 生成问候语" },
                { name: "continueOnError", type: "checkbox", default: false, description: "如果勾选，此步骤出错时脚本将继续执行。" }
            ]
        },
        "conditional_jump": {
            description: "当一个简单的比较条件为真时，跳转到指定的标签。",
            params: [
                { name: "condition", type: "text", required: true, placeholder: "retry_count < 5", description: "仅支持单个比较运算符 (==, !=, >, <, etc.)。" },
                { name: "targetLabel", type: "text", required: true, placeholder: "loop_start_label", description: "要跳转到的目标标签名。" },
                { name: "description", type: "text", placeholder: "e.g., 如果次数小于5则跳转" },
                { name: "continueOnError", type: "checkbox", default: false, description: "如果勾选，此步骤出错时脚本将继续执行。" }
            ]
        },
        "jump": {
            description: "无条件地跳转到指定的标签。",
            params: [
                { name: "targetLabel", type: "text", required: true, placeholder: "target_label", description: "要跳转到的目标标签名。" },
                { name: "description", type: "text", placeholder: "e.g., 无条件跳转到循环开始" },
                { name: "continueOnError", type: "checkbox", default: false, description: "如果勾选，此步骤出错时脚本将继续执行。" }
            ]
        },
        "goto": {
            description: "导航到指定的URL。",
            params: [
                { name: "url", type: "text", required: true, placeholder: "https://example.com", description: "目标URL。" },
                { name: "newTab", type: "checkbox", default: false, description: "如果勾选，将在新标签页中打开URL。" },
                { name: "description", type: "text", placeholder: "e.g., 打开谷歌首页" },
                { name: "timeout", type: "text", default: 30000, placeholder: "30000", description: "等待页面加载完成的最长时间（毫秒）。" },
                { name: "continueOnError", type: "checkbox", default: false, description: "如果勾选，此步骤出错时脚本将继续执行。" }
            ]
        },
        "switch_tab": {
            description: "根据URL或页面标题查找并切换到一个已打开的标签页。",
            params: [
                { name: "url_pattern", type: "text", placeholder: "*://*.google.com/*", description: "用于匹配URL的模式。" },
                { name: "title_pattern", type: "text", placeholder: "*Search Results", description: "用于匹配标题的模式 (支持*通配符)。" },
                { name: "closePreviousTab", type: "checkbox", default: false, description: "如果勾选，切换后将关闭之前的标签页。" },
                { name: "description", type: "text", placeholder: "e.g., 切换到百度搜索结果页" },
                { name: "timeout", type: "text", default: 30000, placeholder: "30000", description: "等待标签页加载完成的最长时间（毫秒）。" },
                { name: "continueOnError", type: "checkbox", default: false, description: "如果勾选，此步骤出错时脚本将继续执行。" }
            ]
        },
        "switch_iframe": {
            description: "将操作上下文切换到一个指定的iframe或切回主文档。",
            params: [
                { name: "selector", type: "selector_group", placeholder: "#editor-iframe", description: "定位目标iframe的选择器。如果省略，则切换回主文档。" },
                { name: "description", type: "text", placeholder: "e.g., 切换到编辑器Iframe" },
                { name: "timeout", type: "text", default: 5000, placeholder: "5000", description: "等待iframe元素出现的最长时间（毫秒）。" },
                { name: "stability", type: "text", default: 300, placeholder: "300", description: "iframe元素出现后，额外等待其位置和大小稳定的时间（毫秒）。" },
                { name: "continueOnError", type: "checkbox", default: false, description: "如果勾选，此步骤出错时脚本将继续执行。" }
            ]
        },
        "click": {
            description: "查找并点击一个页面元素。",
            params: [
                { name: "selector", type: "selector_group", required: true },
                { name: "clicks", type: "text", default: 1, description: "点击次数。设置为2会触发双击事件。" },
                { name: "clickDelay", type: "text", default: 100, description: "多次点击之间的延迟（毫秒）。" },
                { name: "description", type: "text", placeholder: "e.g., 点击提交按钮" },
                { name: "timeout", type: "text", default: 5000, placeholder: "5000", description: "等待元素出现的最长时间（毫秒）。" },
                { name: "stability", type: "text", default: 300, placeholder: "300", description: "元素出现后，额外等待其位置和大小稳定的时间（毫秒）。" },
                { name: "continueOnError", type: "checkbox", default: false, description: "如果勾选，此步骤出错时脚本将继续执行。" }
            ]
        },
        "type": {
            description: "向指定的元素输入文本。",
            params: [
                { name: "selector", type: "selector_group", required: true },
                { name: "value", type: "textarea", required: true, placeholder: "要输入的文本", description: "支持使用 ${variableName}。" },
                { name: "mode", type: "select", options: ["rewrite", "append"], default: "rewrite", description: "输入模式。" },
                { name: "type", type: "select", options: ["individually", "collectively"], default: "individually", description: "输入形式。" },
                { name: "description", type: "text", placeholder: "e.g., 在搜索框输入文字" },
                { name: "timeout", type: "text", default: 5000, placeholder: "5000", description: "等待元素出现的最长时间（毫秒）。" },
                { name: "stability", type: "text", default: 300, placeholder: "300", description: "元素出现后，额外等待其位置和大小稳定的时间（毫秒）。" },
                { name: "continueOnError", type: "checkbox", default: false, description: "如果勾选，此步骤出错时脚本将继续执行。" }
            ]
        },
        "select": {
            description: "在一个下拉菜单中选择一个选项。",
            params: [
                { name: "selector", type: "selector_group", required: true },
                { name: "value", type: "text", required: true, placeholder: "要选择的值/文本/索引", description: "根据'选择方式'指定的值。" },
                { name: "selectBy", type: "select", options: ["value", "text", "index"], default: "value", description: "选择 option 的方式。" },
                { name: "description", type: "text", placeholder: "e.g., 在下拉菜单中选择城市" },
                { name: "timeout", type: "text", default: 5000, placeholder: "5000", description: "等待元素出现的最长时间（毫秒）。" },
                { name: "stability", type: "text", default: 300, placeholder: "300", description: "元素出现后，额外等待其位置和大小稳定的时间（毫秒）。" },
                { name: "continueOnError", type: "checkbox", default: false, description: "如果勾选，此步骤出错时脚本将继续执行。" }
            ]
        },
        "wait": {
            description: "暂停脚本执行指定的毫秒数。",
            params: [
                { name: "milliseconds", type: "text", required: true, placeholder: "1000", description: "暂停的时间（毫秒）。" },
                { name: "description", type: "text", placeholder: "e.g., 等待1秒" },
                { name: "continueOnError", type: "checkbox", default: false, description: "如果勾选，此步骤出错时脚本将继续执行。" }
            ]
        },
        "wait_for_user": {
            description: "暂停脚本执行，直到用户在弹窗中手动点击“下一步”。",
            params: [
                { name: "description", type: "text", placeholder: "e.g., 等待用户确认" },
                { name: "continueOnError", type: "checkbox", default: false, description: "如果勾选，此步骤出错时脚本将继续执行。" }
            ]
        },
        "api_request": {
            description: "发起一个网络请求并解析返回的JSON。",
            params: [
                { name: "url", type: "text", required: true, placeholder: "https://api.example.com/data", description: "请求的目标URL。" },
                { name: "outputs", type: "textarea", required: true, placeholder: '{\n  "user.name": "username_var",\n  "user.id": "userId_var"\n}', description: "定义如何从JSON响应中提取数据并存入变量。" },
                { name: "data", type: "textarea", placeholder: 'POST请求体, e.g., {"key": "value"}', description: "如果提供，将使用POST方法。" },
                { name: "header", type: "textarea", placeholder: '请求头, e.g., {"Auth": "Bearer ..."}', description: "HTTP请求头。" },
                { name: "timeout", type: "text", default: 30000, description: "请求的超时时间（毫秒）。" },
                { name: "description", type: "text", placeholder: "e.g., 请求用户信息" },
                { name: "continueOnError", type: "checkbox", default: false, description: "如果勾选，此步骤出错时脚本将继续执行。" }
            ]
        }
    };

    // --- Initialization ---
    async function initialize() {
        const data = await chrome.storage.local.get(['scripts', 'lastSelectedScript', 'activeScriptName']);
        scripts = data.scripts || {};
        currentScriptName = data.lastSelectedScript || null;
        activeScriptName = data.activeScriptName || null;

        if (Object.keys(scripts).length === 0) {
            showEmptyState();
            return;
        }

        if (!currentScriptName || !scripts[currentScriptName]) {
            currentScriptName = Object.keys(scripts)[0];
        }

        await loadScript(currentScriptName);
        populateScriptSelector();
    }

    // --- Script Management ---
    function populateScriptSelector() {
        scriptSelector.innerHTML = '';
        for (const name in scripts) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            if (name === currentScriptName) {
                option.selected = true;
            }
            scriptSelector.appendChild(option);
        }
    }

    async function loadScript(name) {
        if (!name || !scripts[name]) return;
        currentScriptName = name;
        currentScriptData = JSON.parse(JSON.stringify(scripts[name])); // Deep copy
        await chrome.storage.local.set({ lastSelectedScript: name });
        renderUI();
    }

    async function saveCurrentScript() {
        if (!currentScriptName) {
            showMessage('错误：没有活动的脚本名称。请使用“另存为”。', 'error');
            return;
    }
        // Sync config from UI to data object before saving
        currentScriptData.config.autoApprove = document.getElementById('config-autoApprove').checked;
        currentScriptData.config.showWarnings = document.getElementById('config-showWarnings').checked;
        currentScriptData.config.autoStart = document.getElementById('config-autoStart').checked;

        scripts[currentScriptName] = currentScriptData;
        await chrome.storage.local.set({ scripts: scripts });
        showMessage(`脚本 "${currentScriptName}" 已保存！若要生效请点击设为活动脚本。`, 'success');
    }

    // --- UI Rendering ---
    function renderUI() {
        renderConfig();
        renderStepList();
        updateActiveIndicator();
    }

    function renderConfig() {
        const config = currentScriptData.config || {};
        document.getElementById('config-autoApprove').checked = !!config.autoApprove;
        document.getElementById('config-showWarnings').checked = !!config.showWarnings;
        document.getElementById('config-autoStart').checked = !!config.autoStart;
    }

    function updateActiveIndicator() {
        if (activeScriptName) {
            activeScriptIndicator.textContent = `活动脚本: ${activeScriptName}`;
            activeScriptIndicator.style.display = 'inline';
            activeScriptIndicator.className = 'active-script-indicator active';
        } else {
            activeScriptIndicator.textContent = '提醒：当前没有设置活动脚本。';
            activeScriptIndicator.style.display = 'inline';
            activeScriptIndicator.className = 'active-script-indicator warning';
        }
    }

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

    function renderStepList() {
        stepList.innerHTML = '';
        if (!currentScriptData || !currentScriptData.script) return;
        currentScriptData.script.forEach((step, index) => {
            const li = document.createElement('li');
            li.className = 'step-item';
            li.dataset.index = index;
            li.draggable = true;

            li.innerHTML = `
                <span class="drag-handle">⠿</span>
                <div class="step-summary">
                    <span class="command">${step.command || 'label'}</span>
                    <span class="description">${formatStepDetails(step)}</span>
                </div>
                <div class="step-actions">
                    <button class="edit-step-btn">编辑</button>
                    <button class="duplicate-step-btn">复制</button>
                    <button class="delete-step-btn">删除</button>
                </div>
            `;
            stepList.appendChild(li);
        });
    }

    // --- Modal and Form Logic ---
    function openModalForStep(index = -1) {
        const isNew = index === -1;
        const step = isNew ? { command: 'label' } : { ...currentScriptData.script[index] }; // Create a copy
        editingStepIndexInput.value = index;
    
        // Generate form fields first
        generateFormFields(step);
    
        modal.style.display = 'block';
    }

    function generateFormFields(step) {
        const command = step.command || 'label';
        const commandDef = commandDefs[command];
        if (!commandDef) return;

        const currentIndex = editingStepIndexInput.value;
        stepForm.innerHTML = `
            <input type="hidden" id="editing-step-index" value="${currentIndex}">
            <div class="full-width top-grid">
                <div class="form-field">
                    <label for="command">指令:</label>
                    <select id="command" name="command">
                        ${Object.keys(commandDefs).map(cmd => `<option value="${cmd}" ${cmd === command ? 'selected' : ''}>${cmd}</option>`).join('')}
                    </select>
                </div>
                <div class="form-field">
                    <label for="label">标签 (可选):</label>
                    <input type="text" id="label" name="label" placeholder="e.g., loop_start" value="${step.label || ''}">
                </div>
            </div>
            <p class="command-description">${commandDef.description || ''}</p>
        `;

        const fields = commandDef.params || [];
        fields.forEach(field => {
            const container = document.createElement('div');
            container.className = 'form-field';

            // Handle special group types
            if (field.type === 'selector_group') {
                const isStructure = typeof step.selector === 'object' && step.selector !== null;
                const isXpath = typeof step.selector === 'string' && (step.selector.startsWith('/') || step.selector.startsWith('('));
                const initialType = isStructure ? 'structure' : (isXpath ? 'xpath' : 'css');

                container.innerHTML = `
                    <fieldset>
                        <legend>选择器 ${field.required ? ' (必填)' : ' (可选)'}</legend>
                        <div class="selector-type-switcher">
                            <select id="selector-type">
                                <option value="css" ${initialType === 'css' ? 'selected' : ''}>CSS Selector</option>
                                <option value="xpath" ${initialType === 'xpath' ? 'selected' : ''}>XPath</option>
                                <option value="structure" ${initialType === 'structure' ? 'selected' : ''}>结构化 (按属性)</option>
                            </select>
                        </div>
                        <div id="selector-fields-container"></div>
                    </fieldset>
                `;
                stepForm.appendChild(container);
                
                const typeSwitcher = container.querySelector('#selector-type');
                const fieldsContainer = container.querySelector('#selector-fields-container');

                function updateSelectorFields() {
                    const type = typeSwitcher.value;
                    if (type === 'css' || type === 'xpath') {
                        fieldsContainer.innerHTML = `
                            <div class="form-field">
                                <input type="text" id="selector-string" name="selector-string" placeholder="${type === 'css' ? '#id .class' : '/html/body/div[1]'}">
                            </div>
                        `;
                        if (typeof step.selector === 'string') {
                            fieldsContainer.querySelector('#selector-string').value = step.selector;
                        }
                    } else { // structure
                        fieldsContainer.innerHTML = `
                            <div class="selector-grid">
                                <label for="selector-by">属性名:</label>
                                <input type="text" id="selector-by" name="selector-by" placeholder="e.g., data-testid">
                                <label for="selector-value">属性值:</label>
                                <input type="text" id="selector-value" name="selector-value" placeholder="e.g., submit-button">
                                <label for="selector-index">索引:</label>
                                <input type="text" id="selector-index" name="selector-index" value="0" title="0 is the first element, -1 is the last.">
                            </div>
                        `;
                        if (isStructure) {
                            fieldsContainer.querySelector('#selector-by').value = step.selector.by || '';
                            fieldsContainer.querySelector('#selector-value').value = step.selector.value || '';
                            fieldsContainer.querySelector('#selector-index').value = step.selector.index || 0;
                        }
                    }
                }
                
                typeSwitcher.addEventListener('change', updateSelectorFields);
                updateSelectorFields(); // Initial render
                return;
            }

            if (field.type === 'advanced_group') {
                const details = document.createElement('details');
                details.innerHTML = `<summary>高级选项</summary>`;
                field.params.forEach(subField => {
                    const subContainer = document.createElement('div');
                    subContainer.className = 'form-field';
                    subContainer.innerHTML = createFieldHtml(subField);
                    details.appendChild(subContainer);
                    // Populate value
                    const input = subContainer.querySelector(`[name="${subField.name}"]`);
                    if (input && step[subField.name] !== undefined) {
                         if (input.type === 'checkbox') input.checked = !!step[subField.name];
                         else input.value = step[subField.name];
                    }
                });
                stepForm.appendChild(details);
                return;
            }

            container.innerHTML = createFieldHtml(field);
            stepForm.appendChild(container);
            // Populate value
            const input = container.querySelector(`[name="${field.name}"]`);
            if (input && step[field.name] !== undefined) {
                if (input.type === 'checkbox') input.checked = !!step[field.name];
                else input.value = step[field.name];
            }
        });
    }

    function createFieldHtml(field) {
        let inputHtml = '';
        if (field.type === 'checkbox') {
            return `
                <div class="checkbox-container">
                    <input type="checkbox" id="param-${field.name}" name="${field.name}" ${field.default ? 'checked' : ''}>
                    <label for="param-${field.name}">${field.description || field.name}</label>
                </div>
            `;
        }
        if (field.type === 'textarea') {
            inputHtml = `<textarea id="param-${field.name}" name="${field.name}" rows="3" placeholder="${field.placeholder || ''}"></textarea>`;
        } else if (field.type === 'select') {
            const options = field.options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
            inputHtml = `<select id="param-${field.name}" name="${field.name}">${options}</select>`;
        } else {
            inputHtml = `<input type="${field.type}" id="param-${field.name}" name="${field.name}" placeholder="${field.placeholder || ''}" value="${field.default || ''}">`;
        }
        return `
            <label for="param-${field.name}">${field.name}${field.required ? ' (必填)' : ' (可选)'}:</label>
            ${inputHtml}
            <p class="param-description">${field.description || ''}</p>
        `;
    }

    function saveStepFromModal() {
        const index = parseInt(editingStepIndexInput.value, 10);
        const formData = new FormData(stepForm);
        const newStepData = {};

        // Handle selector group separately
        const selectorType = stepForm.querySelector('#selector-type')?.value;
        if (selectorType) {
            if (selectorType === 'css' || selectorType === 'xpath') {
                const selectorStr = formData.get('selector-string');
                if (selectorStr) {
                    newStepData.selector = selectorStr;
                }
            } else { // structure
                const by = formData.get('selector-by');
                const val = formData.get('selector-value');
                if (by && val) {
                    newStepData.selector = {
                        by: by,
                        value: val,
                        index: parseInt(formData.get('selector-index'), 10) || 0
                    };
                }
            }
            formData.delete('selector-type');
            formData.delete('selector-string');
            formData.delete('selector-by');
            formData.delete('selector-value');
            formData.delete('selector-index');
        }

        for (const [key, value] of formData.entries()) {
            const inputElement = stepForm.elements[key];
            if (!inputElement) continue;

            if (inputElement.type === 'checkbox') {
                newStepData[key] = inputElement.checked;
            } else if (value) {
                if (inputElement.tagName === 'TEXTAREA') {
                    try { newStepData[key] = JSON.parse(value); } 
                    catch (e) { newStepData[key] = value; }
                } else {
                    newStepData[key] = value;
                }
            }
        }
        
        // If command is 'label', remove it as it's a pseudo-command
        if (newStepData.command === 'label') {
            delete newStepData.command;
        }

        if (index === -1) { // New step
            currentScriptData.script.push(newStepData);
        } else { // Editing existing step
            currentScriptData.script[index] = newStepData;
        }

        renderStepList();
        closeModal();
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    async function setActiveScript() {
        if (!currentScriptName || !currentScriptData) {
            showMessage('请先选择或保存一个脚本。', 'error');
            return;
        }
        // 先保存当前脚本到脚本库
        await saveCurrentScript();
        
        // 然后将当前脚本设置为活动脚本
        await chrome.storage.local.set({ automationScript: currentScriptData, activeScriptName: currentScriptName });
        activeScriptName = currentScriptName;
        updateActiveIndicator();
        
        // 通知后台脚本停止当前任务并重置状态
        chrome.runtime.sendMessage({ command: 'stop' });

        showMessage(`脚本 "${currentScriptName}" 已被设为活动脚本！`, 'success');
    }

    // --- Event Listeners ---
    scriptSelector.addEventListener('change', (e) => loadScript(e.target.value));
    saveScriptBtn.addEventListener('click', saveCurrentScript);
    setActiveBtn.addEventListener('click', setActiveScript);

    newScriptBtn.addEventListener('click', async () => {
        const newName = prompt("请输入新脚本的名称:", `script_${Date.now()}`);
        if (newName && !scripts[newName]) {
            const wasEmpty = Object.keys(scripts).length === 0;
            scripts[newName] = { config: { autoApprove: true, showWarnings: true, autoStart: false }, script: [] };
            await chrome.storage.local.set({ scripts });
            currentScriptName = newName;
            if (wasEmpty) {
                // Reload the entire page to get the full UI back
                window.location.reload();
            } else {
                populateScriptSelector();
                await loadScript(newName);
            }
        } else if (newName) {
            alert("该名称已存在！");
        }
    });

    saveAsBtn.addEventListener('click', () => {
        const newName = prompt("请输入新脚本的副本名称:", `${currentScriptName}_copy`);
        if (newName && !scripts[newName]) {
            scripts[newName] = JSON.parse(JSON.stringify(currentScriptData)); // Deep copy
            currentScriptName = newName;
            populateScriptSelector();
            loadScript(newName);
        } else if (newName) {
            alert("该名称已存在！");
        }
    });

    deleteScriptBtn.addEventListener('click', async () => {
        if (confirm(`确定要删除脚本 "${currentScriptName}" 吗？`)) {
            const deletedScriptName = currentScriptName;
            delete scripts[deletedScriptName];
            
            // 如果删除的是活动脚本，则清除活动脚本的设置
            if (deletedScriptName === activeScriptName) {
                await chrome.storage.local.remove(['automationScript', 'activeScriptName']);
                activeScriptName = null;
                // 通知后台停止，以防它仍在运行被删除的脚本
                chrome.runtime.sendMessage({ command: 'stop' });
            }

            await chrome.storage.local.set({ scripts });
            currentScriptName = null;
            await chrome.storage.local.remove('lastSelectedScript');
            initialize(); // Re-initialize to select a new script
        }
    });

    exportScriptBtn.addEventListener('click', () => {
        if (!currentScriptData) return;
        const dataStr = JSON.stringify(currentScriptData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentScriptName}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    importScriptInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                // Basic validation
                if (typeof importedData.config !== 'object' || !Array.isArray(importedData.script)) {
                    throw new Error("无效的脚本文件格式。");
                }
                const wasEmpty = Object.keys(scripts).length === 0;
                let newName = file.name.replace('.json', '');
                if (scripts[newName]) {
                    newName = `${newName}_${Date.now()}`;
                }
                scripts[newName] = importedData;
                await chrome.storage.local.set({ scripts });

                if (wasEmpty) {
                    window.location.reload();
                } else {
                    currentScriptName = newName;
                    populateScriptSelector();
                    await loadScript(newName);
                    showMessage(`脚本 "${newName}" 已成功导入！`, 'success');
                }
            } catch (err) {
                showMessage(`导入失败: ${err.message}`, 'error');
            }
        };
        reader.readAsText(file);
        // Reset input to allow importing the same file again
        e.target.value = '';
    });
    
    configEditor.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            currentScriptData.config[e.target.id.replace('config-', '')] = e.target.checked;
        }
    });

    addStepBtn.addEventListener('click', () => openModalForStep(-1));

    stepList.addEventListener('click', (e) => {
        const target = e.target;
        const stepItem = target.closest('.step-item');
        if (!stepItem) return;
        const index = parseInt(stepItem.dataset.index, 10);

        if (target.classList.contains('edit-step-btn')) {
            openModalForStep(index);
        }
        if (target.classList.contains('delete-step-btn')) {
            currentScriptData.script.splice(index, 1);
            renderStepList();
        }
        if (target.classList.contains('duplicate-step-btn')) {
            const duplicatedStep = JSON.parse(JSON.stringify(currentScriptData.script[index]));
            currentScriptData.script.splice(index + 1, 0, duplicatedStep);
            renderStepList();
        }
    });

    stepForm.addEventListener('change', (e) => {
        if (e.target.name === 'command') {
            // generateFormFields 函数期望一个步骤对象。
            // 我们用新选择的指令创建一个新对象。
            // 同时，在指令切换时保留已输入的标签（label）值。
            const newStep = { command: e.target.value };
            const labelInput = stepForm.querySelector('#label');
            if (labelInput) {
                newStep.label = labelInput.value;
            }
            generateFormFields(newStep);
        }
    });

    closeModalBtn.addEventListener('click', closeModal);
    saveStepBtn.addEventListener('click', saveStepFromModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Drag and Drop
    let draggedItem = null;
    stepList.addEventListener('dragstart', (e) => {
        draggedItem = e.target;
        setTimeout(() => e.target.classList.add('dragging'), 0);
    });
    stepList.addEventListener('dragend', (e) => {
        e.target.classList.remove('dragging');
    });
    stepList.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(stepList, e.clientY);
        const draggingElement = document.querySelector('.dragging');
        if (afterElement == null) {
            stepList.appendChild(draggingElement);
        } else {
            stepList.insertBefore(draggingElement, afterElement);
        }
    });

    stepList.addEventListener('drop', () => {
        const newOrderedScript = [];
        stepList.querySelectorAll('.step-item').forEach(item => {
            const originalIndex = parseInt(item.dataset.index, 10);
            newOrderedScript.push(currentScriptData.script[originalIndex]);
        });
        currentScriptData.script = newOrderedScript;
        renderStepList(); // Re-render to fix original indices and ensure data consistency
    });

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.step-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = type;
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = '';
        }, 3000);
    }

    function showEmptyState() {
        const container = document.querySelector('.container');
        // Hide all but the necessary elements
        document.querySelector('.script-manager').style.display = 'none';
        document.querySelector('.config-section').style.display = 'none';
        document.querySelector('h2').style.display = 'none';
        stepList.style.display = 'none';
        addStepBtn.style.display = 'none';

        let emptyStateDiv = document.getElementById('empty-state-container');
        if (!emptyStateDiv) {
            emptyStateDiv = document.createElement('div');
            emptyStateDiv.id = 'empty-state-container';
            emptyStateDiv.className = 'empty-state';
            container.appendChild(emptyStateDiv);
        }
        
        emptyStateDiv.innerHTML = `
            <p>您还没有任何脚本。</p>
            <button id="newScriptBtnEmpty">创建您的第一个脚本</button>
            <label for="importScriptInput" class="button-like-label">或导入一个脚本</label>
        `;

        document.getElementById('newScriptBtnEmpty').addEventListener('click', async () => {
            const newName = prompt("请输入新脚本的名称:", `script_${Date.now()}`);
            if (newName && !scripts[newName]) {
                scripts[newName] = { config: { autoApprove: true, showWarnings: true, autoStart: false }, script: [] };
                await chrome.storage.local.set({ scripts });
                // Reload the entire page to get the full UI back
                window.location.reload();
            } else if (newName) {
                alert("该名称已存在！");
            }
        });
    }

    // --- Run ---
    initialize();
});
