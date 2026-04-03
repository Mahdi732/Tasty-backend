import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { RestaurantModel } from '../src/models/restaurant.model.js';
import { RestaurantUserModel } from '../src/models/restaurant-user.model.js';
import { MenuCategoryModel } from '../src/models/menu-category.model.js';
import { MenuItemModel } from '../src/models/menu-item.model.js';
import { PublicMenuProjectionModel } from '../src/models/public-menu-projection.model.js';
import {
  ACTIVATION_BLOCKERS,
  RESTAURANT_STATUS,
  RESTAURANT_VISIBILITY,
  SUBSCRIPTION_STATUS,
  VERIFICATION_STATUS,
} from '../src/constants/restaurant.js';

dotenv.config();

const DEFAULT_RESTAURANT_MONGO_URI =
  'mongodb://tasty_restaurant_app:restaurant-app-pass-dev@localhost:27019/tasty_restaurant?authSource=tasty_restaurant';
const DEFAULT_USER_MONGO_URI =
  'mongodb://tasty_user_app:user-app-pass-dev@localhost:27017/tasty_user?authSource=tasty_user';

const args = process.argv.slice(2);

const readArg = (name) => {
  const index = args.indexOf(name);
  if (index === -1) {
    return '';
  }

  return String(args[index + 1] || '').trim();
};

const restaurantMongoUri = readArg('--mongo-uri') || process.env.MONGO_URI || DEFAULT_RESTAURANT_MONGO_URI;
const userMongoUri = readArg('--user-mongo-uri') || process.env.SEED_USER_MONGO_URI || DEFAULT_USER_MONGO_URI;

const buildOpeningHours = () => ([
  { day: 'MONDAY', open: '10:00', close: '23:00', isClosed: false },
  { day: 'TUESDAY', open: '10:00', close: '23:00', isClosed: false },
  { day: 'WEDNESDAY', open: '10:00', close: '23:00', isClosed: false },
  { day: 'THURSDAY', open: '10:00', close: '23:00', isClosed: false },
  { day: 'FRIDAY', open: '10:00', close: '00:00', isClosed: false },
  { day: 'SATURDAY', open: '10:00', close: '00:00', isClosed: false },
  { day: 'SUNDAY', open: '11:00', close: '22:00', isClosed: false },
]);

const menuBlueprint = [
  {
    name: 'Signature Meals',
    description: 'Most loved chef creations.',
    sortOrder: 1,
    items: [
      {
        name: 'Smoky Beef Burger',
        description: 'Angus patty, smoked cheddar, caramelized onions.',
        basePrice: 165,
        averagePrepTime: 18,
        tags: ['burger', 'best-seller'],
        allergens: ['gluten', 'dairy'],
      },
      {
        name: 'Crispy Chicken Ranch',
        description: 'Crunchy chicken breast, ranch slaw, pickles.',
        basePrice: 148,
        averagePrepTime: 16,
        tags: ['chicken'],
        allergens: ['gluten', 'egg'],
      },
    ],
  },
  {
    name: 'Sides & Drinks',
    description: 'Perfect add-ons for every order.',
    sortOrder: 2,
    items: [
      {
        name: 'Truffle Fries',
        description: 'Hand-cut fries with truffle seasoning.',
        basePrice: 62,
        averagePrepTime: 10,
        tags: ['side'],
        allergens: [],
      },
      {
        name: 'Fresh Lemon Mint',
        description: 'Freshly squeezed lemon with mint leaves.',
        basePrice: 45,
        averagePrepTime: 5,
        tags: ['drink'],
        allergens: [],
      },
    ],
  },
];

