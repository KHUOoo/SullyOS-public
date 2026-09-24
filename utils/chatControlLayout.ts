import type { ChatControlKey, ChatControlLayout, ChatControlSlot } from '../types';

export const CHAT_CONTROL_KEYS: ChatControlKey[] = [
  'headerAvatar','headerName','onlineStatus','modelSwitcher','activityStatus','tokenUsage','backButton','triggerButton',
  'actionsButton','voiceButton','emojiButton','sendButton',
];

export function resolveChatControlLayout(global?:ChatControlLayout, local?:ChatControlLayout):ChatControlLayout {
  const result:ChatControlLayout={enabled:local?.enabled ?? global?.enabled ?? false};
  for(const key of CHAT_CONTROL_KEYS){
    const base=global?.[key];
    const own=local?.[key];
    if(base||own) result[key]={...(base||{}),...(own||{})};
  }
  return result;
}

export function normalizeChatControlSlot(slot?:ChatControlSlot):Required<Pick<ChatControlSlot,'x'|'y'|'scale'|'opacity'|'hidden'|'locked'>> & ChatControlSlot {
  return {
    ...slot,
    x:Number.isFinite(slot?.x)?Number(slot!.x):0,
    y:Number.isFinite(slot?.y)?Number(slot!.y):0,
    scale:Number.isFinite(slot?.scale)?Math.min(3,Math.max(.45,Number(slot!.scale))):1,
    opacity:Number.isFinite(slot?.opacity)?Math.min(1,Math.max(0,Number(slot!.opacity))):1,
    hidden:slot?.hidden===true,
    locked:slot?.locked===true,
  };
}
