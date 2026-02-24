
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BUSINESS_DATA = [
    { name: 'Co-X', code: 'COX', stage: 'Traction', health: 'Yellow', routeProgress: 7, nextMilestone: 'Close 2 retainer clients', eta: '18 Feb', status: 'At Risk', responsible: 'Manager' },
    { name: '124Solution', code: '124', stage: 'Traction', health: 'Red', routeProgress: 5, nextMilestone: 'Finalize offer + pricing page', eta: '10 Feb', status: 'Overdue', responsible: 'Manager' },
    { name: 'Mei-Shi', code: 'MEI', stage: 'Prototype', health: 'Yellow', routeProgress: 4, nextMilestone: 'Store assembly SOP locked', eta: '16 Feb', status: 'At Risk', responsible: 'Manager' },
    { name: 'Urban Bhog', code: 'UB', stage: 'Launch', health: 'Green', routeProgress: 8, nextMilestone: 'Franchise kit v1 draft', eta: '25 Feb', status: 'On Track', responsible: 'Manager' },
    { name: 'Crunch Waffle', code: 'CW', stage: 'Prototype', health: 'Yellow', routeProgress: 3, nextMilestone: 'Finalize menu engineering', eta: '14 Feb', status: 'At Risk', responsible: 'Manager' },
    { name: 'Frozzo', code: 'FRZ', stage: 'Design', health: 'Yellow', routeProgress: 2, nextMilestone: 'Lab trial batch #1', eta: '20 Feb', status: 'Stale', responsible: 'Manager' },
    { name: 'Zeweco Innovation', code: 'ZWC', stage: 'Foundation', health: 'Yellow', routeProgress: 1, nextMilestone: 'Define 3 flagship bets', eta: '28 Feb', status: 'At Risk', responsible: 'Manager' },
    { name: 'Weston Mark', code: 'WM', stage: 'Design', health: 'Green', routeProgress: 3, nextMilestone: 'Brand system + SKU map', eta: '22 Feb', status: 'On Track', responsible: 'Manager' },
    { name: 'BLISS-FiNN', code: 'BFIN', stage: 'Foundation', health: 'Yellow', routeProgress: 1, nextMilestone: 'MVP scope freeze', eta: '19 Feb', status: 'At Risk', responsible: 'Manager' },
    { name: 'Wolio', code: 'WOLIO', stage: 'Prototype', health: 'Green', routeProgress: 6, nextMilestone: 'Student/Parent flow clickable', eta: '17 Feb', status: 'On Track', responsible: 'Manager' },
    { name: 'WioSky', code: 'WSKY', stage: 'Design', health: 'Yellow', routeProgress: 2, nextMilestone: 'Digital prototype scenes', eta: '26 Feb', status: 'At Risk', responsible: 'Manager' },
    { name: 'Homeoc Smart Kitchen', code: 'H-KIT', stage: 'Prototype', health: 'Red', routeProgress: 3, nextMilestone: 'Prototype BOM + vendor shortlist', eta: '11 Feb', status: 'Stale', responsible: 'Manager' },
    { name: 'Homeoc Smart Home', code: 'H-SYS', stage: 'Foundation', health: 'Yellow', routeProgress: 1, nextMilestone: 'Define core modules', eta: '24 Feb', status: 'At Risk', responsible: 'Manager' },
];

const CHECKLIST_DATA = [
    {
        title: 'Core Foundation',
        tasks: [
            { text: 'Market Research Analysis', completed: true },
            { text: 'Financial Projection Model', completed: false },
            { text: 'Brand Identity Draft', completed: false },
        ]
    },
    {
        title: 'Operational Readiness',
        tasks: [
            { text: 'Legal Compliance Audit', completed: false },
            { text: 'Supply Chain Vendor Selection', completed: false },
            { text: 'MVP Feature Roadmap', completed: false },
        ]
    }
];

async function main() {
    console.log('Seeding data...');

    // Clean up existing data
    await prisma.task.deleteMany();
    await prisma.checklist.deleteMany();
    await prisma.business.deleteMany();
    await prisma.user.deleteMany();

    // Create Users
    await prisma.user.createMany({
        data: [
            { name: 'Manager', email: 'manager@zeweco.com', role: 'Manager', password: 'password', avatar: 'https://i.pravatar.cc/150?u=manager' },
            { name: 'Akshaya', email: 'akshaya@zeweco.com', role: 'CXO', password: 'Zeweco2026!', avatar: 'https://i.pravatar.cc/150?u=akshaya' },
        ],
    });

    // Create Businesses
    for (const biz of BUSINESS_DATA) {
        const createdBiz = await prisma.business.create({
            data: {
                ...biz,
            }
        });

        // Add checklists to each business
        for (const cl of CHECKLIST_DATA) {
            await prisma.checklist.create({
                data: {
                    title: cl.title,
                    businessId: createdBiz.id,
                    tasks: {
                        create: cl.tasks.map((task) => ({
                            text: task.text,
                            completed: task.completed,
                        })),
                    },
                },
            });
        }
    }

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
