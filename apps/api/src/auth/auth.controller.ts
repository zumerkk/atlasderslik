import { Controller, Request, Post, UseGuards, Body, Get, Patch, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private usersService: UsersService,
        @InjectModel('StudentEnrollment') private studentEnrollmentModel: Model<any>,
    ) { }

    @Post('login')
    async login(@Body() req) {
        const user = await this.authService.validateUser(req.email, req.password);
        if (!user) {
            throw new UnauthorizedException('Geçersiz e-posta veya şifre');
        }
        return this.authService.login(user);
    }

    @Post('register')
    async register(@Body() createUserDto: RegisterDto) {
        try {
            return await this.authService.register(createUserDto);
        } catch (err: any) {
            if (err?.code === 11000 || err?.message?.includes('duplicate') || err?.message?.includes('E11000')) {
                throw new ConflictException('Bu e-posta adresi zaten kayıtlı.');
            }
            throw err;
        }
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    async getProfile(@Request() req) {
        // Load full user document from DB (not just JWT payload)
        const user = await this.usersService.findOne(req.user.userId);
        if (!user) throw new UnauthorizedException('User not found');

        const result: any = (user as any).toObject ? (user as any).toObject() : { ...user };
        delete result.passwordHash;

        // If STUDENT, also attach gradeLevel from enrollment
        if (result.role === 'STUDENT') {
            const enrollment = await this.studentEnrollmentModel
                .findOne({ studentId: new Types.ObjectId(req.user.userId) })
                .populate('gradeId', 'level')
                .exec();
            if (enrollment) {
                result.gradeLevel = (enrollment.gradeId as any)?.level || null;
                result.enrollmentId = enrollment._id;
            }
        }

        return result;
    }

    @UseGuards(JwtAuthGuard)
    @Patch('profile')
    async updateProfile(@Request() req, @Body() body: any) {
        // Only allow updating safe fields
        const allowed: any = {};
        if (body.firstName !== undefined) allowed.firstName = body.firstName;
        if (body.lastName !== undefined) allowed.lastName = body.lastName;
        if (body.phone !== undefined) allowed.phone = body.phone;

        const updated = await this.usersService.update(req.user.userId, allowed);
        return updated;
    }
}
