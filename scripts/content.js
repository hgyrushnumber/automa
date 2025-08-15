// 确保监听器只被附加一次
if (!window.hasAutomationListener) {
    window.hasAutomationListener = true;

    // 追踪当前的文档上下文，默认为顶层文档
    let currentDocument = document;

    function getElementBySelector(selector) {
        // 字符串选择器（CSS/XPath）的兼容
        if (typeof selector === 'string') {
            if (selector.startsWith('/') || selector.startsWith('(')) {
                // 使用 currentDocument 作为 XPath 的上下文节点
                const result = currentDocument.evaluate(selector, currentDocument, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                return result.singleNodeValue;
            } else {
                // 使用 currentDocument 进行查询
                return currentDocument.querySelector(selector);
            }
        }

        // 处理对象选择器
        if (typeof selector === 'object' && selector !== null) {
            const { by, value, index = 0 } = selector;
            
            if (!by || !value) {
                return null; // 'by' 和 'value' 是必需的
            }

            // 动态构建属性选择器，支持任何属性
            const attributeSelector = `[${by}="${value}"]`;
            // 使用 currentDocument 进行查询
            const elements = Array.from(currentDocument.querySelectorAll(attributeSelector));

            if (elements.length === 0) {
                return null;
            }

            let targetIndex = index;
            // 处理负数索引（倒序）
            if (targetIndex < 0) {
                targetIndex = elements.length + targetIndex;
            }

            // 检查索引是否在有效范围内
            if (targetIndex >= 0 && targetIndex < elements.length) {
                return elements[targetIndex];
            } else {
                return null; // 索引越界
            }
        }

        return null; // 无效的选择器格式
    }

    async function isElementStable(element, stabilityDelay) {
        const initialRect = element.getBoundingClientRect();
        await new Promise(resolve => setTimeout(resolve, stabilityDelay));
        const finalRect = element.getBoundingClientRect();

        return (
            initialRect.top === finalRect.top &&
            initialRect.right === finalRect.right &&
            initialRect.bottom === finalRect.bottom &&
            initialRect.left === finalRect.left &&
            initialRect.width === finalRect.width &&
            initialRect.height === finalRect.height
        );
    }

    async function waitForElement(selector, timeout, stabilityCheck) {
        const startTime = Date.now();
        let element = null;
    
        do {
            element = getElementBySelector(selector);
            if (element) {
                if (stabilityCheck > 0) {
                    if (await isElementStable(element, stabilityCheck)) {
                        return element; // 找到且稳定，返回
                    }
                } else {
                    return element; // 找到且不需要稳定检查，返回
                }
            }
            if (Date.now() - startTime < timeout) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } while (Date.now() - startTime < timeout);
    
        const selectorString = typeof selector === 'string' ? selector : JSON.stringify(selector);
        throw new Error(`选择器为 ${selectorString} 的元素超时（${timeout}ms）未找到或在${stabilityCheck}ms内无法保持稳定。`);
    }


    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
    ).set;

    function reactJsEvent(element, value) {
        if (!element._valueTracker) return;

        const previousValue = element.value;
        nativeInputValueSetter.call(element, value);
        element._valueTracker.setValue(previousValue);
    }

    async function typeInElement(element, value, mode = 'rewrite', type = 'individually') {
        highlightElement(element, true);
        await new Promise(resolve => setTimeout(resolve, 500)); // 保持高亮0.5s
        element.focus();
        element.click();

        const isContentEditable = element.isContentEditable;
        const elementKey = isContentEditable ? 'textContent' : 'value';

        if (mode === 'rewrite') {
            if (elementKey === 'value') {
                reactJsEvent(element, '');
                element.value = '';
            } else {
                element.textContent = '';
            }
        }
        
        if (type === 'individually') {
            for (const char of value) {
                if (elementKey === 'value') reactJsEvent(element, element.value);
                
                if (isContentEditable && document.execCommand) {
                    document.execCommand('insertText', false, char);
                } else {
                    element[elementKey] += char;
                }

                element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true, cancelable: true }));
                element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true, cancelable: true }));
                
                await new Promise(resolve => setTimeout(resolve, 1)); // 每个字符输入延迟1ms
            }
        } else {
            // —— 集体输入模式：一次性粘贴整段 value ——

            // 确保页面获得焦点（某些自动化环境或 iframe 场景尤其需要）
            if (!document.hasFocus()) {
                element.focus();          // 先聚焦输入框
                window.focus();           // 再让窗口获得焦点
                await new Promise(r => setTimeout(r, 0)); // 等一帧
            }

            // 写入剪贴板（先尝试 Clipboard API，失败再降级）
            let copied = false;
            if (navigator.clipboard && window.isSecureContext && document.hasFocus()) {
                try {
                    await navigator.clipboard.writeText(value);
                    copied = true;
                } catch (_) { /* ignore */ }
            }
            if (!copied) {
                // 隐藏 textarea 回退方案
                const helper = document.createElement('textarea');
                helper.value = value;
                helper.style.position = 'fixed';
                helper.style.opacity  = '0';
                document.body.appendChild(helper);
                helper.select();
                document.execCommand('copy');
                document.body.removeChild(helper);
            }

            // 粘贴或直接赋值
            element.focus();
            const pasted = document.execCommand && document.execCommand('paste');
            if (!pasted) element[elementKey] = value;

            // 触发 React / Vue 等框架识别的事件
            element.dispatchEvent(new Event('input',       { bubbles: true }));
            element.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true }));
            element.dispatchEvent(new KeyboardEvent('keyup',   { key: 'v', ctrlKey: true, bubbles: true }));
        }

        element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        element.blur();
    }

    const HIGHLIGHT_CLASS = 'automation-highlight-element';
    const STYLE_INJECTED_MARKER = 'automation-style-injected';

    // 确保高亮样式被注入到指定的文档中
    function ensureHighlightStyle(doc) {
        if (doc && doc.head && !doc.documentElement.classList.contains(STYLE_INJECTED_MARKER)) {
            const style = doc.createElement('style');
            style.textContent = `
                .${HIGHLIGHT_CLASS} {
                    border: 2px solid red !important;
                    box-shadow: 0 0 10px red !important;
                    transition: all 0.2s ease-in-out !important;
                }
            `;
            doc.head.appendChild(style);
            doc.documentElement.classList.add(STYLE_INJECTED_MARKER);
        }
    }

    // 确保主文档有样式
    ensureHighlightStyle(document);

    function highlightElement(element, start) {
        if (start) {
            element.classList.add(HIGHLIGHT_CLASS);
        } else {
            element.classList.remove(HIGHLIGHT_CLASS);
        }
    }

    function clearAllHighlights() {
        // 确保在所有可能的文档上下文中清除高亮
        const docs = [document];
        // 简单地尝试查找所有iframe并清除，忽略跨域错误
        document.querySelectorAll('iframe').forEach(iframe => {
            try {
                if (iframe.contentDocument) {
                    docs.push(iframe.contentDocument);
                }
            } catch (e) {
                // 忽略跨域iframe
            }
        });

        docs.forEach(doc => {
            doc.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach(el => {
                highlightElement(el, false);
            });
        });
    }


    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (sender.tab) {
            return true;
        }
        (async () => {
            const { command, selector, value, timeout = 0, stability = 0, clicks = 1, clickDelay = 100 } = request;
            
            try {
                let element = null;
                if (selector) {
                    element = await waitForElement(selector, timeout, stability);
                    if (!element) {
                        const selectorString = typeof selector === 'string' ? selector : JSON.stringify(selector);
                        throw new Error(`选择器为 ${selectorString} 的元素未找到。`);
                    }
                } else if (['click', 'type', 'scrape_text', 'scrape_html'].includes(command) && command !== 'scrape_html' && command !== 'switch_iframe') {
                    // scrape_html 可以没有选择器（抓取整个页面）
                    // switch_iframe 可以没有选择器（切换回主文档）
                    throw new Error(`${command} 命令需要 'selector' 参数。`);
                }

                let result = null;
                switch (command) {
                    case 'clear_highlights':
                        clearAllHighlights();
                        sendResponse({ success: true });
                        break;
                    case 'switch_iframe':
                        if (!selector) {
                            // 如果选择器为空，则切换回主文档
                            currentDocument = document;
                            ensureHighlightStyle(currentDocument); // 确保样式存在
                            sendResponse({ success: true, data: "已切换回主文档。" });
                        } else {
                            // 查找 iframe 时，必须在当前的上下文中查找
                            const iframeElement = await waitForElement(selector, timeout, stability);
                            if (!iframeElement || iframeElement.tagName.toLowerCase() !== 'iframe') {
                                const selectorString = typeof selector === 'string' ? selector : JSON.stringify(selector);
                                throw new Error(`选择器 ${selectorString} 没有找到 iframe 元素。`);
                            }
                            
                            // 高亮 iframe 元素本身，以提供视觉反馈
                            highlightElement(iframeElement, true);
                            await new Promise(resolve => setTimeout(resolve, 500)); // 保持高亮

                            // 检查同源策略
                            try {
                                if (iframeElement.contentDocument) {
                                    currentDocument = iframeElement.contentDocument;
                                    // 确保样式被注入到 iframe 的文档中
                                    ensureHighlightStyle(currentDocument);
                                    sendResponse({ success: true, data: `已切换到 iframe: ${JSON.stringify(selector)}` });
                                } else {
                                    throw new Error('无法访问 iframe 的 contentDocument。它可能尚未加载完成。');
                                }
                            } catch (e) {
                                throw new Error(`无法切换到 iframe：它可能是跨域的，或者存在安全限制。错误: ${e.message}`);
                            }
                        }
                        break;
                    case 'click':
                        highlightElement(element, true);
                        await new Promise(resolve => setTimeout(resolve, 500)); // 保持高亮0.5s
                        
                        if (clicks === 2) {
                            // 专门处理双击事件，以触发 dblclick 监听器
                            const dblClickEvent = new MouseEvent('dblclick', {
                                bubbles: true,
                                cancelable: true,
                                view: window,
                                detail: 2
                            });
                            element.dispatchEvent(dblClickEvent);
                        } else {
                            // 处理单击或多次（非2次）单击
                            for (let i = 0; i < clicks; i++) {
                                element.click();
                                if (i < clicks - 1) {
                                    await new Promise(resolve => setTimeout(resolve, clickDelay));
                                }
                            }
                        }
                        sendResponse({ success: true, data: null });
                        break;
                    case 'type':
                        // 高亮在 typeInElement 内部处理
                        await typeInElement(element, value, request.mode, request.type);
                        sendResponse({ success: true, data: null });
                        break;
                    case 'select':
                        if (element.tagName.toLowerCase() !== 'select') {
                            throw new Error(`选择器找到的元素不是一个 <select> 元素。`);
                        }

                        highlightElement(element, true);
                        await new Promise(resolve => setTimeout(resolve, 500)); // 保持高亮

                        const selectBy = request.selectBy || 'value'; // 默认为按 value 选择
                        let optionFound = false;

                        if (selectBy === 'value') {
                            // 直接设置 value，浏览器会自动匹配 option
                            element.value = value;
                            // 验证是否真的有 option 的 value 匹配
                            if (element.value === value.toString()) {
                                // 检查选中的option的value是否与目标value匹配
                                for (let i = 0; i < element.options.length; i++) {
                                    if (element.options[i].value === value.toString()) {
                                        optionFound = true;
                                        break;
                                    }
                                }
                            }
                        } else if (selectBy === 'text') {
                            for (const option of element.options) {
                                if (option.text === value) {
                                    option.selected = true;
                                    optionFound = true;
                                    break;
                                }
                            }
                        } else if (selectBy === 'index') {
                            const index = parseInt(value, 10);
                            if (!isNaN(index) && index >= 0 && index < element.options.length) {
                                element.selectedIndex = index;
                                optionFound = true;
                            }
                        } else {
                            throw new Error(`不支持的 selectBy 类型: "${selectBy}"。请使用 "value", "text", 或 "index"。`);
                        }

                        if (!optionFound) {
                            throw new Error(`在 <select> 元素中未找到匹配的选项 (selectBy: "${selectBy}", value: "${value}")。`);
                        }

                        // 触发事件以通知页面更改，确保像React/Vue这样的框架能检测到变化
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true }));

                        sendResponse({ success: true, data: null });
                        break;
                    case 'scrape_text':
                        highlightElement(element, true);
                        await new Promise(resolve => setTimeout(resolve, 500)); // 保持高亮0.5s
                        result = element.innerText;
                        sendResponse({ success: true, data: result });
                        break;
                    case 'scrape_html':
                        if (element) {
                            highlightElement(element, true);
                            await new Promise(resolve => setTimeout(resolve, 500));
                            result = element.outerHTML;
                        } else {
                            // 如果没有选择器，则抓取当前上下文的HTML
                            result = currentDocument.documentElement.outerHTML;
                        }
                        sendResponse({ success: true, data: result });
                        break;
                    default:
                        // 对于不需要选择器的命令，可以在这里处理
                        sendResponse({ success: true, data: null });
                }

            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true;
    });
}
