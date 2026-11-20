import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import sharp from 'sharp';
import type { AiService } from '../gamification/ai.service';
import { OpenAiBudgetException } from '../gamification/openai-budget.service';
import { atlasPressureGeometry, createAtlasDiagramFactory, renderAtlasPressureDiagram } from './atlas-ai.diagrams';
import type { AtlasDiagramFactory, AtlasReviewedTopic } from './atlas-ai.output-review';

const approvedTopics: AtlasReviewedTopic[] = [{ name: 'Basınç', subject: 'Fen Bilimleri', gradeLevel: 8,
  outcomes: [{ id: 'approved-pressure:0', code: 'TEST.1', text: 'Sıvı basıncını etkileyen değişkenleri açıklar. Matematiksel bağıntılara girilmez.' }] }];
const sourceImage = 'data:image/png;base64,c3ludGhldGljLXF1ZXN0aW9u';
const input = () => ({
  request: { message: 'Sabit miktarda sıvı olan kabın basınç grafiğini çiz.', imageNumber: 1, previousMessages: [], additionalImageNumbers: [] },
  images: [sourceImage], approvedTopics,
});
const accepted = () => ({
  kind: 'supported', sourceReadable: true, confidence: .99,
  conditions: { sameFluid: true, constantAmount: true, constantDensity: true, constantGravity: true,
    fixedBase: true, fixedOppositeWall: true, singleMovingWall: true, noSpill: true,
    pressureAtFixedBottom: true, qualitativeGraph: true },
  numericCalculationRequired: false, stages: ['vertical', 'outward', 'inward'],
  hasOptions: true, optionsReadable: true,
  options: [
    { letter: 'A', trend: 'decrease-then-increase', minimum: 'zero', finalLevel: 'above-start' },
    { letter: 'B', trend: 'increasing', minimum: 'positive', finalLevel: 'above-start' },
    { letter: 'D', trend: 'decrease-then-increase', minimum: 'positive', finalLevel: 'above-start' },
  ],
});

