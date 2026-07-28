import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRole } from '@repo/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AiService } from './ai.service';

/** Teacher-facing AI helpers. The Groq key never leaves the server. */
@SkipThrottle()
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
export class AiController {
    constructor(private readonly ai: AiService) { }

    /**
     * Generates a real quiz: questions AND their answer key, so the key
     * actually corresponds to something. Returns `null` questions when the
     * model is unavailable rather than inventing a random key.
     */
    @Post('quiz')
    async generateQuiz(@Body() body: { topic: string; count: number }) {
        const count = Math.min(40, Math.max(1, Number(body?.count) || 10));
        const topic = String(body?.topic || '').slice(0, 300);

        const parsed = await this.ai.chatJson<{ title: string; questions: any[] }>({
            system:
                'Sen MEB müfredatına hakim bir soru yazarısın. İstenen konu ve sayıda çoktan seçmeli soru üret. ' +
                'SADECE şu JSON şemasıyla yanıt ver: {"title": string, "questions": [{"questionText": string, ' +
                '"options": [{"letter":"A","text":string},{"letter":"B","text":string},{"letter":"C","text":string},' +
                '{"letter":"D","text":string}], "correctLetter":"A"|"B"|"C"|"D"}]}. ' +
                'Her sorunun tam olarak bir doğru cevabı olmalı ve cevap anahtarı sorularla tutarlı olmalı.',
            user: `Konu: ${topic}. Soru sayısı: ${count}.`,
            temperature: 0.8,
            maxTokens: 4000,
        });

        const questions = Array.isArray(parsed?.questions)
            ? parsed!.questions.filter((q: any) =>
                q?.questionText && Array.isArray(q?.options) && ['A', 'B', 'C', 'D'].includes(q?.correctLetter))
            : [];

        if (!questions.length) {
            return { ok: false, message: 'AI şu anda soru üretemedi. Lütfen tekrar deneyin.', title: null, questions: [], answerKey: [] };
        }

        return {
            ok: true,
            title: parsed?.title || topic,
            questions,
            answerKey: questions.map((q: any) => q.correctLetter),
        };
    }
}
