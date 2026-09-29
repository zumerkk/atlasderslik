import { Types } from 'mongoose';

/** Same legacy rule as EducationService: a declared class id always wins. */
export function buildAtlasClassScope(
  gradeIds: (Types.ObjectId | string)[],
  gradeLevels: (number | string)[],
): any {
  const ids = [
    ...new Set(gradeIds.map(String).filter((id) => Types.ObjectId.isValid(id))),
  ];
  const levels = [
    ...new Set(
      gradeLevels
        .filter((level) => Number.isFinite(Number(level)) && Number(level) > 0)
        .map((level) => Number(level)),
    ),
  ];
  return {
    $or: [
      // Preserve the ordinary indexed branch for current ObjectId records.
      {
        gradeId: {
          $in: ids
            .filter((id) => Types.ObjectId.isValid(id))
            .map((id) => new Types.ObjectId(id)),
        },
      },
      // find() casts $in strings to ObjectIds. Use expressions for legacy rows
      // so compatibility is preserved after Mongoose casts the actual query.
      {
        $expr: {
          $in: [
            {
              $convert: {
                input: '$gradeId',
                to: 'string',
                onError: '',
                onNull: '',
              },
            },
            ids,
          ],
        },
      },
      {
        $and: [
          { $or: [{ gradeId: { $exists: false } }, { gradeId: null }] },
          {
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
          },
        ],
      },
    ],
  };
}
