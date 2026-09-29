import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getConnectionToken } from '@nestjs/mongoose';

describe('AppController', () => {
  let appController: AppController;
  const connection = { readyState: 1 };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: getConnectionToken(), useValue: connection }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('reports database connectivity without requiring a live database', () => {
    connection.readyState = 1;
    expect(appController.getHealth()).toMatchObject({ status: 'ok', database: 'connected' });
    connection.readyState = 0;
    expect(appController.getHealth()).toMatchObject({ status: 'degraded', database: 'disconnected' });
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
