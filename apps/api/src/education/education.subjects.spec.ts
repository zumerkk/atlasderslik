import { BadRequestException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Types } from 'mongoose';
import { CreateSubjectDto } from './dto/create-education.dto';
import { EducationService } from './education.service';

const gradeId = new Types.ObjectId().toHexString();
const query = (result: unknown) => ({ exec: jest.fn().mockResolvedValue(result) });

describe('Subject class compatibility', () => {
    let service: EducationService;
    let grades: any;
    let subjects: any;
    let schedules: any;
    let assignments: any;
    beforeEach(() => {
        grades = { findById: jest.fn(() => query({ _id: gradeId, level: 8 })) };
        subjects = {
            create: jest.fn().mockImplementation(async data => data),
            find: jest.fn(() => ({ populate: jest.fn(() => query([])) })),
            findByIdAndUpdate: jest.fn(() => ({ populate: jest.fn(() => query({})) })),
        };
        schedules = { distinct: jest.fn(() => query([])) };
        assignments = { distinct: jest.fn(() => query([])) };
        service = new EducationService(grades, subjects, null!, null!, null!, null!, null!, null!, assignments, null!, null!, schedules, null!, null!, null!);
    });

    it('includes shared curriculum and exact timetable/teacher references without unrelated branches', async () => {
        const scheduledId = new Types.ObjectId();
        const assignedId = new Types.ObjectId();
        schedules.distinct.mockReturnValue(query([scheduledId]));
        assignments.distinct.mockReturnValue(query([assignedId]));
        await service.getSubjects(undefined, gradeId);
        expect(subjects.find).toHaveBeenCalledWith({ $or: [
            { gradeId: new Types.ObjectId(gradeId) },
            { gradeId: null, gradeLevel: 8 },
            { _id: { $in: [scheduledId, assignedId] } },
        ] });
        expect(schedules.distinct).toHaveBeenCalledWith('subjectId', { gradeId: new Types.ObjectId(gradeId), isActive: { $ne: false } });
    });

    it('keeps the legacy level-only lookup working', async () => {
        await service.getSubjects(8);
        expect(subjects.find).toHaveBeenCalledWith({ gradeLevel: 8 });
        expect(schedules.distinct).not.toHaveBeenCalled();
    });

    it('derives the level from the selected class on creation', async () => {
        expect(await service.createSubject({ name: 'Fen', gradeId })).toEqual({ name: 'Fen', gradeId, gradeLevel: 8 });
    });

    it('preserves the class association when updating only the Zoom link', async () => {
        const id = new Types.ObjectId().toHexString();
        const patch = { zoomUrl: 'https://zoom.us/j/123456789' };
        await service.updateSubject(id, patch);
        expect(subjects.findByIdAndUpdate).toHaveBeenCalledWith(id, patch, { new: true });
        expect(grades.findById).not.toHaveBeenCalled();
    });

    it('validates class existence before creation, update or lookup', async () => {
        await expect(service.getSubjects(undefined, 'invalid')).rejects.toBeInstanceOf(BadRequestException);
        grades.findById.mockReturnValue(query(null));
        await expect(service.getSubjects(undefined, gradeId)).rejects.toBeInstanceOf(NotFoundException);
        await expect(service.createSubject({ name: 'Fen', gradeId })).rejects.toBeInstanceOf(NotFoundException);
        await expect(service.updateSubject(gradeId, { gradeId })).rejects.toBeInstanceOf(NotFoundException);
        expect(subjects.create).not.toHaveBeenCalled();
        expect(subjects.findByIdAndUpdate).not.toHaveBeenCalled();
    });
});

describe('CreateSubjectDto', () => {
    it.each([{ name: 'Fen', gradeId }, { name: 'Fen', gradeLevel: 8 }])('accepts class-based and legacy requests: %j', async body => {
        expect(await validate(plainToInstance(CreateSubjectDto, body))).toHaveLength(0);
    });
    it.each([
        { name: 'Fen' }, { name: 'Fen', gradeId: 'invalid' },
        { name: 'Fen', gradeLevel: 0 }, { name: 'Fen', gradeLevel: 13 },
        { name: 'Fen', gradeLevel: 6.5 }, { name: 'Fen', gradeId, gradeLevel: '8' },
    ])('rejects missing or invalid class information: %j', async body => {
        expect((await validate(plainToInstance(CreateSubjectDto, body))).length).toBeGreaterThan(0);
    });
});
