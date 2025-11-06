import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { WhatsAppService } from '../src/whatsapp/whatsapp.service';

describe('E2E (App)', () => {
  let app: INestApplication;

  // Mock del servicio para no inicializar cliente real
  const mockClient = {
    getChats: jest.fn().mockResolvedValue([
      {
        isGroup: true,
        id: { _serialized: '1@g.us' },
        name: 'Grupo 1',
        participants: [{}, {}],
        getInviteCode: jest.fn().mockResolvedValue('INV123'), // opcional
      },
      { isGroup: false, id: { _serialized: '123@c.us' }, name: 'Juan' }, // será filtrado
    ]),
  };

  // Mock del servicio WhatsApp usado por NotificationsService
  const mockWhatsAppService = {
    getQR: jest.fn().mockReturnValue({ qrReady: true, latestQR: 'data:image/png;base64,ZZZ' }),
    maybeReinit: jest.fn().mockResolvedValue(mockClient),
    getClient: jest.fn().mockReturnValue(mockClient), // por si tu controller lo usa en otro endpoint
    mediaFromUrl: jest.fn(),  // por si alguna ruta lo usa
    mediaFromFile: jest.fn(), // por si alguna ruta lo usa
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(WhatsAppService)
      .useValue(mockWhatsAppService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api'); // igual que en main.ts
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/whatsapp/start-session (GET)', async () => {
    const res = await request(app.getHttpServer()).get('/api/whatsapp/start-session').expect(200);
    expect(res.body.qr).toBe('data:image/png;base64,ZZZ');
  });

  it('/api/notifications/groups (GET)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/notifications/groups')
      .expect(200);

    expect(res.body.count).toBe(1);
    expect(res.body.groups[0].id).toBe('1@g.us');
    expect(mockWhatsAppService.maybeReinit).toHaveBeenCalled();
    expect(mockClient.getChats).toHaveBeenCalled();
  });
});
