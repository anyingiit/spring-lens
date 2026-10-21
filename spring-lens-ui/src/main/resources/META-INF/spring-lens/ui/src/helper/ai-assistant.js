import ENDPOINTS from './api-endpoints.js';

// Deliberately send only fixed selections, never DOM contents, query strings, or diagnostic data.
export async function initializeAiAssistant() {
    const base = ENDPOINTS.APPLICATION_INFO.replace(/\/application$/, '/ai');
    try {
        const response = await fetch(`${base}/capabilities`, {signal: AbortSignal.timeout(3000)});
        if (!response.ok) return;
        const capabilities = await response.json();
        if (capabilities.module !== 'bean-definitions') return;
    } catch { return; }

    const launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.textContent = 'AI insights';
    launcher.className = 'fixed bottom-6 right-6 z-50 rounded-xl bg-indigo-600 text-white px-4 py-3 shadow-lg';
    launcher.setAttribute('aria-controls', 'ai-insights');
    const drawer = document.createElement('dialog');
    drawer.id = 'ai-insights';
    drawer.className = 'rounded-xl p-6 max-w-lg w-full bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100';
    drawer.innerHTML = `<form method="dialog"><button class="float-right" aria-label="Close AI insights">Close</button></form>
        <h2 class="text-xl font-bold">AI insights</h2>
        <p class="my-3 text-sm">Analyze existing bean definitions. Only bounded numeric counts are sent to your configured AI provider. Generated advice may be inaccurate; verify it against observability data.</p>
        <p id="ai-page-context" class="text-sm"></p>
        <label class="block my-3">Focus
            <select id="ai-focus" class="text-gray-900">
                <option value="OVERVIEW">Bean definitions overview</option>
                <option value="LAZY_INITIALIZATION">Lazy initialization</option>
                <option value="SCOPES">Bean scopes</option>
            </select>
        </label>
        <button id="ai-generate" type="button" class="rounded bg-indigo-600 text-white px-4 py-2">Generate insight</button>
        <pre id="ai-result" class="whitespace-pre-wrap mt-4 text-sm" role="status" aria-live="polite"></pre>`;
    document.body.append(launcher, drawer);
    const generate = drawer.querySelector('#ai-generate');
    const result = drawer.querySelector('#ai-result');
    launcher.addEventListener('click', () => {
        // Page context is displayed locally; the only supported server context is bean definitions.
        drawer.querySelector('#ai-page-context').textContent = 'Analysis context: Bean definitions';
        drawer.showModal();
    });
    let pending;
    drawer.addEventListener('close', () => pending?.abort());
    generate.addEventListener('click', async () => {
        generate.disabled = true;
        result.textContent = 'Analyzing…';
        pending = new AbortController();
        const timer = setTimeout(() => pending.abort(), 32000);
        try {
            const response = await fetch(`${base}/insights`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({module: 'bean-definitions', focus: drawer.querySelector('#ai-focus').value}),
                signal: pending.signal
            });
            if (!response.ok) throw new Error('unavailable');
            const data = await response.json();
            // Model output is untrusted: never render HTML or Markdown.
            result.textContent = typeof data.insight === 'string' ? data.insight : 'AI insights are unavailable.';
        } catch {
            result.textContent = 'AI insights are unavailable. You can continue using Spring Lens.';
        } finally {
            clearTimeout(timer);
            generate.disabled = false;
        }
    });
}