describe('Deterministic liquid-pressure diagrams', () => {
  let extraction: jest.Mock;
  let factory: AtlasDiagramFactory;
  beforeEach(() => {
    extraction = jest.fn().mockResolvedValue(accepted());
    factory = createAtlasDiagramFactory({ chatStructured: extraction } as unknown as AiService);
  });

  it('preserves equal liquid quantity with non-spilling geometry and the correct height order', () => {
    const shapes = atlasPressureGeometry();
    expect(shapes.map(shape => shape.height)).toEqual([150, 120, 180]);
    for (const shape of shapes) {
      // Independently integrate the trapezoidal blue region and measure both walls.
      const area = (shape.base + shape.surfaceWidth) * shape.height / 2;
      expect(area).toBeCloseTo(24_000, 7);
      expect(shape.surfaceWidth).toBeCloseTo(shape.base + shape.slope * shape.height, 8);
      expect(Math.hypot(shape.rightWallHeight, shape.rightWallHeight * shape.slope)).toBeCloseTo(210, 8);
      expect(shape.height).toBeGreaterThan(0);
      expect(shape.height).toBeLessThan(shape.rightWallHeight);
      expect(shape.height).toBeLessThan(shape.wallLength);
    }
    expect(shapes[1].height).toBeLessThan(shapes[0].height);
    expect(shapes[2].height).toBeGreaterThan(shapes[0].height);
  });

  it('renders the blue liquid quantities equally and keeps the pressure minimum visibly above the zero axis', async () => {
    const png = await renderAtlasPressureDiagram();
    expect(png.subarray(0, 8)).toEqual(Buffer.from('89504e470d0a1a0a', 'hex'));
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height, info.channels]).toEqual([1600, 1470, 3]);
    const bluePixels = (left: number, top: number, right: number, bottom: number) => {
      let count = 0;
      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
        const offset = (y * info.width + x) * info.channels;
        const r = data[offset], g = data[offset + 1], b = data[offset + 2];
        if (b > 150 && g > r + 30 && b > g + 10) count++;
      }
      return count;
    };
    const areas = [50, 575, 1100].map(left => bluePixels(left, 380, left + 450, 680));
    expect(Math.min(...areas)).toBeGreaterThan(25_000);
    expect(Math.max(...areas) / Math.min(...areas)).toBeLessThan(1.03);
    expect(bluePixels(775, 1045, 825, 1070)).toBeGreaterThan(20);
    expect(bluePixels(775, 1180, 825, 1200)).toBe(0);
  });

  it('extracts from the original photo and selects the actual matching letter without hard-coded C', async () => {
    const result = await factory(input());
    expect(result?.reply).toContain('Doğru seçenek D.');
    expect(result?.reply).toContain('h2 < h1 < h3');
    expect(result?.reply).toContain('P2 < P1 < P3');
    expect(result?.reply).toContain('sıfırdan büyüktür');
    expect(result?.reply).not.toMatch(/ρ|rho|P\s*=|\b(?:160|24000|210|150|120|180)\b/);
    expect(result?.reply).toContain('soruda verilen sayısal değerler değildir');
    expect(result?.generatedImage.dataUrl).toMatch(/^data:image\/png;base64,/);
    const [options, schema, name] = extraction.mock.calls[0];
    expect(name).toBe('atlas_pressure_diagram_source');
    expect(options.images).toEqual([sourceImage]);
    expect(JSON.parse(options.user)).toMatchObject({ originalRequest: input().request, approvedTopics });
    expect(schema.properties.stages.items.enum).toEqual(['vertical', 'outward', 'inward']);
    expect(extraction).toHaveBeenCalledTimes(1);
  });

  it('does not invent an answer letter when the source has no options', async () => {
    extraction.mockResolvedValue({ ...accepted(), hasOptions: false, options: [] });
    const result = await factory(input());
    expect(result?.reply).not.toMatch(/Doğru seçenek|\b[A-E]\./);
    expect(result?.generatedImage.alt).not.toContain('harf');
  });

  it.each([.9, .94])('accepts a fully verified source extraction at confidence %s for later independent output review', async confidence => {
    extraction.mockResolvedValue({ ...accepted(), confidence });
    const result = await factory(input());
    expect(result?.reply).toContain('Doğru seçenek D.');
    expect(result?.generatedImage.dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(extraction).toHaveBeenCalledTimes(1);
  });

  it('does not call extraction for an unapproved pressure scope or a different image intent', async () => {
    expect(await factory({ ...input(), approvedTopics: [] })).toBeNull();
    expect(await factory({ ...input(), approvedTopics: [{ ...approvedTopics[0], gradeLevel: 7 }] })).toBeNull();
    expect(await factory({ ...input(), approvedTopics: [{ name: 'Kesirler', subject: 'Matematik', gradeLevel: 8,
      outcomes: [{ id: 'math:0', code: 'TEST.2', text: 'Kesirleri karşılaştırır.' }] }] })).toBeNull();
    expect(extraction).not.toHaveBeenCalled();
  });

  it('returns null for a confidently unsupported question without overriding a source condition', async () => {
    extraction.mockResolvedValue({ ...accepted(), kind: 'unsupported', stages: [] });
    expect(await factory(input())).toBeNull();
    extraction.mockResolvedValue({ ...accepted(), conditions: { ...accepted().conditions, noSpill: false } });
    expect(await factory(input())).toBeNull();
    extraction.mockResolvedValue({ ...accepted(), numericCalculationRequired: true });
    expect(await factory(input())).toBeNull();
    extraction.mockResolvedValue({ ...accepted(), stages: ['vertical', 'inward', 'outward'] });
    expect(await factory(input())).toBeNull();
  });

  it('declines an unsupported diagram even when its specialized source data is unreadable or uncertain', async () => {
    extraction.mockResolvedValue({ ...accepted(), kind: 'unsupported', confidence: 0,
      sourceReadable: false, optionsReadable: false, hasOptions: false, stages: [], options: [] });
    expect(await factory(input())).toBeNull();
    expect(extraction).toHaveBeenCalledTimes(1);
  });

  it('does not let an unsupported label bypass the extraction schema', async () => {
    const incomplete = { kind: 'unsupported', sourceReadable: false, confidence: 0 };
    extraction.mockResolvedValue(incomplete);
    await expect(factory(input())).rejects.toBeInstanceOf(ServiceUnavailableException);
    extraction.mockResolvedValue({ ...accepted(), kind: 'unsupported', confidence: NaN });
    await expect(factory(input())).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it.each([
    { ...accepted(), confidence: .899 },
    { ...accepted(), sourceReadable: false },
  ])('requests a clear upright source photo without falling back or lowering the confidence threshold', async unreadable => {
    extraction.mockResolvedValue(unreadable);
    const error = await factory(input()).catch(value => value);
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.getStatus()).toBe(400);
    expect(error.getResponse()).toMatchObject({
      code: 'ATLAS_INPUT_UNREADABLE',
      message: 'Soruyu dik konuma getirip metin, şekil ve seçeneklerin net göründüğü bir fotoğrafla yeniden dene.',
    });
    expect(extraction).toHaveBeenCalledTimes(1);
  });

  it.each([
    null, { ...accepted(), confidence: NaN },
    { ...accepted(), confidence: 1.01 },
    { ...accepted(), stages: ['vertical', 'outward'] }, { ...accepted(), stages: ['vertical', 'outward', 'inward', 'vertical'] },
    { ...accepted(), conditions: { ...accepted().conditions, sameFluid: 'true' } },
    { ...accepted(), optionsReadable: false }, { ...accepted(), options: [{ ...accepted().options[2], letter: '<svg>' }] },
    { ...accepted(), options: [accepted().options[2], accepted().options[2]] },
    { ...accepted(), options: [accepted().options[2], { ...accepted().options[2], letter: 'E' }] },
    { ...accepted(), extra: 'untrusted' },
  ])('fails closed for malformed, unreadable, low-confidence or ambiguous extraction (%p)', async invalid => {
    extraction.mockResolvedValue(invalid);
    await expect(factory(input())).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(extraction).toHaveBeenCalledTimes(1);
  });

  it('preserves a shared budget denial without retrying or generating another picture', async () => {
    const denial = new OpenAiBudgetException('limit');
    extraction.mockRejectedValue(denial);
    await expect(factory(input())).rejects.toBe(denial);
    expect(extraction).toHaveBeenCalledTimes(1);
  });
});
