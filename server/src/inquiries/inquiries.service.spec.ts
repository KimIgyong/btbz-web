import { TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from '../entities';
import { MailService } from '../mail/mail.service';
import { createTestModule } from '../test-utils';
import { InquiriesService } from './inquiries.service';

describe('InquiriesService', () => {
  let moduleRef: TestingModule;
  let service: InquiriesService;
  let repo: Repository<Inquiry>;
  const mail = { sendInquiry: jest.fn() };

  beforeEach(async () => {
    mail.sendInquiry.mockReset();
    moduleRef = await createTestModule({
      providers: [InquiriesService, { provide: MailService, useValue: mail }],
    });
    service = moduleRef.get(InquiriesService);
    repo = moduleRef.get(getRepositoryToken(Inquiry));
  });

  afterEach(() => moduleRef.close());

  it('저장 + 메일 성공 시 mailSent=true', async () => {
    mail.sendInquiry.mockResolvedValue(true);
    const inquiry = await service.create('제목', '내용', 'user@example.com', '1.2.3.4');
    expect(inquiry.mailSent).toBe(true);
    expect(mail.sendInquiry).toHaveBeenCalledWith('제목', '내용', 'user@example.com');
  });

  it('메일 실패해도 저장은 유지되고 mailSent=false (FR-3)', async () => {
    mail.sendInquiry.mockResolvedValue(false);
    await service.create('제목', '내용', 'user@example.com', '1.2.3.4');
    const saved = await repo.find();
    expect(saved).toHaveLength(1);
    expect(saved[0].mailSent).toBe(false);
    expect(saved[0].status).toBe('new');
  });

  it('상태 변경(new→handled)', async () => {
    mail.sendInquiry.mockResolvedValue(true);
    const inquiry = await service.create('제목', '내용', 'user@example.com', '');
    await service.setStatus(inquiry.id, 'handled');
    expect((await service.get(inquiry.id)).status).toBe('handled');
  });
});
