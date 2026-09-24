export type AssistantImageIntentSource = 'send_image_tag' | 'legacy_photo_text';

export interface AssistantImageIntent {
  scene: string;
  cleanedText: string;
  source: AssistantImageIntentSource;
}

const normalizeScene = (value: string): string => String(value || '')
  .replace(/^\s*(?:图片描述|照片描述|画面描述)\s*[：:]\s*/u, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 2400);

const normalizeCleanedText = (value: string): string => String(value || '')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n{2,}/g, '\n')
  .replace(/[ \t]{2,}/g, ' ')
  .replace(/^\s*[，,、;；]+\s*/u, '')
  .replace(/\s*[，,、;；]+\s*$/u, '')
  .trim();

/**
 * 识别角色“要真实发图”的输出，并把只供生图 API 使用的长画面描述从聊天正文剥离。
 *
 * 首选规范：
 *   [[SEND_IMAGE: 画面描述]]
 *
 * 兼容模型常见的拟态文本：
 *   [你发送了一张照片：画面描述]
 *   【你发送了一张图片：画面描述】
 *   （发送图片：画面描述）
 */
export function extractAssistantImageIntent(raw: string): AssistantImageIntent | null {
  const input = String(raw || '');
  if (!input.trim()) return null;

  const standard = /\[\[\s*SEND_IMAGE\s*[：:]\s*([\s\S]{1,2400}?)\s*\]\]/i.exec(input);
  if (standard) {
    const scene = normalizeScene(standard[1]);
    if (!scene) return null;
    return {
      scene,
      cleanedText: normalizeCleanedText(input.replace(standard[0], ' ')),
      source: 'send_image_tag',
    };
  }

  const legacy = /(?:\[|【|（|\()\s*(?:你\s*)?(?:发送了?|发了?|发来)\s*(?:一张|1\s*张|张)?\s*(?:照片|图片|自拍|相片)\s*[：:]\s*([\s\S]{1,2400}?)(?:\]|】|）|\))/u.exec(input);
  if (legacy) {
    const scene = normalizeScene(legacy[1]);
    if (!scene) return null;
    return {
      scene,
      cleanedText: normalizeCleanedText(input.replace(legacy[0], ' ')),
      source: 'legacy_photo_text',
    };
  }

  return null;
}

export function hasPendingAssistantImageIntent(message: {
  content?: string;
  metadata?: any;
}): { scene: string; source: AssistantImageIntentSource } | null {
  const meta = message?.metadata?.assistantImageIntent;
  if (meta?.status === 'pending' && typeof meta?.scene === 'string' && meta.scene.trim()) {
    return {
      scene: normalizeScene(meta.scene),
      source: meta.source === 'legacy_photo_text' ? 'legacy_photo_text' : 'send_image_tag',
    };
  }

  const parsed = extractAssistantImageIntent(String(message?.content || ''));
  return parsed ? { scene: parsed.scene, source: parsed.source } : null;
}
