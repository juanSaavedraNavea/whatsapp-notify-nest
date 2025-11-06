import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppController } from '../../src/whatsapp/whatsapp.controller';
import { WhatsAppService } from '../../src/whatsapp/whatsapp.service';

describe('WhatsAppController', () => {
  let controller: WhatsAppController;
  let service: WhatsAppService;

  const mockWhatsAppService = {
    getQR: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsAppController],
      providers: [
        { provide: WhatsAppService, useValue: mockWhatsAppService },
      ],
    }).compile();

    controller = module.get<WhatsAppController>(WhatsAppController);
    service = module.get<WhatsAppService>(WhatsAppService);
    jest.clearAllMocks();
  });

  it('start-session → devuelve QR cuando está listo', async () => {
    (service.getQR as jest.Mock).mockReturnValue({ qrReady: true, latestQR: 'data:image/png;base64,AAA' });

    const res = await controller.startSession();
    expect(res).toEqual({
      message: 'Escanea este QR para iniciar sesión',
      qr: 'data:image/png;base64,AAA',
    });
  });

  it('start-session → QR aún no generado', async () => {
    (service.getQR as jest.Mock).mockReturnValue({ qrReady: false, latestQR: null });

    const res = await controller.startSession();
    expect(res).toEqual({ message: 'QR aún no generado' });
  });
});
