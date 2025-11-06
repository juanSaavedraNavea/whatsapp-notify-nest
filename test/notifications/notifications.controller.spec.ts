import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from '../../src/notifications/notifications.controller';
import { NotificationsService } from '../../src/notifications/notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  const mockService = {
    startSessionQR: jest.fn(),
    sendCod: jest.fn(),
    listGroups: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: mockService }],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it('start-session → devuelve QR o mensaje', async () => {
    mockService.startSessionQR.mockResolvedValue({ qrReady: true, latestQR: 'data:image/png;base64,BBB' });

    const resOK = await controller.startSession();
    expect(resOK).toEqual({ message: 'Escanea este QR para iniciar sesión', qr: 'data:image/png;base64,BBB' });

    mockService.startSessionQR.mockResolvedValue({ qrReady: false, latestQR: null });

    const resNoQR = await controller.startSession();
    expect(resNoQR).toEqual({ message: 'QR aún no generado' });
  });

  it('send → llama al service con cod y alert', async () => {
    mockService.sendCod.mockResolvedValue({ message: 'La notificación fue enviada con éxito' });

    const res = await controller.send({ cod: 'T02', alert: false });
    expect(service.sendCod).toHaveBeenCalledWith('T02', false);
    expect(res).toEqual({ message: 'La notificación fue enviada con éxito' });
  });

  it('groups → sin invite code', async () => {
    (service.listGroups as jest.Mock).mockResolvedValue([{ id: '123@g.us', name: 'Grupo' }]);

    const res = await controller.listGroups(undefined);
    expect(service.listGroups).toHaveBeenCalledWith({ includeInviteCode: false });
    expect(res).toEqual({ count: 1, groups: [{ id: '123@g.us', name: 'Grupo' }] });
  });

  it('groups → con invite=true', async () => {
    (service.listGroups as jest.Mock).mockResolvedValue([{ id: '123@g.us', name: 'Grupo', inviteCode: 'ABC' }]);

    const res = await controller.listGroups('true');
    expect(service.listGroups).toHaveBeenCalledWith({ includeInviteCode: true });
    expect(res.count).toBe(1);
    expect(res.groups[0].inviteCode).toBe('ABC');
  });

});
