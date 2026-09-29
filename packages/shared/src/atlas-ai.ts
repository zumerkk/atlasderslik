export interface AtlasTopicInsight {
    key: string;
    subject: string;
    topic: string;
    attempts: number;
    correct: number;
    wrong: number;
    empty: number;
    accuracy: number;
    priority: 'focus' | 'practice' | 'strong';
    confidence: 'limited' | 'developing' | 'established';
}

export interface AtlasScheduleSlot {
    subject: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
}

export interface AtlasStudentInsight {
    id: string;
    name: string;
    classes: string[];
    metrics: {
        completedTests: number;
        submittedAssignments: number;
        averageScore: number | null;
        previousAverageScore: number | null;
        scoreChange: number | null;
        correct: number;
        wrong: number;
        empty: number;
    };
    topics: AtlasTopicInsight[];
    schedule: AtlasScheduleSlot[];
    /** Date-specific appointments; labels omitted when only availability is needed. */
    busyPeriods?: { start: string; end: string }[];
    upcomingAssignments: { title: string; subject: string; dueDate: string; submitted: boolean }[];
    evidence: { analyzedTests: number; analyzedQuestions: number; limited: boolean; notes: string[] };
}

export interface AtlasInsights {
    generatedAt: string;
    period: { label: string; start: string; end: string };
    students: AtlasStudentInsight[];
    selectedStudentId: string | null;
}

export interface AtlasPlanBlock {
    id: string;
    startTime: string;
    endTime: string;
    minutes: number;
    subject: string;
    topic: string;
    activity: string;
    kind: 'learn' | 'practice' | 'review' | 'homework' | 'break';
    reason: string;
}

export interface AtlasPlanDay {
    date: string;
    label: string;
    blocks: AtlasPlanBlock[];
}

export interface AtlasStudyPlan {
    id: string;
    studentId: string;
    studentName: string;
    createdAt: string;
    timezone: 'Europe/Istanbul';
    dailyMinutes: number;
    title: string;
    summary: string;
    notes: string[];
    days: AtlasPlanDay[];
}

export interface AtlasSavedPlanResponse {
    plan: AtlasStudyPlan | null;
    completedBlockIds: string[];
    updatedAt: string | null;
}