const restaurants = [
  {
    name: 'Flame Burger District',
    slug: 'flame-burger-district',
    description: 'Premium smash burgers and loaded fries with fast delivery.',
    logoUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
    contact: { phone: '+201012340001', email: 'flame@tasty.local' },
    location: {
      city: 'Cairo',
      citySlug: 'cairo',
      address: '24 Nile Corniche, Cairo',
      geo: { type: 'Point', coordinates: [31.2357, 30.0444] },
    },
    settings: {
      currency: 'EGP',
      taxRate: 0.14,
      serviceFee: 8,
      supportedOrderModes: ['delivery', 'pickup'],
    },
    status: RESTAURANT_STATUS.ACTIVE,
    visibility: RESTAURANT_VISIBILITY.PUBLIC,
    subscription: {
      status: SUBSCRIPTION_STATUS.ACTIVE,
      subscriptionPlanId: 'growth-monthly',
      providerCustomerId: 'cust_flame_001',
      providerSubscriptionId: 'sub_flame_001',
      currentPeriodEnd: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
    },
    verification: {
      status: VERIFICATION_STATUS.VERIFIED,
      reviewNotes: 'Verified by seed pipeline.',
    },
    activationBlockers: [],
    ownerEmail: 'manager@tasty.local',
  },
  {
    name: 'Sea Breeze Kitchen',
    slug: 'sea-breeze-kitchen',
    description: 'Coastal seafood bowls and grilled fish in a modern style.',
    logoUrl: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=600&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=1200&q=80',
    contact: { phone: '+201012340002', email: 'seabreeze@tasty.local' },
    location: {
      city: 'Alexandria',
      citySlug: 'alexandria',
      address: '19 El Geish Road, Alexandria',
      geo: { type: 'Point', coordinates: [29.9187, 31.2001] },
    },
    settings: {
      currency: 'EGP',
      taxRate: 0.14,
      serviceFee: 9,
      supportedOrderModes: ['delivery', 'pickup', 'reservation'],
    },
    status: RESTAURANT_STATUS.ACTIVE,
    visibility: RESTAURANT_VISIBILITY.PUBLIC,
    subscription: {
      status: SUBSCRIPTION_STATUS.ACTIVE,
      subscriptionPlanId: 'pro-monthly',
      providerCustomerId: 'cust_sea_001',
      providerSubscriptionId: 'sub_sea_001',
      currentPeriodEnd: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
    },
    verification: {
      status: VERIFICATION_STATUS.VERIFIED,
      reviewNotes: 'Verified by seed pipeline.',
    },
    activationBlockers: [],
    ownerEmail: 'manager@tasty.local',
  },
  {
    name: 'Green Bowl Lab',
    slug: 'green-bowl-lab',
    description: 'Healthy bowls with seasonal produce and balanced macros.',
    logoUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80',
    contact: { phone: '+201012340003', email: 'greenbowl@tasty.local' },
    location: {
      city: 'Giza',
      citySlug: 'giza',
      address: '8 Pyramids Street, Giza',
      geo: { type: 'Point', coordinates: [31.1313, 29.987] },
    },
    settings: {
      currency: 'EGP',
      taxRate: 0.14,
      serviceFee: 7,
      supportedOrderModes: ['delivery', 'pickup'],
    },
    status: RESTAURANT_STATUS.PENDING_SUBSCRIPTION,
    visibility: RESTAURANT_VISIBILITY.HIDDEN,
    subscription: {
      status: SUBSCRIPTION_STATUS.PENDING,
      subscriptionPlanId: 'starter-monthly',
      providerCustomerId: null,
      providerSubscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
    verification: {
      status: VERIFICATION_STATUS.VERIFIED,
      reviewNotes: 'Awaiting paid subscription.',
    },
    activationBlockers: [ACTIVATION_BLOCKERS.SUBSCRIPTION_INACTIVE],
    ownerEmail: 'manager@tasty.local',
  },
  {
    name: 'Midnight Pizza Studio',
    slug: 'midnight-pizza-studio',
    description: 'Late-night pizza and baked pasta with handmade sauces.',
    logoUrl: 'https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=600&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
    contact: { phone: '+201012340004', email: 'midnightpizza@tasty.local' },
    location: {
      city: 'Cairo',
      citySlug: 'cairo',
      address: '55 Abbas El Akkad, Nasr City',
      geo: { type: 'Point', coordinates: [31.3324, 30.0561] },
    },
    settings: {
      currency: 'EGP',
      taxRate: 0.14,
      serviceFee: 8,
      supportedOrderModes: ['delivery', 'pickup', 'preorder'],
    },
    status: RESTAURANT_STATUS.PENDING_VERIFICATION,
    visibility: RESTAURANT_VISIBILITY.HIDDEN,
    subscription: {
      status: SUBSCRIPTION_STATUS.ACTIVE,
      subscriptionPlanId: 'pro-monthly',
      providerCustomerId: 'cust_midnight_001',
      providerSubscriptionId: 'sub_midnight_001',
      currentPeriodEnd: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
    },
    verification: {
      status: VERIFICATION_STATUS.UNVERIFIED,
      reviewNotes: 'Pending compliance review.',
    },
    activationBlockers: [ACTIVATION_BLOCKERS.VERIFICATION_REQUIRED],
    ownerEmail: 'manager@tasty.local',
  },
  {
    name: 'Dokki Coffee Lab',
    slug: 'dokki-coffee-lab',
    description: 'Specialty coffee, pastries, and breakfast sandwiches.',
    logoUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80',
    contact: { phone: '+201012340005', email: 'coffee@tasty.local' },
    location: {
      city: 'Giza',
      citySlug: 'giza',
      address: '12 Tahrir Street, Dokki',
      geo: { type: 'Point', coordinates: [31.2066, 30.0384] },
    },
    settings: {
      currency: 'EGP',
      taxRate: 0.14,
      serviceFee: 6,
      supportedOrderModes: ['pickup'],
    },
    status: RESTAURANT_STATUS.ARCHIVED,
    visibility: RESTAURANT_VISIBILITY.HIDDEN,
    subscription: {
      status: SUBSCRIPTION_STATUS.CANCELED,
      subscriptionPlanId: 'starter-monthly',
      providerCustomerId: 'cust_dokki_001',
      providerSubscriptionId: 'sub_dokki_001',
      currentPeriodEnd: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: true,
    },
    verification: {
      status: VERIFICATION_STATUS.REJECTED,
      reviewNotes: 'Archived demo restaurant.',
    },
    activationBlockers: [
      ACTIVATION_BLOCKERS.SUBSCRIPTION_INACTIVE,
      ACTIVATION_BLOCKERS.VERIFICATION_REJECTED,
    ],
    ownerEmail: 'admin@tasty.local',
  },
];

const buildProjectionCategory = (category, items) => ({
  id: String(category._id),
  name: category.name,
  description: category.description,
  sortOrder: category.sortOrder,
  items: items.map((item) => ({
    id: String(item._id),
    name: item.name,
    description: item.description,
    images: item.images,
    basePrice: item.basePrice,
    averagePrepTime: item.averagePrepTime,
    currency: item.currency,
    availability: item.availability,
    tags: item.tags,
    allergens: item.allergens,
    optionGroups: [],
  })),
});

let userConnection;

try {
  await mongoose.connect(restaurantMongoUri, {
    maxPoolSize: 15,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
  });

  userConnection = await mongoose.createConnection(userMongoUri, {
    maxPoolSize: 5,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
  }).asPromise();

  const usersCollection = userConnection.collection('users');
  const neededEmails = [
    'admin@tasty.local',
    'manager@tasty.local',
    'staff@tasty.local',
    'chef@tasty.local',
    'delivery@tasty.local',
  ];

  const userDocs = await usersCollection.find({ email: { $in: neededEmails } }).toArray();
  const userIdByEmail = new Map(userDocs.map((doc) => [String(doc.email).toLowerCase(), String(doc._id)]));

  const missingUsers = neededEmails.filter((email) => !userIdByEmail.has(email));
  if (missingUsers.length) {
    throw new Error(
      `Missing seed users: ${missingUsers.join(', ')}. Run user service seed first (npm --workspace userService run seed:dev).`
    );
  }

  const now = new Date();
  const seededRestaurants = [];

  for (const seed of restaurants) {
    const ownerId = userIdByEmail.get(seed.ownerEmail);
    const updated = await RestaurantModel.findOneAndUpdate(
      {
        slug: seed.slug,
        'location.citySlug': seed.location.citySlug,
      },
      {
        $set: {
          name: seed.name,
          slug: seed.slug,
          description: seed.description,
          logoUrl: seed.logoUrl,
          coverUrl: seed.coverUrl,
          contact: seed.contact,
          location: seed.location,
          openingHours: buildOpeningHours(),
          settings: seed.settings,
          status: seed.status,
          visibility: seed.visibility,
          activationBlockers: seed.activationBlockers,
          subscription: seed.subscription,
          verification: {
            ...seed.verification,
            verifiedAt: seed.verification.status === VERIFICATION_STATUS.VERIFIED ? now : null,
            verifiedBy: seed.verification.status === VERIFICATION_STATUS.VERIFIED
              ? userIdByEmail.get('admin@tasty.local')
              : null,
          },
          publishRequestedAt: [RESTAURANT_STATUS.DRAFT, RESTAURANT_STATUS.ARCHIVED].includes(seed.status)
            ? null
            : now,
          activatedAt: seed.status === RESTAURANT_STATUS.ACTIVE ? now : null,
          suspendedAt: null,
          suspendedReason: null,
          archivedAt: seed.status === RESTAURANT_STATUS.ARCHIVED ? now : null,
          archivedBy: seed.status === RESTAURANT_STATUS.ARCHIVED ? ownerId : null,
          restoreFeeRequired: seed.status === RESTAURANT_STATUS.ARCHIVED,
          restoreFeePaidAt: null,
          deletedAt: null,
          createdBy: ownerId,
          updatedBy: ownerId,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    seededRestaurants.push(updated);
  }

  const primaryRestaurant = seededRestaurants.find((item) => item.slug === 'flame-burger-district');
  if (!primaryRestaurant) {
    throw new Error('Primary restaurant seed missing after upsert.');
  }

  const assignments = [];
  for (const restaurant of seededRestaurants) {
    const ownerEmail = restaurants.find((entry) => entry.slug === restaurant.slug)?.ownerEmail;
    if (ownerEmail) {
      assignments.push({
        userId: userIdByEmail.get(ownerEmail),
        restaurantId: String(restaurant._id),
        role: 'OWNER',
      });
    }
  }

  assignments.push(
    {
      userId: userIdByEmail.get('staff@tasty.local'),
      restaurantId: String(primaryRestaurant._id),
      role: 'STAFF',
    },
    {
      userId: userIdByEmail.get('chef@tasty.local'),
      restaurantId: String(primaryRestaurant._id),
      role: 'CHEF',
    },
    {
      userId: userIdByEmail.get('delivery@tasty.local'),
      restaurantId: String(primaryRestaurant._id),
      role: 'DELIVERY_MAN',
    }
  );

  for (const assignment of assignments) {
    await RestaurantUserModel.findOneAndUpdate(
      {
        userId: assignment.userId,
        restaurantId: assignment.restaurantId,
      },
      {
        $set: {
          role: assignment.role,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  for (const restaurant of seededRestaurants) {
    if (
      restaurant.status !== RESTAURANT_STATUS.ACTIVE
      || restaurant.visibility !== RESTAURANT_VISIBILITY.PUBLIC
      || restaurant.subscription.status !== SUBSCRIPTION_STATUS.ACTIVE
      || restaurant.verification.status !== VERIFICATION_STATUS.VERIFIED
    ) {
      continue;
    }

    const categoryDocs = [];
    const itemsByCategory = new Map();

    for (const categorySeed of menuBlueprint) {
      const category = await MenuCategoryModel.findOneAndUpdate(
        {
          restaurantId: restaurant._id,
          name: categorySeed.name,
          deletedAt: null,
        },
        {
          $set: {
            restaurantId: restaurant._id,
            name: categorySeed.name,
            description: categorySeed.description,
            sortOrder: categorySeed.sortOrder,
            isActive: true,
            deletedAt: null,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

      categoryDocs.push(category);

      const itemDocs = [];
      for (const [index, itemSeed] of categorySeed.items.entries()) {
        const item = await MenuItemModel.findOneAndUpdate(
          {
            restaurantId: restaurant._id,
            categoryId: category._id,
            name: itemSeed.name,
            deletedAt: null,
          },
          {
            $set: {
              restaurantId: restaurant._id,
              categoryId: category._id,
              optionGroupIds: [],
              name: itemSeed.name,
              description: itemSeed.description,
              images: [restaurant.coverUrl],
              basePrice: itemSeed.basePrice,
              averagePrepTime: itemSeed.averagePrepTime,
              currency: restaurant.settings.currency || 'USD',
              availability: 'IN_STOCK',
              isPublished: true,
              sortOrder: index + 1,
              tags: itemSeed.tags,
              allergens: itemSeed.allergens,
              trackInventory: false,
              recipeId: null,
              deletedAt: null,
            },
          },
          {
            upsert: true,
            new: true,
            runValidators: true,
            setDefaultsOnInsert: true,
          }
        );

        itemDocs.push(item);
      }

      itemsByCategory.set(String(category._id), itemDocs);
    }

    await PublicMenuProjectionModel.findOneAndUpdate(
      {
        restaurantId: restaurant._id,
      },
      {
        $set: {
          restaurantId: restaurant._id,
          citySlug: restaurant.location.citySlug,
          slug: restaurant.slug,
          restaurant: {
            name: restaurant.name,
            logoUrl: restaurant.logoUrl,
            coverUrl: restaurant.coverUrl,
            city: restaurant.location.city,
            citySlug: restaurant.location.citySlug,
          },
          categories: categoryDocs.map((category) =>
            buildProjectionCategory(category, itemsByCategory.get(String(category._id)) || [])
          ),
          generatedAt: now,
          deletedAt: null,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  console.log('Seeded restaurants, staff assignments, menus, and menu projections.');
  for (const restaurant of seededRestaurants) {
    console.log(
      `${restaurant.name} | id=${restaurant.id} | status=${restaurant.status} | subscription=${restaurant.subscription.status} | visibility=${restaurant.visibility}`
    );
  }
} catch (error) {
  console.error('Failed to seed restaurant data');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (userConnection) {
    await userConnection.close().catch(() => {});
  }
  await mongoose.disconnect().catch(() => {});
}
