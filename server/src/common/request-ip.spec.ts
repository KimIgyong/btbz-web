import { anonymizeIp } from './request-ip';

describe('anonymizeIp', () => {
  it('IPv4는 마지막 옥텟을 0으로 바꾼다', () => {
    expect(anonymizeIp('125.133.49.165')).toBe('125.133.49.0');
    expect(anonymizeIp('10.0.0.1')).toBe('10.0.0.0');
  });

  it('IPv6는 앞 3그룹만 유지한다', () => {
    expect(anonymizeIp('2001:db8:85a3:8d3:1319:8a2e:370:7348')).toBe('2001:db8:85a3::');
  });

  it('빈값·형식 밖 입력은 그대로 반환한다', () => {
    expect(anonymizeIp('')).toBe('');
    expect(anonymizeIp('unknown')).toBe('unknown');
  });
});
