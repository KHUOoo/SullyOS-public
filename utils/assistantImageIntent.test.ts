import { describe, expect, it } from 'vitest';
import { extractAssistantImageIntent, hasPendingAssistantImageIntent } from './assistantImageIntent';

describe('assistantImageIntent', () => {
  it('parses the canonical SEND_IMAGE directive and keeps only short chat text', () => {
    const parsed = extractAssistantImageIntent(
      '好吧。\n[[SEND_IMAGE: 夜晚宿舍里半躺在床上的随手自拍，暖黄灯光。]]\n现在开心了。',
    );
    expect(parsed).toEqual({
      scene: '夜晚宿舍里半躺在床上的随手自拍，暖黄灯光。',
      cleanedText: '好吧。\n现在开心了。',
      source: 'send_image_tag',
    });
  });

  it('parses legacy fake photo text from model output', () => {
    const parsed = extractAssistantImageIntent(
      '好吧。[你发送了一张照片：随意半躺在宿舍的四柱床上，手里捏着翻了一半的书，灯光昏暗偏暖。]',
    );
    expect(parsed?.scene).toContain('随意半躺在宿舍的四柱床上');
    expect(parsed?.cleanedText).toBe('好吧。');
    expect(parsed?.source).toBe('legacy_photo_text');
  });

  it('does not treat ordinary discussion about photos as an image intent', () => {
    expect(extractAssistantImageIntent('你刚才那张照片挺好看的。')).toBeNull();
  });

  it('reads a pending persisted image intent from metadata', () => {
    expect(hasPendingAssistantImageIntent({
      content: '给你。',
      metadata: {
        assistantImageIntent: {
          scene: '窗边自拍',
          source: 'send_image_tag',
          status: 'pending',
        },
      },
    })).toEqual({ scene: '窗边自拍', source: 'send_image_tag' });
  });
});
