import mongoose, { Types } from 'mongoose';
import { buildAtlasClassScope } from './atlas-ai.scope';

describe('AtlasAI class scope after real Mongoose casting', () => {
  const ownClass = new Types.ObjectId('507f1f77bcf86cd799439012');
  const Model = mongoose.model(
    'AtlasScopeCastTest',
    new mongoose.Schema({
      gradeId: mongoose.Schema.Types.ObjectId,
      gradeLevel: Number,
    }),
  );

  it('preserves string legacy identifiers and numeric level expressions after casting', () => {
    const query = Model.find(buildAtlasClassScope([ownClass], [8, '8']));
    query.cast(Model);
    const filter: any = query.getFilter();
    expect(filter.$or[0]).toEqual({ gradeId: { $in: [ownClass] } });
    expect(filter.$or[1].$expr.$in[1]).toEqual([String(ownClass)]);
    expect(filter.$or[2].$and).toEqual([
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
            [8],
          ],
        },
      },
    ]);
  });

  it('has no matching id or level for an unenrolled student or malformed ids', () => {
    const filter = buildAtlasClassScope(['', 'invalid'], [0, 'bad']);
    expect(filter.$or[0].gradeId.$in).toEqual([]);
    expect(filter.$or[1].$expr.$in[1]).toEqual([]);
    expect(filter.$or[2].$and[1].$expr.$in[1]).toEqual([]);
  });
});
