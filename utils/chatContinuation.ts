/** 续说只作用于这次请求，不伪造或持久化用户聊天记录。
 *
 * 当最后一位真实说话者是角色时，说明用户还没有回复。这里把「未回复事实 + 沉默时长」
 * 作为一次性系统式情境提示交给模型，而不是伪造一句“用户还想听”。
 * 角色可以按自己的人设继续上一件事、补一句、换话题、对沉默作出反应，或自然等待；
 * 禁止机械重复“怎么不回我”，也不能把几秒钟误写成很久。
 */
export function withChatContinuation<T extends { role: string; content: any; timestamp?: number }>(
    messages: T[],
    userName?: string,
): Array<T | { role: string; content: string }> {
    const lastSpeaker = [...messages].reverse().find(message => message.role === 'user' || message.role === 'assistant');
    if (lastSpeaker?.role !== 'assistant') return messages;

    const name = userName?.trim() || '对方';
    const assistantTail: T[] = [];
    for (let i = messages.length - 1; i >= 0; i -= 1) {
        const message = messages[i];
        if (message.role === 'assistant') assistantTail.unshift(message);
        else if (message.role === 'user') break;
    }
    const lastAt = [...assistantTail].reverse().find(message => typeof message.timestamp === 'number')?.timestamp;
    const silenceMs = typeof lastAt === 'number' ? Math.max(0, Date.now() - lastAt) : 0;
    const silenceText = silenceMs < 60_000
        ? '不到1分钟'
        : silenceMs < 60 * 60_000
            ? `约${Math.max(1, Math.floor(silenceMs / 60_000))}分钟`
            : silenceMs < 24 * 60 * 60_000
                ? `约${Math.max(1, Math.floor(silenceMs / (60 * 60_000)))}小时`
                : `约${Math.max(1, Math.floor(silenceMs / (24 * 60 * 60_000)))}天`;

    return [...messages, {
        role: 'user',
        content: `[情境提示：${name}在你上一轮连续发出的消息之后还没有发送新消息，距离你最后一条消息大约${silenceText}。现在是你再次主动开口，不是${name}回复了你。请完整记得你刚刚已经说过的内容，并按你自己的性格、关系状态、当前生活与这段沉默自然决定下一步：可以续上刚才的话、补充/改口、换个自己的话题、分享正在发生的事，或在确实符合人设和时长时对“没回消息”作出反应。不要固定说“你怎么不回我”，不要重复上一轮，不要虚构不符合实际的漫长等待。只输出你此刻真正会发出的内容。]`,
    }];
}
