import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { AiController } from './ai.controller';

const query = (value: any) => ({ lean: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(value) });
const studentId = '507f1f77bcf86cd799439011';
const fixtureScope = () => ({ schoolYear: '2026-2027', studentId, grades: [{ id: 'class-1', level: 8, label: 'A' }], topics: [{ id: 'topic-1', name: 'Üslü ifadeler', subject: 'Matematik', gradeId: 'class-1', outcomes: [{ id: 'entry:0', code: 'TEST.1', text: 'Üslü ifadeleri hesaplar.' }] }], outcomes: [{ id: 'entry:0', code: 'TEST.1', text: 'Üslü ifadeleri hesaplar.' }] });
const question = { questionText: '2³ kaçtır?', options: [{ letter: 'A', text: '2' }, { letter: 'B', text: '4' }, { letter: 'C', text: '8' }, { letter: 'D', text: '16' }], correctLetter: 'C', explanation: '2 × 2 × 2 = 8' };

describe('Legacy AI helpers share curriculum enforcement', () => {
  let ai: any, curriculum: any, challenges: any, progress: any, service: GamificationService;
  beforeEach(() => {
    ai = { chatStructured: jest.fn().mockResolvedValue(question) };
    curriculum = { requireScope: jest.fn().mockResolvedValue(fixtureScope()), requireEducatorScope: jest.fn().mockResolvedValue(fixtureScope()), isCurrent: jest.fn().mockResolvedValue(true), assertRequest: jest.fn().mockResolvedValue({ allowed: true, matchedOutcomeIds: ['entry:0'] }), verifyContent: jest.fn().mockResolvedValue(true) };
    challenges = { findOne: jest.fn(() => query(null)), create: jest.fn(async body => ({ toObject: () => ({ _id: 'q1', ...body }) })) };
    progress = { findOne: jest.fn(() => ({ exec: jest.fn().mockResolvedValue({ challengeLog: [] }) })) };
    service = new GamificationService(progress, challenges, {} as any, {} as any, {} as any, ai, curriculum);
  });
  it('does not generate or serve a static question when curriculum approval is absent', async () => {
    curriculum.requireScope.mockRejectedValue(new BadRequestException('Onay yok'));
    expect(await service.getDailyChallenge(studentId)).toEqual(expect.objectContaining({ available: false, options: [] }));
    expect(ai.chatStructured).not.toHaveBeenCalled();
    expect(challenges.findOne).not.toHaveBeenCalled();
  });
  it('does not persist unchecked generated content or silently fall back', async () => {
    curriculum.verifyContent.mockResolvedValue(false);
    expect(await service.getDailyChallenge(studentId)).toEqual(expect.objectContaining({ available: false }));
    expect(challenges.create).not.toHaveBeenCalled();
  });
  it('separates same-grade questions by exact approved class and outcomes and withholds answers', async () => {
    const first = await service.getDailyChallenge(studentId);
    expect(first).toEqual(expect.objectContaining({ available: true, questionText: '2³ kaçtır?' }));
    expect(first).not.toHaveProperty('correctLetter');
    const firstFilter = challenges.findOne.mock.calls[0][0];
    const nextScope = fixtureScope(); nextScope.topics[0].gradeId = 'class-2';
    curriculum.requireScope.mockResolvedValue(nextScope);
    await service.getDailyChallenge(studentId);
    const secondFilter = challenges.findOne.mock.calls[1][0];
    expect(firstFilter.gradeLevel).toBe(secondFilter.gradeLevel);
    expect(firstFilter.dateKey).not.toBe(secondFilter.dateKey);
    expect(firstFilter.curriculumHash).not.toBe(secondFilter.curriculumHash);
  });
  it('rejects cached unverified questions and revoked approvals before grading or awarding XP', async () => {
    challenges.findOne.mockImplementation(() => query({ ...question, subject: 'Matematik', curriculumHash: 'old', outcomeIds: ['old'] }));
    await expect(service.getDailyChallenge(studentId)).rejects.toBeInstanceOf(ServiceUnavailableException);
    curriculum.requireScope.mockRejectedValue(new BadRequestException('Onay kaldırıldı'));
    challenges.findOne.mockClear();
    await expect(service.answerDailyChallenge(studentId, 'C')).rejects.toThrow('Onay kaldırıldı');
    expect(challenges.findOne).not.toHaveBeenCalled();
    expect(progress.findOne).not.toHaveBeenCalled();
  });
  it('blocks quiz generation before provider invocation on a scope refusal', async () => {
    const controller = new AiController(ai, curriculum);
    curriculum.assertRequest.mockResolvedValue({ allowed: false, reason: 'Müfredat dışında' });
    await expect(controller.generateQuiz({ user: { userId: studentId } }, { topic: 'Üniversite integrali', count: 1 })).rejects.toThrow('Müfredat dışında');
    expect(ai.chatStructured).not.toHaveBeenCalled();
  });
  it('withholds quiz output if the response shape or independent curriculum review fails', async () => {
    const controller = new AiController(ai, curriculum);
    ai.chatStructured.mockResolvedValue({ title: 'Test', questions: [question] });
    curriculum.verifyContent.mockResolvedValue(false);
    await expect(controller.generateQuiz({ user: { userId: studentId } }, { topic: 'Üslü ifadeler', count: 1 })).rejects.toBeInstanceOf(ServiceUnavailableException);
    curriculum.verifyContent.mockResolvedValue(true);
    ai.chatStructured.mockResolvedValue({ title: 'Test', questions: [{ ...question, options: [question.options[0], question.options[0], question.options[0], question.options[0]] }] });
    await expect(controller.generateQuiz({ user: { userId: studentId } }, { topic: 'Üslü ifadeler', count: 1 })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('coach and study-plan endpoints cannot bypass missing curriculum approval', async () => {
    curriculum.requireScope.mockRejectedValue(new BadRequestException('Onay yok'));
    await expect(service.getCoachTip(studentId)).rejects.toThrow('Onay yok');
    await expect(service.getStudyPlan(studentId)).rejects.toThrow('Onay yok');
    expect(ai.chatStructured).not.toHaveBeenCalled();
  });
});
