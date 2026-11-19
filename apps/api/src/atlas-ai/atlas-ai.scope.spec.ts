import mongoose, { Types } from 'mongoose';
import { buildAtlasClassScope, resolveAtlasClassAccess } from './atlas-ai.scope';

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
    expect(filter.$or[2].$and[0]).toEqual({ $or: [{ gradeId: { $exists: false } }, { gradeId: null }] });
    const manualBranch = filter.$or[2].$and[1].$or[0].$and;
    expect(manualBranch[0].$expr.$in[1]).toEqual([8]);
    expect(manualBranch[1]).toEqual({ $or: [{ $or: [{ subjectId: { $exists: false } }, { subjectId: null }] }] });
  });

  it('has no matching id or level for an unenrolled student or malformed ids', () => {
    const filter = buildAtlasClassScope(['', 'invalid'], [0, 'bad']);
    expect(filter.$or[0].gradeId.$in).toEqual([]);
    expect(filter.$or[1].$expr.$in[1]).toEqual([]);
    expect(filter.$or[2].$and[1].$or[0].$and[0].$expr.$in[1]).toEqual([]);
  });
});


describe('AtlasAI exact class and subject authority', () => {
  const own = new Types.ObjectId('507f1f77bcf86cd799439031');
  const foreign = new Types.ObjectId('507f1f77bcf86cd799439032');
  const id = (suffix: number) => new Types.ObjectId(`507f1f77bcf86cd7994390${suffix}`);
  const query = (rows: any[]) => { const value: any = { exec: jest.fn().mockResolvedValue(rows) }; for (const method of ['select', 'lean']) value[method] = jest.fn().mockReturnValue(value); return value; };
  const subjects = [
    { _id: id(41), gradeId: own, gradeLevel: 8, isActive: true },
    { _id: id(42), gradeLevel: 8, isActive: true },
    { _id: id(43), gradeId: foreign, gradeLevel: 8, isActive: true },
    { _id: id(44), gradeLevel: 8, isActive: true },
    { _id: id(45), gradeId: own, gradeLevel: 8, isActive: false },
    { _id: id(46), gradeLevel: 7, isActive: true },
    { _id: id(47), gradeId: '', gradeLevel: 8, isActive: true },
  ];
  const activeGrant = { orderId: own, startsAt: new Date('2026-01-01'), expiresAt: new Date('2030-01-01'), unlimited: false, environment: 'live' };
  const assignments = [42, 43, 45, 46, 47].map(suffix => ({ gradeId: own, subjectId: id(suffix) }));
  it.each(['package', 'manual', undefined])('never rescues foreign/pasif/mismatched subjects with a TA for %s access', async source => {
    const teaching = { find: jest.fn().mockReturnValue(query(assignments)) }, model = { find: jest.fn().mockReturnValue(query(subjects)) };
    const result = await resolveAtlasClassAccess([{ gradeId: { _id: own, level: 8, isActive: true }, accessSource: source, packageGrants: [activeGrant] }], teaching as any, model as any);
    expect(result.bindings).toEqual([41, 42].map(suffix => ({ gradeId: String(own), subjectId: String(id(suffix)), level: 8 })));
    expect(result.fallbackLevels).toEqual(source === 'package' ? [] : [8]);
    expect(result.fallbackSubjects.map(subject => subject.subjectId)).toEqual(source === 'package' ? [] : [String(id(42)), String(id(44))]);
    expect(teaching.find.mock.calls[0][0].$expr.$in[1]).toEqual([String(own)]);
    expect(model.find.mock.calls[0][0].isActive).toBe(true);
  });
  it('does not cross a subject binding from another enrolled level', async () => {
    const teaching = { find: jest.fn().mockReturnValue(query([{ gradeId: foreign, subjectId: id(42) }])) }, model = { find: jest.fn().mockReturnValue(query(subjects)) };
    const result = await resolveAtlasClassAccess([
      { gradeId: { _id: own, level: 8, isActive: true }, accessSource: 'package', packageGrants: [activeGrant] },
      { gradeId: { _id: foreign, level: 7, isActive: true }, accessSource: 'manual' },
    ], teaching as any, model as any);
    expect(result.bindings).toEqual([{ gradeId: String(own), subjectId: String(id(41)), level: 8 }]);
    expect(result.fallbackLevels).toEqual([7]);
    expect(result.fallbackSubjects).toEqual([{ subjectId: String(id(46)), level: 7 }]);
  });
  it('discards closed, deleted, unresolved and invalid-level classes before authorizing ids or manual levels', async () => {
    const model = { find: jest.fn() };
    const result = await resolveAtlasClassAccess([
      { gradeId: { _id: own, level: 8, isActive: false }, accessSource: 'manual' },
      { gradeId: null, accessSource: 'package' },
      { gradeId: own, accessSource: 'manual' },
      { gradeId: { _id: own, level: 0, isActive: true } },
      { gradeId: { _id: own, level: 13, isActive: true } },
      { gradeId: { _id: own, isActive: true } },
    ], model as any, model as any);
    expect(result.gradeIds).toEqual([]);
    expect(result.levels).toEqual([]);
    expect(result.fallbackLevels).toEqual([]);
    expect(model.find).not.toHaveBeenCalled();
  });
  it('retains legacy string class ids once the actual active Grade has been populated', async () => {
    const model = { find: jest.fn().mockReturnValue(query([])) };
    const result = await resolveAtlasClassAccess([{ gradeId: { _id: String(own), level: '8', isActive: true }, accessSource: 'package', packageGrants: [activeGrant] }], model as any, model as any);
    expect(result.gradeIds).toEqual([String(own)]);
    expect(result.levels).toEqual([8]);
    expect(result.fallbackLevels).toEqual([]);
  });
  it('fails closed without class rows and never queries all teaching/subjects', async () => {
    const model = { find: jest.fn() };
    expect(await resolveAtlasClassAccess([], model as any, model as any)).toEqual({ gradeIds: [], levels: [], fallbackLevels: [], bindings: [], fallbackSubjects: [] });
    expect(model.find).not.toHaveBeenCalled();
  });
});
