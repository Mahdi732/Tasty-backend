/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Authentication and profile flows through userService.
 *   - name: Order
 *     description: Order flows through orderService.
 *   - name: Restaurant
 *     description: ETA estimation through restaurantService.
 *   - name: Payment
 *     description: Subscription and order payments through paymentService.
 *   - name: Face Recognition
 *     description: Face checks through faceRecognitionService.
 */

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user account.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, phoneNumber]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 12 }
 *               phoneNumber: { type: string, example: "+201234567890" }
 *               nickname: { type: string, example: "ChefNeo" }
 *               deviceId: { type: string, example: "ios-17-pro-max" }
 *     responses:
 *       201:
 *         description: User registered.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccessEnvelope'
 *       400:
 *         description: Invalid payload or business validation failure.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 */

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate and obtain tokens.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               deviceId: { type: string }
 *     responses:
 *       200:
 *         description: Authenticated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     access_token: { type: string }
 *                     refresh_token: { type: string }
 *                     user_id: { type: string }
 *                     email: { type: string }
 *       401:
 *         description: Invalid credentials.
 */

/**
 * @openapi
 * /api/v1/auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile found.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Profile not found.
 */

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile (alias of /auth/profile).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile found.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Profile not found.
 */

/**
 * @openapi
 * /api/v1/auth/logout-all:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke all user sessions (optionally except current).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               exceptCurrentSession: { type: boolean, default: true }
 *     responses:
 *       200:
 *         description: Sessions revoked.
 */

/**
 * @openapi
 * /api/v1/auth/sessions:
 *   get:
 *     tags: [Auth]
 *     summary: List active sessions for current user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sessions returned.
 */

/**
 * @openapi
 * /api/v1/auth/sessions/{sessionId}:
 *   delete:
 *     tags: [Auth]
 *     summary: Revoke a specific session.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session revoked.
 */

/**
 * @openapi
 * /api/v1/auth/oauth/{provider}/start:
 *   get:
 *     tags: [Auth]
 *     summary: Start OAuth authorization flow.
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, facebook]
 *       - in: query
 *         name: mode
 *         schema:
 *           type: string
 *           enum: [login, link]
 *           default: login
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [web, mobile, desktop, android, ios]
 *           default: web
 *       - in: query
 *         name: appRedirect
 *         schema:
 *           type: string
 *           format: uri
 *     responses:
 *       200:
 *         description: OAuth authorization URL generated.
 */

/**
 * @openapi
 * /api/v1/auth/oauth/link/{provider}:
 *   post:
 *     tags: [Auth]
 *     summary: Start OAuth account-link flow.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, facebook]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               platform:
 *                 type: string
 *                 enum: [web, mobile, desktop, android, ios]
 *                 default: web
 *               appRedirect:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: OAuth link authorization URL generated.
 */

/**
 * @openapi
 * /api/v1/auth/oauth/unlink/{provider}:
 *   delete:
 *     tags: [Auth]
 *     summary: Unlink OAuth provider from current account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, facebook]
 *     responses:
 *       200:
 *         description: Provider unlinked.
 */

/**
 * @openapi
 * /api/v1/auth/email/start-verification:
 *   post:
 *     tags: [Auth]
 *     summary: Send email OTP verification code.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Verification code sent.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     sent: { type: boolean }
 *                     code:
 *                       type: string
 *                       description: Present only when EXPOSE_VERIFICATION_CODES is enabled in development.
 */

/**
 * @openapi
 * /api/v1/auth/email/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Verify email using OTP code.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email: { type: string, format: email }
 *               code: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: Email verified.
 */

/**
 * @openapi
 * /api/v1/auth/phone/start-verification:
 *   post:
 *     tags: [Auth]
 *     summary: Send phone OTP verification code.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber]
 *             properties:
 *               phoneNumber: { type: string, example: "+201234567890" }
 *     responses:
 *       200:
 *         description: Phone verification code sent.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     sent: { type: boolean }
 *                     code:
 *                       type: string
 *                       description: Present only when EXPOSE_VERIFICATION_CODES is enabled in development.
 */

/**
 * @openapi
 * /api/v1/auth/phone/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Verify phone using OTP code.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber, code]
 *             properties:
 *               phoneNumber: { type: string, example: "+201234567890" }
 *               code: { type: string, example: "1234" }
 *     responses:
 *       200:
 *         description: Phone verified.
 */

/**
 * @openapi
 * /api/v1/activate-account:
 *   post:
 *     tags: [Auth]
 *     summary: Complete face and id-card activation for account.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idCardImageBase64, imageBase64]
 *             properties:
 *               idCardImageBase64: { type: string }
 *               imageBase64: { type: string }
 *     responses:
 *       200:
 *         description: Account activation completed.
 */

