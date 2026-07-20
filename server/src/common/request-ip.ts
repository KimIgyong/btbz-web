import { Request } from 'express';

// nginx 뒤에서 동작 — X-Forwarded-For의 첫 항목이 실제 클라이언트 IP
export function requestIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  const first = Array.isArray(xff) ? xff[0] : xff;
  if (first) return first.split(',')[0].trim().slice(0, 64);
  return (req.socket.remoteAddress ?? '').slice(0, 64);
}

export function requestUa(req: Request): string {
  return (req.headers['user-agent'] ?? '').slice(0, 400);
}

/**
 * 통계 목적 IP 익명화 (GDPR 최소화 — REQ-260720 Q-1)
 * IPv4: 마지막 옥텟 0 처리, IPv6: 앞 3그룹만 유지
 */
export function anonymizeIp(ip: string): string {
  if (!ip) return '';
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    return ip;
  }
  if (ip.includes(':')) {
    const groups = ip.split(':');
    return groups.slice(0, 3).join(':') + '::';
  }
  return ip;
}
