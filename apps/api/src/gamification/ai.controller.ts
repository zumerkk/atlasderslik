import { BadRequestException, Body, Controller, Post, Req, ServiceUnavailableException, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRole } from '@repo/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AiService } from './ai.service';
import { AtlasCurriculumService } from '../atlas-ai/atlas-ai.curriculum.service';
import { AtlasAiRateLimitGuard } from '../atlas-ai/atlas-ai-rate-limit.guard';
import { IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

class AtlasQuizDto {
    @IsOptional() @IsMongoId() topicId?: string;
    @IsString() @MaxLength(300) topic: string;
    @IsInt() @Min(1) @Max(20) count: number;
}
const quizSchema = { type: 'object', additionalProperties: false, properties: { title: { type: 'string' }, questions: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { questionText: { type: 'string' }, options: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { letter: { type: 'string', enum: ['A', 'B', 'C', 'D'] }, text: { type: 'string' } }, required: ['letter', 'text'] } }, correctLetter: { type: 'string', enum: ['A', 'B', 'C', 'D'] } }, required: ['questionText', 'options', 'correctLetter'] } } }, required: ['title', 'questions'] };

/** Teacher-facing helpers share AtlasAI's approved curriculum boundary. */
@SkipThrottle()
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
export class AiController {
    constructor(private readonly ai: AiService, private readonly curriculum: AtlasCurriculumService) { }

    /**
     * Generates a real quiz: questions AND their answer key, so the key
     * actually corresponds to something. Returns `null` questions when the
     * model is unavailable rather than inventing a random key.
     */
    @Post('quiz')
    @UseGuards(AtlasAiRateLimitGuard)
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    async generateQuiz(@Req() req: any, @Body() body: AtlasQuizDto) {
        const count = Math.min(20, Math.max(1, Number(body?.count) || 10));
        const topic = String(body?.topic || '').slice(0, 300);
        const scope = await this.curriculum.requireEducatorScope(req.user.userId, body.topicId);
        const decision = await this.curriculum.assertRequest(scope, { message: `${topic}. Bu konudan ${count} soru hazırla.` });
        if (!decision.allowed) throw new BadRequestException(decision.reason);

        const parsed = await this.ai.chatStructured<{ title: string; questions: any[] }>({
            system:
                `Sen AtlasAI soru yazarısın. Sadece ONAYLI_KAPSAM=${JSON.stringify(scope.topics)} ve çıktı kimlikleri ${JSON.stringify(decision.matchedOutcomeIds)} içinde istenen sayıda çoktan seçmeli soru üret. ` +
                'SADECE şu JSON şemasıyla yanıt ver: {"title": string, "questions": [{"questionText": string, ' +
                '"options": [{"letter":"A","text":string},{"letter":"B","text":string},{"letter":"C","text":string},' +
                '{"letter":"D","text":string}], "correctLetter":"A"|"B"|"C"|"D"}]}. ' +
                'Her sorunun tam olarak bir doğru cevabı olmalı ve cevap anahtarı sorularla tutarlı olmalı.',
            user: `Konu: ${topic}. Soru sayısı: ${count}.`,
            temperature: 0.8,
            maxTokens: 4000,
        }, quizSchema, 'atlas_approved_quiz');

        const questions = Array.isArray(parsed?.questions)
            ? parsed!.questions.filter((q: any) =>
                typeof q?.questionText === 'string' && q.questionText.length > 0 && q.questionText.length <= 2000 && Array.isArray(q?.options) && q.options.length === 4 && new Set(q.options.map((o: any) => o.letter)).size === 4 && q.options.every((o: any) => ['A', 'B', 'C', 'D'].includes(o.letter) && typeof o.text === 'string' && o.text.length > 0 && o.text.length <= 1000) && ['A', 'B', 'C', 'D'].includes(q?.correctLetter))
            : [];

        if (questions.length !== count || !await this.curriculum.verifyContent(scope, JSON.stringify(parsed), decision.matchedOutcomeIds) || !await this.curriculum.isCurrent(req.user.userId, scope)) throw new ServiceUnavailableException('Soruların biçimi ve müfredat uygunluğu doğrulanamadı. Yeniden deneyin.');

        return {
            ok: true,
            title: parsed?.title || topic,
            questions,
            answerKey: questions.map((q: any) => q.correctLetter),
        };
    }
}
