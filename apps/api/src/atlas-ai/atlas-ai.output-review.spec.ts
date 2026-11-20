import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { AiService } from '../gamification/ai.service';
import { OpenAiBudgetException } from '../gamification/openai-budget.service';
import { assertAtlasOutputReview, atlasReviewedTopics } from './atlas-ai.output-review';
import type { AtlasReviewedTopic } from './atlas-ai.output-review';

const original = 'data:image/png;base64,b3JpZ2luYWw=';
const previous = 'data:image/png;base64,cHJldmlvdXM=';
const candidate = 'data:image/png;base64,Y2FuZGlkYXRl';
const topics: AtlasReviewedTopic[] = [{
  name: 'Sıvı basıncı', subject: 'Fen Bilimleri', gradeLevel: 8,
  outcomes: [{ id: 'approved-entry:0', code: 'F.8.3.1.1', text: 'Sıvı basıncını etkileyen değişkenleri açıklar.' }],
}];
const accepted = () => ({
  sourceReadable: true, answerCorrect: true, explanationCorrect: true, replyConsistent: true, noInventedGivens: true,
  matchedOutcomeIds: ['approved-entry:0'], confidence: .98,
  sourceHasChoices: true,
  optionChecks: [
    { label: 'A', sourceObservation: 'Basınç önce azalır, sıfıra ulaşır, sonra artar.', candidateExplanationCorrect: true },
    { label: 'B', sourceObservation: 'Basınç önce artar, sonra azalır.', candidateExplanationCorrect: true },
    { label: 'C', sourceObservation: 'Basınç önce azalır, minimum sıfırdan büyüktür, sonra artar.', candidateExplanationCorrect: true },
    { label: 'D', sourceObservation: 'Basınç sürekli artar.', candidateExplanationCorrect: true },
  ],
  independentConclusion: 'Kap genişlerken su yüksekliği ve basınç azalır, daralırken artar. Minimum basınç pozitiftir. C.',
});

