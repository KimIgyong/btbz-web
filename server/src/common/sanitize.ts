import sanitizeHtml from 'sanitize-html';

/**
 * Q&A 본문 리치텍스트 새니타이즈 — 허용된 서식 태그만 남기고 스크립트/이벤트/스타일 제거(XSS 차단).
 * 인라인 이미지는 허용하지 않음(이미지는 첨부로 처리). 링크는 강제로 새 탭 + noopener/nofollow.
 */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html ?? '', {
    allowedTags: [
      'b', 'strong', 'i', 'em', 'u', 's', 'p', 'br',
      'ul', 'ol', 'li', 'blockquote', 'a', 'h3', 'h4',
      'span', 'div', 'code', 'pre',
    ],
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName: 'a',
        attribs: { href: attribs.href || '#', target: '_blank', rel: 'noopener nofollow' },
      }),
    },
    disallowedTagsMode: 'discard',
  }).trim();
}

/** 새니타이즈 후 텍스트만 추출해 실제 내용이 비어있는지 검사(공백/빈 태그 방지) */
export function isEmptyRichText(sanitized: string): boolean {
  return sanitizeHtml(sanitized, { allowedTags: [], allowedAttributes: {} }).replace(/\s|&nbsp;/g, '') === '';
}
