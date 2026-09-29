import type {
  AtlasStudentInsight,
  AtlasStudyPlan,
  AtlasTopicInsight,
} from '@repo/shared';
import { buildAtlasStudyPlan } from './atlas-ai.planner';

const NOW = new Date('2026-09-13T10:00:00.000Z'); // Sunday, 13.00 in Istanbul.

function topic(overrides: Partial<AtlasTopicInsight> = {}): AtlasTopicInsight {
  return {
    key: 'math-fractions',
    subject: 'Matematik',
    topic: 'Kesirler',
    attempts: 20,
    correct: 8,
    wrong: 10,
    empty: 2,
    accuracy: 40,
    priority: 'focus',
    confidence: 'established',
    ...overrides,
  };
}

function student(
  overrides: Partial<AtlasStudentInsight> = {},
): AtlasStudentInsight {
  return {
    id: 'student-1',
    name: 'Deniz',
    classes: ['8/A'],
    metrics: {
      completedTests: 4,
      submittedAssignments: 1,
      averageScore: 50,
      previousAverageScore: 40,
      scoreChange: 10,
      correct: 8,
      wrong: 10,
      empty: 2,
    },
    topics: [topic()],
    schedule: [],
    upcomingAssignments: [],
    evidence: {
      analyzedTests: 4,
      analyzedQuestions: 20,
      limited: false,
      notes: [],
    },
    ...overrides,
  };
}