describe('Independent educational answer review', () => {
  const input = () => ({
    request: { message: 'Sabit miktarda su olan kabın doğru basınç grafiği?', imageNumber: 1, previousMessages: [], additionalImageNumbers: [] },
    images: [original], approvedTopics: topics,
    reply: 'C. Kap genişlerken su yüksekliği ve basınç azalır; daralırken artar.',
  });
  let review: jest.Mock;
  let ai: AiService;
  beforeEach(() => {
    review = jest.fn().mockResolvedValue(accepted());
    ai = { chatStructured: review, reviewModel: 'gpt-6-sol' } as unknown as AiService;
  });

  it('compares the exact original request to the candidate and binds references to the selected outcomes', async () => {
    await expect(assertAtlasOutputReview(ai, input())).resolves.toBeUndefined();
    const [options, schema, name] = review.mock.calls[0];
    expect(name).toBe('atlas_educational_output_review');
    expect(JSON.parse(options.user)).toMatchObject({ originalRequest: input().request, candidateAnswer: input().reply, sourceImageNumbers: [1] });
    expect(options.images).toEqual([original]);
    expect(options.model).toBe('gpt-6-sol');
    expect(schema.properties.matchedOutcomeIds.items.enum).toEqual(['approved-entry:0']);
    expect(schema.properties.optionChecks.items).toMatchObject({ additionalProperties: false,
      properties: { label: { enum: ['A', 'B', 'C', 'D', 'E'] }, sourceObservation: { maxLength: 500 } } });
    expect(schema.required).toEqual(expect.arrayContaining(['sourceHasChoices', 'optionChecks']));
    expect(schema.properties).not.toHaveProperty('diagramCorrect');
    expect(options.system).toContain('Doğru şıkla birlikte tek yanlış gerekçe bile onaylanamaz');
    expect(review).toHaveBeenCalledTimes(1);
  });

  it.each(['A', 'B', 'D'])('withholds a correct C when its explanation of option %s is wrong despite the aggregate flags', async label => {
    const result = accepted();
    result.optionChecks.find(option => option.label === label)!.candidateExplanationCorrect = false;
    review.mockResolvedValue(result);
    await expect(assertAtlasOutputReview(ai, { ...input(), reply: 'C doğrudur. Diğer grafikler de sıfırdan büyük minimum gösterir.' }))
      .rejects.toMatchObject({ response: { code: 'ATLAS_OUTPUT_REVIEW_FAILED' } });
    expect(review).toHaveBeenCalledTimes(1);
  });

  it('accepts a source without options only when its per-option review is empty', async () => {
    review.mockResolvedValue({ ...accepted(), sourceHasChoices: false, optionChecks: [] });
    await expect(assertAtlasOutputReview(ai, input())).resolves.toBeUndefined();
  });

  it.each([
    { sourceHasChoices: true, optionChecks: [] },
    { sourceHasChoices: true, optionChecks: [accepted().optionChecks[0]] },
    { sourceHasChoices: false, optionChecks: accepted().optionChecks },
    { sourceHasChoices: 'true', optionChecks: accepted().optionChecks },
    { sourceHasChoices: true, optionChecks: [{ ...accepted().optionChecks[0], label: 'Z' }, accepted().optionChecks[1]] },
    { sourceHasChoices: true, optionChecks: [accepted().optionChecks[0], accepted().optionChecks[0]] },
    { sourceHasChoices: true, optionChecks: [{ ...accepted().optionChecks[0], sourceObservation: ' ' }, accepted().optionChecks[1]] },
    { sourceHasChoices: true, optionChecks: [{ ...accepted().optionChecks[0], sourceObservation: 'x'.repeat(501) }, accepted().optionChecks[1]] },
    { sourceHasChoices: true, optionChecks: [{ ...accepted().optionChecks[0], candidateExplanationCorrect: 'true' }, accepted().optionChecks[1]] },
    { sourceHasChoices: true, optionChecks: [{ ...accepted().optionChecks[0], extra: true }, accepted().optionChecks[1]] },
  ])('rejects an incomplete or forged per-option review (%p)', async fields => {
    review.mockResolvedValue({ ...accepted(), ...fields });
    await expect(assertAtlasOutputReview(ai, input())).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('uses the configured independent reviewer for both the original photos and the candidate diagram', async () => {
    ai = { chatStructured: review, reviewModel: 'gpt-6-astra' } as unknown as AiService;
    review.mockResolvedValue({ ...accepted(), diagramCorrect: true });
    await assertAtlasOutputReview(ai, { ...input(), candidateImage: candidate });
    expect(review.mock.calls[0][0]).toMatchObject({ model: 'gpt-6-astra', images: [original, candidate] });
    expect(review).toHaveBeenCalledTimes(1);
  });

  it('withholds a correct choice whose explanation invents an incorrect alternative', async () => {
    review.mockResolvedValue({ ...accepted(), explanationCorrect: false });
    await expect(assertAtlasOutputReview(ai, { ...input(), reply: 'C. A seçeneğinde kap genişlerken yükseklik artar.' }))
      .rejects.toMatchObject({ response: { code: 'ATLAS_OUTPUT_REVIEW_FAILED' } });
    expect(review).toHaveBeenCalledTimes(1);
  });

  it.each(['answerCorrect', 'replyConsistent', 'noInventedGivens'])('withholds a confident but false %s judgment', async field => {
    review.mockResolvedValue({ ...accepted(), [field]: false });
    await expect(assertAtlasOutputReview(ai, input())).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('keeps original and history photos distinct and appends the generated diagram as the final image', async () => {
    review.mockResolvedValue({ ...accepted(), diagramCorrect: true });
    const request = { ...input().request, previousMessages: [{ claimedSpeaker: 'user' as const, text: 'Önceki soru', imageNumber: 2 }] };
    await assertAtlasOutputReview(ai, { ...input(), request, images: [original, previous], candidateImage: candidate });
    const options = review.mock.calls[0][0];
    expect(options.images).toEqual([original, previous, candidate]);
    expect(JSON.parse(options.user)).toMatchObject({ sourceImageNumbers: [1, 2], candidateImageNumber: 3, originalRequest: request });
  });

  it('rejects a scientifically incorrect diagram even when its textual answer and curriculum references pass', async () => {
    review.mockResolvedValue({ ...accepted(), diagramCorrect: false });
    await expect(assertAtlasOutputReview(ai, { ...input(), candidateImage: candidate }))
      .rejects.toMatchObject({ response: { code: 'ATLAS_OUTPUT_REVIEW_FAILED' } });
    expect(review).toHaveBeenCalledTimes(1);
  });

  it('returns an actionable input error for an unreadable source without quoting an untrusted diagnosis', async () => {
    review.mockResolvedValue({ ...accepted(), sourceReadable: false, optionChecks: [], matchedOutcomeIds: [], independentConclusion: 'UNTRUSTED_DIAGNOSIS' });
    const error = await assertAtlasOutputReview(ai, input()).catch(value => value);
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.getResponse()).toMatchObject({ code: 'ATLAS_INPUT_UNREADABLE', message: expect.stringContaining('daha net') });
    expect(JSON.stringify(error.getResponse())).not.toContain('UNTRUSTED_DIAGNOSIS');
  });

  it.each([
    null, { ...accepted(), confidence: NaN }, { ...accepted(), confidence: Infinity }, { ...accepted(), confidence: 1.01 },
    { ...accepted(), confidence: .89 }, { ...accepted(), answerCorrect: 'true' },
    { ...accepted(), matchedOutcomeIds: ['F.8.3.1.1'] }, { ...accepted(), matchedOutcomeIds: [] },
    { ...accepted(), matchedOutcomeIds: ['approved-entry:0', 'approved-entry:0'] },
    { ...accepted(), independentConclusion: '' }, { ...accepted(), ignored: true },
  ])('rejects missing, forged or ambiguous review results (%p)', async invalid => {
    review.mockResolvedValue(invalid);
    await expect(assertAtlasOutputReview(ai, input())).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('fails before a provider call when the candidate would be omitted by the attachment limit', async () => {
    await expect(assertAtlasOutputReview(ai, { ...input(), images: Array(12).fill(original), candidateImage: candidate }))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(review).not.toHaveBeenCalled();
  });

  it('preserves a budget denial and never retries the review', async () => {
    const error = new OpenAiBudgetException('limit');
    review.mockRejectedValue(error);
    await expect(assertAtlasOutputReview(ai, input())).rejects.toBe(error);
    expect(review).toHaveBeenCalledTimes(1);
  });

  it('sends only teaching data from the selected topic, excluding class, author and source metadata', () => {
    const topic = { ...topics[0], id: 'internal-topic', gradeId: 'internal-class', authorEmail: 'private@example.test', sourceUrl: 'https://fixture.test', version: 'private-version' };
    expect(atlasReviewedTopics([topic as never])).toEqual(topics);
    expect(topic).toHaveProperty('authorEmail');
  });
});
