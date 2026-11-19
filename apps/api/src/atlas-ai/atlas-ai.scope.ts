import { Model, Types } from 'mongoose';
import { enrollmentAccessState, type PackageEnrollmentGrant } from '../education/schemas/student-enrollment.schema';

export type AtlasSubjectBinding = {
  gradeId: string;
  subjectId: string;
  level: number;
};
type AtlasSubjectLevel = Pick<AtlasSubjectBinding, 'subjectId' | 'level'>;
const identifier = (value: any): string => String(value?._id || value || '');
const numericLevels = (values: (number | string)[]) => [
  ...new Set(
    values
      .map(Number)
      .filter((value) => Number.isInteger(value) && value >= 1 && value <= 12),
  ),
];
const asString = (field: string) => ({
  $convert: { input: `$${field}`, to: 'string', onError: '', onNull: '' },
});
const levelMatches = (levels: number[]) => ({
  $expr: {
    $in: [
      {
        $convert: {
          input: '$gradeLevel',
          to: 'double',
          onError: null,
          onNull: null,
        },
      },
      levels,
    ],
  },
});
const missing = (field: string) => ({
  $or: [{ [field]: { $exists: false } }, { [field]: null }],
});
const subjectMatches = (subjects: AtlasSubjectLevel[]) => ({
  $or: subjects.map((subject) => ({
    $and: [
      { $expr: { $eq: [asString('subjectId'), subject.subjectId] } },
      levelMatches([subject.level]),
    ],
  })),
});

/** Only a fetched, active Grade with a known level can authorize AI content. */
type AtlasEnrollmentGrant = { accessSource?: string; packageGrants?: PackageEnrollmentGrant[] };
export function hasAtlasEnrollmentAccess(row: AtlasEnrollmentGrant, now = new Date()) {
  return enrollmentAccessState({ ...row, packageGrants: Array.isArray(row.packageGrants) ? row.packageGrants.filter(Boolean) : [] }, now).accessGranted;
}
export function activeAtlasEnrollments<T extends AtlasEnrollmentGrant & { gradeId?: any }>(rows: T[], now = new Date()): T[] {
  return rows.filter(
    (row) =>
      hasAtlasEnrollmentAccess(row, now) &&
      row.gradeId?.isActive === true &&
      Types.ObjectId.isValid(identifier(row.gradeId)) &&
      Number.isInteger(Number(row.gradeId.level)) &&
      Number(row.gradeId.level) >= 1 &&
      Number(row.gradeId.level) <= 12,
  );
}

/** Resolve actual class/subject bindings, never infer paid access from a level. */
export async function resolveAtlasClassAccess(
  enrollments: any[],
  teaching: Model<any>,
  subjects: Model<any>,
  now = new Date(),
) {
  const classes = activeAtlasEnrollments(enrollments, now)
    .map((row) => ({
      id: identifier(row.gradeId),
      level: Number(row.gradeId?.level),
      manual: row.accessSource === undefined || row.accessSource === 'manual',
    }))
    .filter((row) => Types.ObjectId.isValid(row.id));
  const gradeIds = [...new Set(classes.map((row) => row.id))];
  const levels = numericLevels(classes.map((row) => row.level));
  const fallbackLevels = numericLevels(
    classes.filter((row) => row.manual).map((row) => row.level),
  );
  if (!gradeIds.length || !levels.length)
    return {
      gradeIds,
      levels,
      fallbackLevels,
      bindings: [] as AtlasSubjectBinding[],
      fallbackSubjects: [] as AtlasSubjectLevel[],
    };
  const [assignments, candidates] = await Promise.all([
    teaching
      .find({ $expr: { $in: [asString('gradeId'), gradeIds] } })
      .select('gradeId subjectId')
      .lean()
      .exec(),
    subjects
      .find({ isActive: true, ...levelMatches(levels) })
      .select('_id gradeId gradeLevel isActive')
      .lean()
      .exec(),
  ]);
  const bindings: AtlasSubjectBinding[] = [],
    fallbackSubjects: AtlasSubjectLevel[] = [];
  for (const subject of candidates) {
    const subjectId = identifier(subject),
      level = Number(subject.gradeLevel);
    if (
      subject.isActive !== true ||
      !Types.ObjectId.isValid(subjectId) ||
      !levels.includes(level)
    )
      continue;
    const declaredClass =
      subject.gradeId !== undefined && subject.gradeId !== null;
    if (declaredClass) {
      // A foreign declared class can never be rescued by an inconsistent TA.
      const gradeId = identifier(subject.gradeId);
      if (classes.some((row) => row.id === gradeId && row.level === level))
        bindings.push({ gradeId, subjectId, level });
      continue;
    }
    for (const row of classes) {
      if (
        row.level === level &&
        assignments.some(
          (assignment) =>
            identifier(assignment.gradeId) === row.id &&
            identifier(assignment.subjectId) === subjectId,
        )
      )
        bindings.push({ gradeId: row.id, subjectId, level });
    }
    if (fallbackLevels.includes(level))
      fallbackSubjects.push({ subjectId, level });
  }
  return { gradeIds, levels, fallbackLevels, bindings, fallbackSubjects };
}

/** Declared content class wins; missing-class content needs a verified subject binding. */
export function buildAtlasClassScope(
  gradeIds: (Types.ObjectId | string)[],
  fallbackLevels: (number | string)[],
  bindings: AtlasSubjectLevel[] = [],
  fallbackSubjects: AtlasSubjectLevel[] = [],
): any {
  const ids = [
    ...new Set(gradeIds.map(String).filter((id) => Types.ObjectId.isValid(id))),
  ];
  const levels = numericLevels(fallbackLevels);
  return {
    $or: [
      { gradeId: { $in: ids.map((id) => new Types.ObjectId(id)) } },
      { $expr: { $in: [asString('gradeId'), ids] } },
      {
        $and: [
          missing('gradeId'),
          {
            $or: [
              ...(bindings.length ? [subjectMatches(bindings)] : []),
              {
                $and: [
                  levelMatches(levels),
                  {
                    $or: [
                      missing('subjectId'),
                      ...(fallbackSubjects.length
                        ? [subjectMatches(fallbackSubjects)]
                        : []),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}