/**
 * @openapi
 * /api/v1/orders:
 *   post:
 *     tags: [Order]
 *     summary: Create an order.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [restaurantId, orderType, paymentMethod, items]
 *             properties:
 *               restaurantId: { type: string }
 *               orderType: { type: string, example: DELIVERY }
 *               paymentMethod: { type: string, example: CASH }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [menuItemId, name, unitPrice, quantity]
 *                   properties:
 *                     menuItemId: { type: string }
 *                     name: { type: string }
 *                     unitPrice: { type: number, format: float }
 *                     quantity: { type: integer }
 *     responses:
 *       201:
 *         description: Order created.
 *       400:
 *         description: Invalid order or business rule failure.
 *       401:
 *         description: Unauthorized.
 */

/**
 * @openapi
 * /api/v1/orders/{orderId}/driver-arrived:
 *   post:
 *     tags: [Order]
 *     summary: Mark driver as arrived and start enforcement timer.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber: { type: string }
 *               pushToken: { type: string }
 *               idNumberMasked: { type: string, example: "****1234" }
 *               debtAmount: { type: number, format: float }
 *     responses:
 *       200:
 *         description: Driver arrival accepted.
 *       400:
 *         description: Validation failure.
 */

/**
 * @openapi
 * /api/v1/payments/subscribe:
 *   post:
 *     tags: [Payment]
 *     summary: Create a subscription payment and emit payment.subscription.success.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, restaurantId, planId]
 *             properties:
 *               userId: { type: string }
 *               restaurantId: { type: string }
 *               planId: { type: string }
 *               amount: { type: number, format: float }
 *               currency: { type: string, example: USD }
 *               payment:
 *                 type: object
 *                 properties:
 *                   type: { type: string, example: CARD }
 *                   token: { type: string }
 *                   maskedPan: { type: string, example: "**** **** **** 4242" }
 *                   brand: { type: string, example: VISA }
 *     responses:
 *       201:
 *         description: Payment accepted and processed.
 *       400:
 *         description: Invalid payload.
 */

/**
 * @openapi
 * /api/v1/payments/order:
 *   post:
 *     tags: [Payment]
 *     summary: Create an order payment and emit payment.order.success.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, orderId, amount]
 *             properties:
 *               userId: { type: string }
 *               orderId: { type: string }
 *               amount: { type: number, format: float }
 *               currency: { type: string, example: USD }
 *               payment:
 *                 type: object
 *                 properties:
 *                   type: { type: string, example: CARD }
 *                   token: { type: string }
 *                   maskedPan: { type: string, example: "**** **** **** 4242" }
 *                   brand: { type: string, example: VISA }
 *     responses:
 *       201:
 *         description: Payment accepted and processed.
 *       400:
 *         description: Invalid payload.
 */

/**
 * @openapi
 * /api/v1/restaurants:
 *   get:
 *     tags: [Restaurant]
 *     summary: List public restaurants.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: citySlug
 *         schema: { type: string }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Public restaurants returned.
 *   post:
 *     tags: [Restaurant]
 *     summary: Create restaurant (manager/superadmin).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Restaurant created.
 *       403:
 *         description: Role/status verification failed.
 */

/**
 * @openapi
 * /api/v1/restaurants/{citySlug}/{slug}:
 *   get:
 *     tags: [Restaurant]
 *     summary: Get public restaurant details by city and slug.
 *     parameters:
 *       - in: path
 *         name: citySlug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Restaurant details returned.
 *       404:
 *         description: Restaurant not found.
 */

/**
 * @openapi
 * /api/v1/restaurants/{citySlug}/{slug}/menu:
 *   get:
 *     tags: [Restaurant]
 *     summary: Get public menu projection for a restaurant.
 *     parameters:
 *       - in: path
 *         name: citySlug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeOutOfStock
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: Menu projection returned.
 *       404:
 *         description: Menu not available.
 */

/**
 * @openapi
 * /api/v1/restaurants/{citySlug}/{slug}/estimate-delivery-time:
 *   post:
 *     tags: [Restaurant]
 *     summary: Estimate delivery time.
 *     parameters:
 *       - in: path
 *         name: citySlug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemIds:
 *                 type: array
 *                 items: { type: string }
 *               distanceKm: { type: number, format: float }
 *               averageSpeedKmph: { type: number, format: float }
 *     responses:
 *       200:
 *         description: ETA calculated.
 */

/**
 * @openapi
 * /api/v1/face/compare-id:
 *   post:
 *     tags: [Face Recognition]
 *     summary: Compare ID card photo with live photo.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idCardImageBase64, liveImageBase64]
 *             properties:
 *               idCardImageBase64: { type: string }
 *               liveImageBase64: { type: string }
 *               tenantId: { type: string, example: global }
 *     responses:
 *       200:
 *         description: Face comparison completed.
 *       400:
 *         description: Comparison failure.
 */

export const documentedPaths = true;
