const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const appendEscapedText = (text: string): string => {
  return escapeHtml(text).replace(/\n/g, '<br />');
};

const normalizeUrl = (rawUrl: string): string | null => {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch (e) {
    return null;
  }

  return null;
};

export const formatMessageWithLinks = (message: string): string => {
  if (!message) return '';

  const urlRegex = /(https?:\/\/[\w\-._~:/?#\[\]@!$&'()*+,;=%]+)/gi;
  let result = '';
  let lastIndex = 0;

  message.replace(urlRegex, (match, _group, offset) => {
    result += appendEscapedText(message.slice(lastIndex, offset));

    const safeUrl = normalizeUrl(match);
    if (safeUrl) {
      const displayText = escapeHtml(match);
      result += `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">${displayText}</a>`;
    } else {
      result += appendEscapedText(match);
    }

    lastIndex = offset + match.length;
    return match;
  });

  result += appendEscapedText(message.slice(lastIndex));

  return result;
};

export const wrapSenderPrefix = (sender: string, messageHtml: string): string => {
  const safeSender = escapeHtml(sender);
  return `<b>${safeSender}</b>: ${messageHtml}`;
};

export { escapeHtml };