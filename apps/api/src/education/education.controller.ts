import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, Req } from '@nestjs/common';
import { EducationService } from './education.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@repo/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateGradeDto, CreateSubjectDto, CreateTopicDto, CreateUnitDto } from './dto/create-education.dto';

@Controller('education')
export class EducationController {
    constructor(private readonly educationService: EducationService) { }

    // ─── GRADES ─────────────────────────────────────────
    @Post('grades')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    createGrade(@Body() createGradeDto: CreateGradeDto) {
        return this.educationService.createGrade(createGradeDto.level);
    }

    @Get('grades')
    getGrades() {
        return this.educationService.getGrades();
    }

    @Patch('grades/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    updateGrade(@Param('id') id: string, @Body() body: any) {
        return this.educationService.updateGrade(id, body);
    }

    @Delete('grades/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    deleteGrade(@Param('id') id: string) {
        return this.educationService.deleteGrade(id);
    }

    // ─── SUBJECTS ───────────────────────────────────────
    @Post('subjects')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    createSubject(@Body() createSubjectDto: CreateSubjectDto) {
        return this.educationService.createSubject(createSubjectDto);
    }

    @Get('subjects')
    getSubjects(@Query('gradeLevel') gradeLevel: number) {
        return this.educationService.getSubjects(gradeLevel);
    }

    @Get('subjects/all')
    getAllSubjects() {
        return this.educationService.getAllSubjects();
    }

    @Post('subjects/batch')
    getSubjectsBatch(@Body('ids') ids: string[]) {
        return this.educationService.getSubjectsByIds(ids);
    }

    @Patch('subjects/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    updateSubject(@Param('id') id: string, @Body() body: any) {
        return this.educationService.updateSubject(id, body);
    }

    @Delete('subjects/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    deleteSubject(@Param('id') id: string) {
        return this.educationService.deleteSubject(id);
    }

    // ─── UNITS ──────────────────────────────────────────
    @Post('units')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    createUnit(@Body() createUnitDto: CreateUnitDto) {
        return this.educationService.createUnit(createUnitDto);
    }

    @Get('units')
    getUnits(@Query('subjectId') subjectId: string) {
        return this.educationService.getUnits(subjectId);
    }

    @Patch('units/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    updateUnit(@Param('id') id: string, @Body() body: any) {
        return this.educationService.updateUnit(id, body);
    }

    @Delete('units/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    deleteUnit(@Param('id') id: string) {
        return this.educationService.deleteUnit(id);
    }

    // ─── TOPICS ─────────────────────────────────────────
    @Post('topics')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    createTopic(@Body() createTopicDto: CreateTopicDto) {
        return this.educationService.createTopic(createTopicDto);
    }

    @Get('topics')
    getTopics(@Query('unitId') unitId: string) {
        return this.educationService.getTopics(unitId);
    }

    @Patch('topics/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    updateTopic(@Param('id') id: string, @Body() body: any) {
        return this.educationService.updateTopic(id, body);
    }

    @Delete('topics/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    deleteTopic(@Param('id') id: string) {
        return this.educationService.deleteTopic(id);
    }

    // ─── LIVE CLASSES ───────────────────────────────────
    @Post('live-classes')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    createLiveClass(@Body() data: any, @Req() req) {
        const teacherId = (req.user.role === UserRole.ADMIN && data.teacherId)
            ? data.teacherId
            : req.user.userId;
        return this.educationService.createLiveClass(data, teacherId);
    }

