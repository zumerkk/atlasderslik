import { createHash } from 'node:crypto';
import type {
  AtlasPlanBlock,
  AtlasScheduleSlot,
  AtlasStudentInsight,
  AtlasStudyPlan,
  AtlasTopicInsight,
} from '@repo/shared';

const TIMEZONE = 'Europe/Istanbul' as const;
const DAY_END = 21 * 60 + 30;
const MIN_SESSION = 10;
const REVIEW_OFFSETS = [1, 3, 6];
const localFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
const dayFormatter = new Intl.DateTimeFormat('tr-TR', {
  timeZone: TIMEZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

type Window = { start: number; end: number };
type TimedSlot = Window & { isBreak: boolean };
type Task = Pick<
  AtlasPlanBlock,
  'subject' | 'topic' | 'activity' | 'kind' | 'reason'
>;
type TopicState = {
  topic: AtlasTopicInsight;
  firstDay?: number;
  lastDay?: number;
  sessions: number;
  reviews: Set<number>;
};

function localParts(date: Date) {
  const parts = Object.fromEntries(
    localFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minute:
      Number(parts.hour) * 60 +
      Number(parts.minute) +
      Number(parts.second) / 60 +
      date.getUTCMilliseconds() / 60000,
  };
}

function calendarDay(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

function addDays(date: string, count: number): string {
  const shifted = calendarDay(date);
  shifted.setUTCDate(shifted.getUTCDate() + count);
  return shifted.toISOString().slice(0, 10);
}

function parseTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? hour * 60 + minute : null;
}

function formatTime(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

function freeWindows(
  date: string,
  start: number,
  schedule: AtlasScheduleSlot[],
  busyPeriods: AtlasStudentInsight['busyPeriods'] = [],
): Window[] {
  if (start >= DAY_END) return [];
  const weekday = calendarDay(date).getUTCDay() || 7;
  const previousWeekday = weekday === 1 ? 7 : weekday - 1;
  const busy: Window[] = [];
  for (const period of busyPeriods) {
    const periodStart = new Date(period.start);
    const periodEnd = new Date(period.end);
    if (
      !Number.isFinite(periodStart.getTime()) ||
      !Number.isFinite(periodEnd.getTime()) ||
      periodStart >= periodEnd
    )
      continue;
    const localStart = localParts(periodStart);
    const localEnd = localParts(periodEnd);
    if (localStart.date > date || localEnd.date < date) continue;
    // Clip appointments to each local day, including overnight/multi-day spans.
    // Round outward so an appointment ending partway through a minute is respected.
    busy.push({
      start: localStart.date === date ? Math.floor(localStart.minute) : 0,
      end: localEnd.date === date ? Math.ceil(localEnd.minute) : 24 * 60,
    });
  }
  for (const lesson of schedule) {
    const lessonStart = parseTime(lesson.startTime);
    const lessonEnd = parseTime(lesson.endTime);
    if (lessonStart === null || lessonEnd === null) continue;
    if (lesson.dayOfWeek === weekday) {
      busy.push({
        start: lessonStart,
        end: lessonEnd <= lessonStart ? 24 * 60 : lessonEnd,
      });
    }
    // An overnight lesson also occupies the beginning of the next day.
    if (lesson.dayOfWeek === previousWeekday && lessonEnd <= lessonStart) {
      busy.push({ start: 0, end: lessonEnd });
    }
  }
  busy.sort((a, b) => a.start - b.start || a.end - b.end);
  let cursor = start;
  const available: Window[] = [];
  for (const interval of busy) {
    if (interval.end <= cursor) continue;
    if (interval.start >= DAY_END) break;
    if (interval.start > cursor) {
      available.push({ start: cursor, end: Math.min(interval.start, DAY_END) });
    }
    cursor = Math.max(cursor, interval.end);
    if (cursor >= DAY_END) break;
  }
  if (cursor < DAY_END) available.push({ start: cursor, end: DAY_END });
  return available.filter((window) => window.end - window.start >= MIN_SESSION);
}

/** Allocate time first, so educational recommendations cannot create conflicts. */
function allocateSlots(windows: Window[], budget: number): TimedSlot[] {
  const slots: TimedSlot[] = [];
  let remaining = budget;
  let previousEnd: number | undefined;
  for (const window of windows) {
    let cursor = window.start;
    while (window.end - cursor >= MIN_SESSION && remaining >= MIN_SESSION) {
      if (previousEnd !== undefined && cursor - previousEnd < 5) {
        // Only add a break when a real study session can follow it.
        if (
          window.end - cursor < 5 + MIN_SESSION ||
          remaining < 5 + MIN_SESSION
        )
          break;
        slots.push({ start: cursor, end: cursor + 5, isBreak: true });
        cursor += 5;
        remaining -= 5;
      }
      const usable = Math.min(window.end - cursor, remaining);
      // Reserve a full break and session when splitting even a short free window.
      const minutes = usable <= 35 ? usable : Math.min(25, usable - 15);
      slots.push({ start: cursor, end: cursor + minutes, isBreak: false });
      cursor += minutes;
      remaining -= minutes;
      previousEnd = cursor;
    }
    if (remaining < MIN_SESSION) break;
  }
  return slots;
}

function observedReason(topic: AtlasTopicInsight): string {
  const accuracy = Math.round(Math.max(0, Math.min(100, topic.accuracy)));
  return `Kayıtlı ${topic.attempts} soruda doğru oranı %${accuracy}.${
    topic.confidence === 'limited'
      ? ' Soru sayısı az; bu öncelik yeni sonuçlarla yeniden değerlendirilmeli.'
      : ''
  }`;
}

function topicTask(
  state: TopicState,
  day: number,
  reviewOffset?: number,
): Task {
  const { topic } = state;
  const firstSession = state.firstDay === undefined;
  if (reviewOffset !== undefined) {
    state.reviews.add(reviewOffset);
    return {
      subject: topic.subject,
      topic: topic.topic,
      kind: 'review',
      activity:
        'Notlara bakmadan ana fikri anlat, 3–5 kısa soruyla kontrol et ve yanlışını düzelt.',
      reason: `${reviewOffset}. gün aralıklı tekrarı${
        day > state.firstDay! + reviewOffset
          ? ' (uygun ilk boşluğa taşındı)'
          : ''
      }: önceki çalışmayı hatırlayarak pekiştir. ${observedReason(topic)}`,
    };
  }
  state.firstDay ??= day;
  state.lastDay = day;
  state.sessions++;
  return {
    subject: topic.subject,
    topic: topic.topic,
    kind: firstSession && topic.priority === 'focus' ? 'learn' : 'practice',
    activity:
      firstSession && topic.priority === 'focus'
        ? 'Kısa konu anlatımını çalış, bir örneği adım adım incele ve kendi cümlenle özetle.'
        : [
            '5–8 soruyu adım adım çöz; yanlışlarını bilgi, işlem ve dikkat olarak ayır.',
            'Önceki yanlışlarından 3 soruyu yeniden çöz; ardından benzer 3 soruyla kontrol et.',
            'Kısa bir soru seti çöz; çözümlerini açıklayıp emin olmadığın adımları işaretle.',
          ][(day + state.sessions) % 3],
    reason: `${
      topic.priority === 'focus'
        ? 'Gözlenen konu sonuçlarına göre öncelikli çalışma.'
        : topic.priority === 'practice'
          ? 'Gözlenen sonuçları düzenli pratikle pekiştirme.'
          : 'Güçlü görünen konuyu korumak için kısa pratik.'
    } ${observedReason(topic)}`,
  };
}

function chooseTopic(
  states: TopicState[],
  day: number,
  usedToday: Set<string>,
): TopicState {
  const needPractice = states.filter(
    (state) => state.topic.priority !== 'strong',
  );
  // Keep most sessions on measured needs, with occasional maintenance practice.
  const pool =
    needPractice.length && !(day % 3 === 2 && usedToday.size > 0)
      ? needPractice
      : states;
  return [...pool].sort((a, b) => {
    const score = (state: TopicState) =>
      100 -
      state.topic.accuracy +
      (state.topic.priority === 'focus' ? 25 : 0) -
      state.sessions * 12 -
      (usedToday.has(state.topic.key) ? 70 : 0) -
      (state.lastDay === day - 1 ? 10 : 0);
    return score(b) - score(a) || a.topic.key.localeCompare(b.topic.key, 'tr');
  })[0];
}

function neutralTask(day: number, index: number, subjects: string[]): Task {
  return {
    subject:
      subjects[(day + index) % Math.max(1, subjects.length)] || 'Genel çalışma',
    topic: day === 0 ? 'Başlangıç değerlendirmesi' : 'Konu taraması ve tekrar',
    kind: day === 0 ? 'practice' : day % 2 === 0 ? 'review' : 'practice',
    activity:
      day === 0
        ? 'Son işlediğin konudan 5 kısa soru çöz; zorlandığın adımları not ederek ilk ölçümü oluştur.'
        : 'Son ders notlarını hatırlayarak özetle, 5 kısa soru çöz ve anlamadığın noktaları öğretmeninle paylaş.',
    reason:
      'Konu bazında yeterli ölçüm bulunmadığı için eksik konu varsaymadan başlangıç çalışması önerildi.',
  };
}

/** A deterministic, evidence-based proposal. It does not write to the timetable. */
export function buildAtlasStudyPlan(
  student: AtlasStudentInsight,
  dailyMinutes = 60,
  startHour = 17,
  now = new Date(),
): AtlasStudyPlan {
  if (!Number.isFinite(now.getTime()))
    throw new RangeError('Geçerli bir başlangıç tarihi gerekli.');
  const requestedMinutes = dailyMinutes;
  const requestedHour = startHour;
  dailyMinutes = Number.isFinite(dailyMinutes)
    ? Math.max(15, Math.min(180, Math.round(dailyMinutes)))
    : 60;
  startHour = Number.isFinite(startHour)
    ? Math.max(8, Math.min(20, Math.round(startHour)))
    : 17;
  const localNow = localParts(now);
  const id = `atlas-plan-${createHash('sha256')
    .update(
      JSON.stringify([student, dailyMinutes, startHour, now.toISOString()]),
    )
    .digest('hex')
    .slice(0, 16)}`;
  const states: TopicState[] = student.topics
    .filter((topic) => topic.attempts > 0 && Number.isFinite(topic.accuracy))
    .map((topic) => ({ topic, sessions: 0, reviews: new Set<number>() }));
  const notes: string[] = [
    'Saatler Türkiye saatidir. Günlük süre kısa molaları içerir; çalışmalar 21.30’u geçmez.',
    'Plan, kayıtlı ders saatlerine göre hazırlanmış bir öneridir; sonuçların değiştikçe yeniden oluştur.',
  ];
  if (requestedMinutes !== dailyMinutes || requestedHour !== startHour)
    notes.push(
      'Çalışma tercihi günlük 15–180 dakika ve başlangıç 08.00–20.00 aralığına uyarlandı.',
    );
  if (!states.length)
    notes.push(
      'Henüz konu bazında ölçüm yok. Eksik konu tespiti yapılmadı; başlangıç değerlendirmesiyle veri toplanmalı.',
    );
  else if (
    student.evidence.limited ||
    states.some((state) => state.topic.confidence === 'limited')
  )
    notes.push(
      'Ölçüm sınırlı: konu öncelikleri kesin bir yargı değildir. Yeni testlerle planı güncelle.',
    );
  notes.push(...student.evidence.notes.filter(Boolean));
  if (
    student.schedule.some(
      (slot) =>
        parseTime(slot.startTime) === null || parseTime(slot.endTime) === null,
    )
  )
    notes.push(
      'Bazı ders saatleri okunamadı; bu dersleri planı uygulamadan önce programından kontrol et.',
    );

  const assignments = student.upcomingAssignments
    .filter((assignment) => !assignment.submitted)
    .flatMap((assignment, index) => {
      // A bare calendar date is already a Turkish school date, not UTC midnight.
      const bareDate = /^\d{4}-\d{2}-\d{2}$/.test(assignment.dueDate);
      const parsed = bareDate
        ? calendarDay(assignment.dueDate)
        : new Date(assignment.dueDate);
      if (
        !Number.isFinite(parsed.getTime()) ||
        (bareDate && parsed.toISOString().slice(0, 10) !== assignment.dueDate)
      ) {
        notes.push(
          `“${assignment.title}” ödevinin teslim tarihi okunamadı; tarihi kontrol et.`,
        );
        return [];
      }
      const dueDate = bareDate ? assignment.dueDate : localParts(parsed).date;
      const daysUntilDue = Math.round(
        (calendarDay(dueDate).getTime() -
          calendarDay(localNow.date).getTime()) /
          86400000,
      );
      return [
        {
          ...assignment,
          index,
          dueDate,
          daysUntilDue,
          deadlineMinute: bareDate ? 24 * 60 : localParts(parsed).minute,
          completed: false,
          overdue: bareDate
            ? daysUntilDue < 0
            : parsed.getTime() < now.getTime(),
        },
      ];
    })
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue || a.index - b.index);
  const subjects = [
    ...new Set(
      student.schedule
        .map((slot) => slot.subject)
        .filter((subject) => subject && subject !== 'Diğer ders (meşgul)'),
    ),
  ];

  const days: AtlasStudyPlan['days'] = [];
  for (let day = 0; day < 7; day++) {
    const date = addDays(localNow.date, day);
    const start = Math.max(
      startHour * 60,
      day === 0 ? Math.ceil(localNow.minute / 5) * 5 : 0,
    );
    const slots = allocateSlots(
      freeWindows(date, start, student.schedule, student.busyPeriods),
      dailyMinutes,
    );
    const usedToday = new Set<string>();
    let workIndex = 0;
    const blocks: AtlasPlanBlock[] = slots.map((slot, index) => {
      let task: Task;
      if (slot.isBreak) {
        task = {
          subject: 'Mola',
          topic: 'Kısa dinlenme',
          activity: 'Ekrandan uzaklaş, su iç ve kısa bir hareket molası ver.',
          kind: 'break',
          reason:
            'Çalışma bölümleri arasında dikkati dinlendirmek için 5 dakika.',
        };
      } else {
        const homework = assignments.find(
          (assignment) =>
            !assignment.completed && assignment.daysUntilDue <= day + 1,
        );
        const review = states
          .flatMap((state) =>
            state.firstDay === undefined
              ? []
              : REVIEW_OFFSETS.filter(
                  (offset) =>
                    state.firstDay! + offset <= day &&
                    !state.reviews.has(offset),
                ).map((offset) => ({
                  state,
                  offset,
                  due: state.firstDay! + offset,
                })),
          )
          .filter(({ state }) => !usedToday.has(state.topic.key))
          .sort(
            (a, b) =>
              a.due - b.due || a.state.topic.accuracy - b.state.topic.accuracy,
          )[0];
        if (homework) {
          homework.completed = true;
          const afterDeadline =
            homework.daysUntilDue < day ||
            (homework.daysUntilDue === day &&
              slot.end > homework.deadlineMinute);
          task = {
            subject: homework.subject || 'Ödev',
            topic: homework.title,
            kind: 'homework',
            activity:
              'Ödev yönergesini kontrol et, çalışmanı ilerlet ve teslim için eksik adımları işaretle.',
            reason: `${homework.overdue ? 'Teslimi gecikmiş ödev; durumunu öğretmeninle kontrol et.' : afterDeadline ? 'Uygun çalışma boşluğu teslim saatini aşıyor; teslimi öğretmeninle ayrıca planla.' : 'Yaklaşan teslim öncesi hazırlık.'} Teslim tarihi: ${homework.dueDate}. Bu süre ödevin tamamlanacağını garanti etmez.`,
          };
        } else if (review) {
          task = topicTask(review.state, day, review.offset);
          usedToday.add(review.state.topic.key);
        } else if (states.length) {
          const chosen = chooseTopic(states, day, usedToday);
          task = topicTask(chosen, day);
          usedToday.add(chosen.topic.key);
        } else {
          task = neutralTask(day, workIndex, subjects);
        }
        workIndex++;
      }
      return {
        ...task,
        id: `${id}-${day}-${index}`,
        startTime: formatTime(slot.start),
        endTime: formatTime(slot.end),
        minutes: slot.end - slot.start,
      };
    });
    const scheduled = blocks.reduce((total, block) => total + block.minutes, 0);
    if (scheduled < dailyMinutes)
      notes.push(
        `${date}: ${scheduled ? `uygun boşluklara ${scheduled} dakika yerleştirildi` : 'uygun çalışma boşluğu bulunamadı'} (hedef ${dailyMinutes} dakika). Geçmiş saatler, dersler ve 21.30 sınırı korundu.`,
      );
    days.push({ date, label: dayFormatter.format(calendarDay(date)), blocks });
  }
  for (const assignment of assignments.filter(
    (entry) => !entry.completed && entry.daysUntilDue <= 7,
  ))
    notes.push(
      `“${assignment.title}” ödevi için uygun süre kalmadı; ${assignment.dueDate} teslimini ayrıca planla.`,
    );
  if (
    states.some(
      (state) =>
        state.firstDay !== undefined &&
        REVIEW_OFFSETS.some(
          (offset) =>
            state.firstDay! + offset <= 6 && !state.reviews.has(offset),
        ),
    )
  )
    notes.push(
      'Bazı aralıklı tekrarlar uygun süre bulunamadığı için yerleştirilemedi; sonraki planına taşı.',
    );
  const focusTopics = states
    .filter((state) => state.topic.priority === 'focus')
    .sort((a, b) => a.topic.accuracy - b.topic.accuracy);
  return {
    id,
    studentId: student.id,
    studentName: student.name,
    createdAt: now.toISOString(),
    timezone: TIMEZONE,
    dailyMinutes,
    title: `${student.name} için 7 günlük çalışma planı`,
    summary: `${
      focusTopics.length
        ? `Kayıtlı sonuçlara göre ${focusTopics
            .slice(0, 2)
            .map((state) => `${state.topic.subject}: ${state.topic.topic}`)
            .join(' ve ')} öncelikli.`
        : states.length
          ? 'Kayıtlı konuları pratik ve tekrarlarla pekiştiren plan.'
          : 'İlk ölçümü oluşturmak için dengeli bir başlangıç planı.'
    } Günlük hedef molalarla ${dailyMinutes} dakika; ödev teslimleri ve uygun boşluklara göre süre değişebilir.`,
    notes: [...new Set(notes)],
    days,
  };
}
