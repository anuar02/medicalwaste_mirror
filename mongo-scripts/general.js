// Подключение к MongoDB внутри контейнера или локально
// use trashbin_db

const companyId = ObjectId();
const adminId = ObjectId();
const driverUserId = ObjectId();
const driverProfileId = ObjectId();
const binIds = [ObjectId(), ObjectId(), ObjectId()];

// 1. Очистка (опционально, если хочешь начать с нуля)
db.medicalcompanies.deleteMany({});
db.users.deleteMany({});
db.drivers.deleteMany({});
db.wastebins.deleteMany({});
db.histories.deleteMany({});
db.routes.deleteMany({});

// 2. Создаем компанию
db.medicalcompanies.insertOne({
    _id: companyId,
    name: "Городская Клиническая Больница №7",
    licenseNumber: "LIC-ALM-2026-001",
    address: {
        street: "ул. Абая 150",
        city: "Алматы",
        region: "Бостандыкский",
        postalCode: "050000"
    },
    contactInfo: {
        phone: "+77015554433",
        email: "info@gkb7.kz"
    },
    isActive: true,
    certificationExpiry: new Date("2027-12-31"),
    wasteTypes: ['infectious', 'sharps', 'pathological']
});

// 3. Создаем пользователей
db.users.insertMany([
    {
        _id: adminId,
        username: "admin_kaz",
        email: "admin@gkb7.kz",
        password: "$2a$12$PxcKNrJUaDDEHXi8UtLSG.3j9O6U5oC2idaZxWEBtVopOFCfswhMO", // 'password123'
        role: "admin",
        company: companyId,
        department: "Хирургическое Отделение",
        active: true,
        verificationStatus: "approved",
        createdAt: new Date()
    },
    {
        _id: driverUserId,
        username: "driver_erzhan",
        email: "erzhan@waste-pro.kz",
        password: "$2a$12$PxcKNrJUaDDEHXi8UtLSG.3j9O6U5oC2idaZxWEBtVopOFCfswhMO",
        role: "driver",
        company: companyId,
        active: true,
        verificationStatus: "approved",
        createdAt: new Date()
    }
]);

// 4. Создаем профиль водителя
db.drivers.insertOne({
    _id: driverProfileId,
    user: driverUserId,
    licenseNumber: "DRV777888999",
    licenseExpiry: new Date("2030-01-01"),
    medicalCompany: companyId,
    vehicleInfo: {
        plateNumber: "777AAA02",
        model: "Iveco Daily (Medical Waste Edition)",
        year: 2024,
        capacity: 2500
    },
    isVerified: true,
    isActive: true
});

// 5. Создаем Умные Баки (IoT)
db.wastebins.insertMany([
    {
        _id: binIds[0],
        binId: "SURG-001",
        company: companyId,
        department: "Хирургическое Отделение",
        wasteType: "Инфекционные Отходы",
        containerHeight: 100,
        distance: 15, // Датчик видит мусор в 15 см (заполнено на 85%)
        fullness: 85,
        temperature: 18.5,
        alertThreshold: 80,
        status: "active",
        location: { type: "Point", coordinates: [76.9286, 43.2351] }, // Алматы
        deviceInfo: {
            macAddress: "AA:BB:CC:DD:EE:01",
            batteryVoltage: 3.7,
            status: "active",
            lastSeen: new Date()
        }
    },
    {
        _id: binIds[1],
        binId: "LAB-042",
        company: companyId,
        department: "Лаборатория",
        wasteType: "Острые Медицинские Отходы",
        containerHeight: 50,
        distance: 40, // заполнено на 20%
        fullness: 20,
        temperature: 21.0,
        status: "active",
        location: { type: "Point", coordinates: [76.9310, 43.2360] }
    }
]);

// 6. Генерируем историю (для графиков)
const now = new Date();
for (let i = 0; i < 10; i++) {
    db.histories.insertOne({
        binId: "SURG-001",
        distance: 100 - (i * 10),
        containerHeight: 100,
        fullness: i * 10,
        temperature: 18 + (i * 0.2),
        timestamp: new Date(now.getTime() - (i * 3600000)) // каждый час назад
    });
}

// 7. Создаем маршрут
db.routes.insertOne({
    name: "Утренний сбор - Район Орбита",
    company: companyId,
    assignedDriver: driverUserId,
    status: "active",
    stops: [
        {
            order: 1,
            containers: [binIds[0]],
            location: { type: "Point", coordinates: [76.9286, 43.2351] },
            estimatedDuration: 15
        }
    ],
    schedule: { type: "daily", time: "09:00" }
});

print("Seed completed successfully!");

db.wastebins.updateMany(
    { weight: { $exists: false } },
    { $set: { weight: 0 } }
);
