import path from 'path';
import { fileURLToPath } from 'url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { createInternalAuthInterceptor } from '../../../common/src/grpc/internal-auth.interceptor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.resolve(__dirname, '../../../common/protos/order.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition);
const orderProto = proto.tasty.order.v1;

const toAuth = (context = {}) => ({
  userId: context.userId,
  roles: context.roles || [],
  status: context.status || 'ACTIVE',
});

export const startGrpcServer = async ({ orderService, logger, internalServiceSecret, port = 50052 }) => {
  const server = new grpc.Server();
  const { withInternalAuth } = createInternalAuthInterceptor({
    internalServiceSecret,
    logger,
  });

  server.addService(orderProto.OrderService.service, {
    CreateOrder: withInternalAuth(async (call, callback, context) => {
      try {
        const req = call.request;
        const payload = {
          restaurantId: req.restaurant_id,
          orderType: req.order_type,
          paymentMethod: req.payment_method,
          restaurantSnapshot: {
            name: req.restaurant_snapshot?.name,
            slug: req.restaurant_snapshot?.slug || null,
            citySlug: req.restaurant_snapshot?.city_slug || null,
            version: req.restaurant_snapshot?.version || 1,
            taxRate: req.restaurant_snapshot?.tax_rate || 0,
            serviceFee: req.restaurant_snapshot?.service_fee || 0,
            currency: req.restaurant_snapshot?.currency || 'USD',
          },
          fulfillment: {
            mode: req.fulfillment?.mode,
            deliveryAddress: req.fulfillment?.delivery_address || null,
            tableRef: req.fulfillment?.table_ref || null,
            scheduledAt: req.fulfillment?.scheduled_at || null,
          },
          items: (req.items || []).map((item) => ({
            menuItemId: item.menu_item_id,
            name: item.name,
            unitPrice: item.unit_price,
            quantity: item.quantity,
          })),
        };

        const created = await orderService.createOrder(toAuth(context), payload, {
          correlationId: context.correlationId || context.requestId || null,
          causationId: context.requestId || null,
        });

        callback(null, {
          success: true,
          message: 'order_created',
          order_id: String(created._id || created.id || ''),
          order_status: created.orderStatus || '',
          payment_status: created.payment?.status || '',
          qr_token: created.qrToken || '',
        });
      } catch (error) {
        logger?.error({ err: error }, 'grpc_create_order_failed');
        callback(null, { success: false, message: error.message || 'create_order_failed' });
      }
    }, { requireUser: true }),

    MarkDriverArrived: withInternalAuth(async (call, callback, context) => {
      try {
        const req = call.request;
        const updated = await orderService.markDriverArrived(
          req.order_id,
          toAuth(context),
          {
            phoneNumber: req.phone_number || null,
            pushToken: req.push_token || null,
            idNumberMasked: req.id_number_masked || 'UNKNOWN',
            debtAmount: req.debt_amount || 0,
          },
          {
            correlationId: context.correlationId || context.requestId || null,
            causationId: context.requestId || null,
          }
        );

        callback(null, {
          success: true,
          message: 'driver_arrived_recorded',
          order_id: String(updated._id || updated.id || ''),
          order_status: updated.orderStatus || '',
          payment_status: updated.payment?.status || '',
        });
      } catch (error) {
        logger?.error({ err: error }, 'grpc_mark_driver_arrived_failed');
        callback(null, { success: false, message: error.message || 'mark_driver_arrived_failed' });
      }
    }, { requireUser: true }),
  });

  await new Promise((resolve, reject) => {
    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (error) => {
        if (error) {
          reject(error);
          return;
        }
        server.start();
        resolve();
      }
    );
  });

  logger?.info({ grpcPort: port }, 'order_grpc_server_started');
  return server;
};
