import type { TranslationApiConfig } from '../types';

export async function translateText(text: string, sourceLang: string, targetLang: string, cfg?: TranslationApiConfig): Promise<string> {
  if (!cfg?.enabled || !cfg.baseUrl || !cfg.apiKey || !cfg.model) throw new Error('独立翻译 API 尚未配置');
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), cfg.timeoutMs || 30000);
  try {
    const url = cfg.baseUrl.replace(/\/$/, '').replace(/\/chat\/completions$/, '') + '/chat/completions';
    const res = await fetch(url, {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${cfg.apiKey}`},
      body:JSON.stringify({
        model:cfg.model,
        temperature:0.1,
        messages:[
          {role:'system',content:`你是一个只负责翻译的翻译器。把用户提供的内容从${sourceLang || '原语言'}翻译成${targetLang || '中文'}。只输出译文，不解释，不总结，不加引号，不改变人名、专有名词、语气和格式。保留换行。`},
          {role:'user',content:text}
        ]
      }),
      signal:controller.signal
    });
    const data=await res.json().catch(()=>null);
    if(!res.ok) throw new Error(data?.error?.message || `翻译 API HTTP ${res.status}`);
    const out=data?.choices?.[0]?.message?.content;
    if(typeof out!=='string' || !out.trim()) throw new Error('翻译 API 返回为空');
    return out.trim();
  } finally { window.clearTimeout(timer); }
}