    @Get('live-classes/teacher')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER)
    getTeacherLiveClasses(@Req() req) {
        return this.educationService.getTeacherLiveClasses(req.user.userId);
    }

    @Get('live-classes')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    getAllLiveClasses() {
        return this.educationService.getAllLiveClasses();
    }

    @Get('live-classes/student')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.STUDENT)
    getStudentLiveClasses(@Req() req) {
        return this.educationService.getStudentLiveClasses(Number(req.query.gradeLevel));
    }

    @Delete('live-classes/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    deleteLiveClass(@Param('id') id: string) {
        return this.educationService.deleteLiveClass(id);
    }

    // ─── VIDEOS ─────────────────────────────────────────
    @Post('videos')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    createVideo(@Body() data: any, @Req() req) {
        return this.educationService.createVideo(data, req.user.userId);
    }

    @Get('videos')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.STUDENT, UserRole.ADMIN)
    getVideos(@Query() query) {
        return this.educationService.getVideos(query);
    }

    @Patch('videos/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    updateVideo(@Param('id') id: string, @Body() body: any) {
        return this.educationService.updateVideo(id, body);
    }

    @Delete('videos/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    deleteVideo(@Param('id') id: string) {
        return this.educationService.deleteVideo(id);
    }

    // ─── ASSIGNMENTS ────────────────────────────────────
    @Post('assignments')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    createAssignment(@Body() data: any, @Req() req) {
        return this.educationService.createAssignment(data, req.user.userId);
    }

    @Get('assignments')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.STUDENT, UserRole.ADMIN)
    getAssignments(@Query() query) {
        return this.educationService.getAssignments(query);
    }

    @Patch('assignments/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    updateAssignment(@Param('id') id: string, @Body() body: any) {
        return this.educationService.updateAssignment(id, body);
    }

    @Delete('assignments/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    deleteAssignment(@Param('id') id: string) {
        return this.educationService.deleteAssignment(id);
    }

    @Post('assignments/submit')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.STUDENT)
    submitAssignment(@Body() data: any, @Req() req) {
        return this.educationService.submitAssignment({ ...data, studentId: req.user.userId });
    }

    // ─── STUDENT CONSOLIDATED ENDPOINTS ──────────────────
    @Get('student/dashboard')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.STUDENT)
    getStudentDashboard(@Req() req) {
        return this.educationService.getStudentDashboard(req.user.userId);
    }

    @Get('student/courses')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.STUDENT)
    getStudentCourses(@Req() req) {
        return this.educationService.getStudentCourses(req.user.userId);
    }

    @Get('assignments/student')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.STUDENT)
    async getStudentAssignments(@Req() req) {
        return this.educationService.getStudentAssignments(req.user.userId);
    }

    @Get('submissions/mine')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.STUDENT)
    getMySubmissions(@Req() req) {
        return this.educationService.getMySubmissions(req.user.userId);
    }

    @Get('assignments/:id/submissions')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    getSubmissions(@Param('id') id: string) {
        return this.educationService.getSubmissions(id);
    }

    @Patch('submissions/:id/grade')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    gradeSubmission(@Param('id') id: string, @Body() body: any) {
        return this.educationService.gradeSubmission(id, body.grade, body.feedback);
    }

    // ─── TEACHER ASSIGNMENTS ────────────────────────────
    @Post('teacher-assignments')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    createTeacherAssignment(@Body() data: any) {
        return this.educationService.createTeacherAssignment(data);
    }

    @Get('teacher-assignments')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    getTeacherAssignments(@Query() query) {
        return this.educationService.getTeacherAssignments(query);
    }

    @Get('teacher-assignments/mine')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER)
    getMyAssignments(@Req() req) {
        return this.educationService.getMyAssignments(req.user.userId);
    }

    @Delete('teacher-assignments/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    deleteTeacherAssignment(@Param('id') id: string) {
        return this.educationService.deleteTeacherAssignment(id);
    }

    // ─── STUDENT ENROLLMENTS ────────────────────────────
    @Post('student-enrollments')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    createStudentEnrollment(@Body() data: any) {
        return this.educationService.createStudentEnrollment(data);
    }

    @Get('student-enrollments')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    getStudentEnrollments(@Query() query) {
        return this.educationService.getStudentEnrollments(query);
    }

    @Get('student-enrollments/mine')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.STUDENT)
    getMyEnrollment(@Req() req) {
        return this.educationService.getMyEnrollment(req.user.userId);
    }

    @Delete('student-enrollments/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    deleteStudentEnrollment(@Param('id') id: string) {
        return this.educationService.deleteStudentEnrollment(id);
    }

    // ─── QUESTIONS ──────────────────────────────────────
    @Post('questions')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    createQuestion(@Body() data: any, @Req() req) {
        return this.educationService.createQuestion(data, req.user.userId);
    }

    @Get('questions')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    getQuestions(@Query() query, @Req() req) {
        // Teacher sees only their own questions; Admin sees all
        if (req.user.role === UserRole.TEACHER) {
            query.teacherId = req.user.userId;
        }
        return this.educationService.getQuestions(query);
    }

    @Patch('questions/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    updateQuestion(@Param('id') id: string, @Body() body: any) {
        return this.educationService.updateQuestion(id, body);
    }

    @Delete('questions/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    deleteQuestion(@Param('id') id: string) {
        return this.educationService.deleteQuestion(id);
    }

    // ─── SCHEDULES (Haftalık Ders Programı) ─────────────
    @Post('schedules')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    createSchedule(@Body() data: any) {
        return this.educationService.createSchedule(data);
    }

    @Get('schedules')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    getSchedules(@Query() query) {
        return this.educationService.getSchedules(query);
    }

    @Get('schedules/teacher')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER)
    getTeacherSchedule(@Req() req) {
        return this.educationService.getTeacherSchedule(req.user.userId);
    }

    @Get('schedules/student')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.STUDENT)
    getStudentSchedule(@Req() req) {
        return this.educationService.getStudentSchedule(req.user.userId);
    }

    @Patch('schedules/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    updateSchedule(@Param('id') id: string, @Body() body: any) {
        return this.educationService.updateSchedule(id, body);
    }

    @Delete('schedules/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    deleteSchedule(@Param('id') id: string) {
        return this.educationService.deleteSchedule(id);
    }

    @Get('calendar/events')
    @UseGuards(JwtAuthGuard)
    getCalendarEvents(@Query() query) {
        return this.educationService.getCalendarEvents(
            Number(query.gradeLevel),
            query.startDate,
            query.endDate,
        );
    }
}