function minute(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function assertTimeConstraints(
  plan: AtlasStudyPlan,
  source: AtlasStudentInsight,
) {
  expect(plan.days).toHaveLength(7);
  for (const day of plan.days) {
    const weekday = new Date(`${day.date}T12:00:00Z`).getUTCDay() || 7;
    expect(
      day.blocks.reduce((sum, block) => sum + block.minutes, 0),
    ).toBeLessThanOrEqual(plan.dailyMinutes);
    for (const [index, block] of day.blocks.entries()) {
      const start = minute(block.startTime);
      const end = minute(block.endTime);
      expect(end - start).toBe(block.minutes);
      expect(start).toBeGreaterThanOrEqual(8 * 60);
      expect(end).toBeLessThanOrEqual(21 * 60 + 30);
      expect(block.minutes).toBeGreaterThan(0);
      if (index)
        expect(start).toBeGreaterThanOrEqual(
          minute(day.blocks[index - 1].endTime),
        );
      for (const lesson of source.schedule.filter(
        (slot) => slot.dayOfWeek === weekday,
      )) {
        expect(
          end <= minute(lesson.startTime) || start >= minute(lesson.endTime),
        ).toBe(true);
      }
      for (const period of source.busyPeriods || []) {
        const busyStart = new Date(period.start).getTime();
        const busyEnd = new Date(period.end).getTime();
        if (
          !Number.isFinite(busyStart) ||
          !Number.isFinite(busyEnd) ||
          busyStart >= busyEnd
        )
          continue;
        const blockStart = new Date(
          `${day.date}T${block.startTime}:00+03:00`,
        ).getTime();
        const blockEnd = new Date(
          `${day.date}T${block.endTime}:00+03:00`,
        ).getTime();
        expect(blockEnd <= busyStart || blockStart >= busyEnd).toBe(true);
      }
    }
    if (day.blocks.length) {
      expect(day.blocks[0].kind).not.toBe('break');
      expect(day.blocks.at(-1)?.kind).not.toBe('break');
    }
  }
}

describe('AtlasAI personalized study planner', () => {
  it('is deterministic, does not mutate insights, and explains observed priorities', () => {
    const source = student();
    const before = JSON.stringify(source);
    const first = buildAtlasStudyPlan(source, 60, 17, NOW);
    expect(buildAtlasStudyPlan(source, 60, 17, NOW)).toEqual(first);
    expect(JSON.stringify(source)).toBe(before);
    expect(first.days[0].blocks[0]).toMatchObject({
      subject: 'Matematik',
      topic: 'Kesirler',
      kind: 'learn',
      startTime: '17:00',
    });
    expect(first.days[0].blocks[0].reason).toContain('20 soruda');
    expect(first.days[0].blocks[0].reason).toContain('%40');
    expect(first.studentId).toBe(source.id);
    expect(first.timezone).toBe('Europe/Istanbul');
  });

  it.each([15, 30, 36, 37, 38, 39, 40, 60, 66, 90, 99, 180])(
    'keeps the %i-minute daily budget, including real breaks',
    (budget) => {
      const source = student();
      const plan = buildAtlasStudyPlan(source, budget, 17, NOW);
      assertTimeConstraints(plan, source);
      for (const day of plan.days) {
        expect(day.blocks.reduce((sum, block) => sum + block.minutes, 0)).toBe(
          budget,
        );
        if (budget >= 40)
          expect(
            day.blocks.some(
              (block) => block.kind === 'break' && block.minutes === 5,
            ),
          ).toBe(true);
      }
    },
  );

  it('spends more time on observed weakness than on an already strong topic', () => {
    const plan = buildAtlasStudyPlan(
      student({
        topics: [
          topic({
            key: 'strong',
            topic: 'Üslü sayılar',
            accuracy: 95,
            priority: 'strong',
          }),
          topic(),
        ],
      }),
      90,
      17,
      NOW,
    );
    expect(plan.days[0].blocks[0].topic).toBe('Kesirler');
    const blocks = plan.days.flatMap((day) => day.blocks);
    const total = (name: string) =>
      blocks
        .filter((block) => block.topic === name)
        .reduce((sum, block) => sum + block.minutes, 0);
    expect(total('Kesirler')).toBeGreaterThan(total('Üslü sayılar'));
    expect(
      new Set(
        blocks
          .filter((block) => block.topic === 'Kesirler')
          .map((block) => block.activity),
      ).size,
    ).toBeGreaterThan(2);
  });

  it('revisits a studied topic after 1, 3, and 6 days', () => {
    const plan = buildAtlasStudyPlan(student(), 60, 17, NOW);
    for (const offset of [1, 3, 6]) {
      const review = plan.days[offset].blocks.find(
        (block) => block.kind === 'review' && block.topic === 'Kesirler',
      );
      expect(review?.reason).toContain(`${offset}. gün aralıklı tekrarı`);
    }
  });

  it('changes the priority and plan identifier when newer evidence changes the weak topic', () => {
    const initial = student({
      topics: [
        topic(),
        topic({
          key: 'geometry',
          topic: 'Üçgenler',
          accuracy: 90,
          priority: 'strong',
        }),
      ],
    });
    const updated = student({
      topics: [
        topic({ accuracy: 95, priority: 'strong' }),
        topic({
          key: 'geometry',
          topic: 'Üçgenler',
          accuracy: 20,
          priority: 'focus',
        }),
      ],
    });
    const original = buildAtlasStudyPlan(initial, 60, 17, NOW);
    const revised = buildAtlasStudyPlan(updated, 60, 17, NOW);
    expect(original.days[0].blocks[0].topic).toBe('Kesirler');
    expect(revised.days[0].blocks[0].topic).toBe('Üçgenler');
    expect(revised.id).not.toBe(original.id);
  });

  it('does not invent a weakness from zero attempts and discloses limited evidence', () => {
    const source = student({
      topics: [topic({ attempts: 0, accuracy: 0, topic: 'Ölçülmemiş konu' })],
      evidence: {
        analyzedTests: 0,
        analyzedQuestions: 0,
        limited: true,
        notes: ['Henüz test tamamlanmadı.'],
      },
    });
    const plan = buildAtlasStudyPlan(source, 60, 17, NOW);
    expect(plan.summary).toContain('İlk ölçümü');
    expect(plan.notes.join(' ')).toContain('Eksik konu tespiti yapılmadı');
    expect(plan.notes).toContain('Henüz test tamamlanmadı.');
    const work = plan.days
      .flatMap((day) => day.blocks)
      .filter((block) => block.kind !== 'break');
    expect(work.every((block) => block.topic !== 'Ölçülmemiş konu')).toBe(true);
    expect(work[0].topic).toBe('Başlangıç değerlendirmesi');
  });

  it('qualifies a low score measured by only a few questions', () => {
    const plan = buildAtlasStudyPlan(
      student({
        topics: [topic({ attempts: 2, accuracy: 0, confidence: 'limited' })],
      }),
      60,
      17,
      NOW,
    );
    expect(plan.notes.join(' ')).toContain('kesin bir yargı değildir');
    expect(plan.days[0].blocks[0].reason).toContain('Soru sayısı az');
  });

  it('uses anonymous timetable entries only as busy intervals, never as learning subjects', () => {
    const source = student({
      topics: [],
      schedule: [
        {
          subject: 'Diğer ders (meşgul)',
          dayOfWeek: 7,
          startTime: '17:00',
          endTime: '18:00',
        },
      ],
    });
    const plan = buildAtlasStudyPlan(source, 60, 17, NOW);
    assertTimeConstraints(plan, source);
    expect(plan.days[0].blocks[0].startTime).toBe('18:00');
    const work = plan.days
      .flatMap((day) => day.blocks)
      .filter((block) => block.kind !== 'break');
    expect(work.every((block) => block.subject === 'Genel çalışma')).toBe(true);
  });

  it('merges nested and overlapping classes and places all work after them', () => {
    const source = student({
      schedule: [
        {
          subject: 'Matematik',
          dayOfWeek: 7,
          startTime: '17:00',
          endTime: '18:00',
        },
        { subject: 'Fen', dayOfWeek: 7, startTime: '17:30', endTime: '19:00' },
        {
          subject: 'Türkçe',
          dayOfWeek: 7,
          startTime: '18:45',
          endTime: '19:15',
        },
      ],
    });
    const plan = buildAtlasStudyPlan(source, 60, 17, NOW);
    assertTimeConstraints(plan, source);
    expect(plan.days[0].blocks[0].startTime).toBe('19:15');
    expect(plan.days[1].blocks[0].startTime).toBe('17:00');
  });

  it('respects date-specific live appointments on two days without repeating them through the week', () => {
    const source = student({
      topics: [],
      busyPeriods: [
        { start: '2026-09-13T14:00:00Z', end: '2026-09-13T15:00:00Z' },
        { start: '2026-09-14T14:30:00Z', end: '2026-09-14T15:45:00Z' },
      ],
    });
    const plan = buildAtlasStudyPlan(source, 60, 17, NOW);
    assertTimeConstraints(plan, source);
    expect(plan.days[0].blocks[0].startTime).toBe('18:00');
    expect(
      plan.days[1].blocks.map((block) => [block.startTime, block.endTime]),
    ).toEqual([
      ['17:00', '17:30'],
      ['18:45', '19:15'],
    ]);
    expect(plan.days[2].blocks[0].startTime).toBe('17:00');
    expect(
      plan.days
        .flatMap((day) => day.blocks)
        .filter((block) => block.kind !== 'break')
        .every((block) => block.subject === 'Genel çalışma'),
    ).toBe(true);
  });

  it('clips overnight and multi-day appointments to every affected Istanbul day', () => {
    const overnight = buildAtlasStudyPlan(
      student({
        busyPeriods: [
          { start: '2026-09-13T20:00:00Z', end: '2026-09-14T06:15:00Z' },
        ],
      }),
      60,
      8,
      NOW,
    );
    expect(overnight.days[1].blocks[0].startTime).toBe('09:15');
    expect(overnight.days[2].blocks[0].startTime).toBe('08:00');
    const multiDay = buildAtlasStudyPlan(
      student({
        busyPeriods: [
          { start: '2026-09-13T14:00:00Z', end: '2026-09-15T15:00:00Z' },
        ],
      }),
      60,
      17,
      NOW,
    );
    expect(multiDay.days[0].blocks).toEqual([]);
    expect(multiDay.days[1].blocks).toEqual([]);
    expect(multiDay.days[2].blocks[0].startTime).toBe('18:00');
    expect(multiDay.days[3].blocks[0].startTime).toBe('17:00');
  });

  it('merges live appointments with regular classes and rounds busy end times outward', () => {
    const source = student({
      schedule: [
        { subject: 'Fen', dayOfWeek: 7, startTime: '17:00', endTime: '18:00' },
      ],
      busyPeriods: [
        { start: '2026-09-13T14:30:00Z', end: '2026-09-13T16:15:01Z' },
      ],
    });
    const plan = buildAtlasStudyPlan(source, 60, 17, NOW);
    assertTimeConstraints(plan, source);
    expect(plan.days[0].blocks[0].startTime).toBe('19:16');
  });

  it('ignores invalid, empty, and reversed appointment intervals', () => {
    const plan = buildAtlasStudyPlan(
      student({
        busyPeriods: [
          { start: 'invalid', end: '2026-09-13T15:00:00Z' },
          { start: '2026-09-13T14:00:00Z', end: 'invalid' },
          { start: '2026-09-13T14:00:00Z', end: '2026-09-13T14:00:00Z' },
          { start: '2026-09-13T15:00:00Z', end: '2026-09-13T14:00:00Z' },
        ],
      }),
      60,
      17,
      NOW,
    );
    expect(plan.days[0].blocks[0].startTime).toBe('17:00');
  });

  it('uses separate free windows without exceeding budget or leaving a trailing break', () => {
    const source = student({
      schedule: [
        {
          subject: 'Matematik',
          dayOfWeek: 7,
          startTime: '17:12',
          endTime: '17:45',
        },
        { subject: 'Fen', dayOfWeek: 7, startTime: '18:02', endTime: '21:21' },
      ],
    });
    const plan = buildAtlasStudyPlan(source, 60, 17, NOW);
    assertTimeConstraints(plan, source);
    expect(
      plan.days[0].blocks.map((block) => [block.startTime, block.endTime]),
    ).toEqual([
      ['17:00', '17:12'],
      ['17:45', '18:02'],
    ]);
    expect(plan.notes.join(' ')).toContain('29 dakika yerleştirildi');
  });

  it('returns transparent empty days when the entire available week is booked', () => {
    const source = student({
      schedule: Array.from({ length: 7 }, (_, day) => ({
        subject: 'Ders',
        dayOfWeek: day + 1,
        startTime: '08:00',
        endTime: '22:00',
      })),
    });
    const plan = buildAtlasStudyPlan(source, 60, 17, NOW);
    assertTimeConstraints(plan, source);
    expect(plan.days.every((day) => day.blocks.length === 0)).toBe(true);
    expect(
      plan.notes.filter((note) =>
        note.includes('uygun çalışma boşluğu bulunamadı'),
      ),
    ).toHaveLength(7);
  });

  it('uses a short free window completely while reserving a meaningful session after the break', () => {
    const source = student({
      schedule: [
        { subject: 'Ders', dayOfWeek: 7, startTime: '17:38', endTime: '21:30' },
      ],
    });
    const plan = buildAtlasStudyPlan(source, 60, 17, NOW);
    assertTimeConstraints(plan, source);
    expect(plan.days[0].blocks.map((block) => block.minutes)).toEqual([
      23, 5, 10,
    ]);
    expect(plan.notes.join(' ')).toContain('38 dakika yerleştirildi');
  });

  it.each([
    ['2026-09-13T21:02:00Z', '2026-09-14', '2026-09-20'],
    ['2026-12-31T21:02:00Z', '2027-01-01', '2027-01-07'],
  ])(
    'uses Istanbul calendar days across UTC and year boundaries (%s)',
    (iso, first, last) => {
      const plan = buildAtlasStudyPlan(student(), 60, 17, new Date(iso));
      expect(plan.days[0].date).toBe(first);
      expect(plan.days[6].date).toBe(last);
      expect(plan.days[0].blocks[0].startTime).toBe('17:00');
    },
  );

  it('rounds the current time forward and shortens today before the evening limit', () => {
    const plan = buildAtlasStudyPlan(
      student(),
      60,
      17,
      new Date('2026-09-13T18:18:01Z'),
    );
    expect(plan.days[0].blocks).toHaveLength(1);
    expect(plan.days[0].blocks[0]).toMatchObject({
      startTime: '21:20',
      endTime: '21:30',
      minutes: 10,
    });
    expect(plan.notes.join(' ')).toContain('10 dakika yerleştirildi');
    expect(plan.days[1].blocks[0].startTime).toBe('17:00');
  });

  it('does not invent an available slot after 21:30', () => {
    const plan = buildAtlasStudyPlan(
      student(),
      60,
      17,
      new Date('2026-09-13T18:31:00Z'),
    );
    expect(plan.days[0].blocks).toEqual([]);
    expect(plan.days[1].blocks.length).toBeGreaterThan(0);
  });

  it('plans pending homework near its Turkish due date and excludes submitted or distant work', () => {
    const source = student({
      upcomingAssignments: [
        {
          title: 'Kesir çalışma kâğıdı',
          subject: 'Matematik',
          dueDate: '2026-09-15',
          submitted: false,
        },
        {
          title: 'Gece tarihli ödev',
          subject: 'Fen',
          dueDate: '2026-09-16T21:30:00Z',
          submitted: false,
        },
        {
          title: 'Tamamlandı',
          subject: 'Türkçe',
          dueDate: '2026-09-13',
          submitted: true,
        },
        {
          title: 'Gelecek ay',
          subject: 'Fen',
          dueDate: '2026-10-20',
          submitted: false,
        },
      ],
    });
    const plan = buildAtlasStudyPlan(source, 60, 17, NOW);
    expect(plan.days[1].blocks[0]).toMatchObject({
      topic: 'Kesir çalışma kâğıdı',
      kind: 'homework',
    });
    expect(plan.days[3].blocks[0]).toMatchObject({
      topic: 'Gece tarihli ödev',
      kind: 'homework',
    });
    expect(plan.days[3].blocks[0].reason).toContain('2026-09-17');
    expect(
      plan.days
        .flatMap((day) => day.blocks)
        .filter((block) => block.kind === 'homework'),
    ).toHaveLength(2);
  });

  it('does not describe an evening session as before a morning deadline', () => {
    const plan = buildAtlasStudyPlan(
      student({
        upcomingAssignments: [
          {
            title: 'Bugünkü ödev',
            subject: 'Fen',
            dueDate: '2026-09-13T13:00:00Z',
            submitted: false,
          },
        ],
      }),
      60,
      17,
      NOW,
    );
    expect(plan.days[0].blocks[0].reason).toContain('teslim saatini aşıyor');
  });

  it('reports homework and reviews that cannot fit around a fully booked day', () => {
    const source = student({
      schedule: Array.from({ length: 7 }, (_, day) => ({
        subject: 'Ders',
        dayOfWeek: day + 1,
        startTime: '08:00',
        endTime: '22:00',
      })),
      upcomingAssignments: [
        {
          title: 'Proje',
          subject: 'Fen',
          dueDate: '2026-09-14',
          submitted: false,
        },
      ],
    });
    const plan = buildAtlasStudyPlan(source, 60, 17, NOW);
    expect(plan.notes.join(' ')).toContain(
      '“Proje” ödevi için uygun süre kalmadı',
    );
  });

  it('handles malformed optional dates and times without crashing or hiding the limitation', () => {
    const plan = buildAtlasStudyPlan(
      student({
        schedule: [
          {
            subject: 'Fen',
            dayOfWeek: 7,
            startTime: 'not a time',
            endTime: '18:00',
          },
        ],
        upcomingAssignments: [
          {
            title: 'Proje',
            subject: 'Fen',
            dueDate: '2026-02-31',
            submitted: false,
          },
        ],
      }),
      60,
      17,
      NOW,
    );
    expect(plan.notes.join(' ')).toContain('Bazı ders saatleri okunamadı');
    expect(plan.notes.join(' ')).toContain('teslim tarihi okunamadı');
    expect(() =>
      buildAtlasStudyPlan(student(), 60, 17, new Date('invalid')),
    ).toThrow(RangeError);
  });
});
