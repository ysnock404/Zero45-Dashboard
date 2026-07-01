import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Agency module...');

    await prisma.agencyTransaction.deleteMany();
    await prisma.agencyProject.deleteMany();

    await prisma.agencyConfig.upsert({
        where: { id: 'default' },
        update: {},
        create: {
            id: 'default',
            currency: '€',
            defaultHoursPerDay: 24,
            defaultDaysPerMonth: 30,
            monthStart: new Date('2026-06-01'),
            monthEnd: new Date('2026-06-30'),
        },
    });

    const ldl = await prisma.agencyProject.create({
        data: { name: 'LDL', client: 'Me', model: 'Hora', baseValue: 0.24, unit: '€/h', frequency: 'Contínuo', hoursPerDay: 24, daysPerMonth: 30, active: true },
    });
    const ugu = await prisma.agencyProject.create({
        data: { name: 'UGU Portfolio', client: 'Hugo', model: 'Anual', baseValue: 30, unit: '€', frequency: 'Anual', hoursPerDay: 0, daysPerMonth: 0, active: true },
    });
    const paypal = await prisma.agencyProject.create({
        data: { name: 'Paypal', client: 'Me', model: 'Variável', unit: '€', active: true },
    });
    await prisma.agencyProject.create({
        data: { name: 'Lutz', client: 'Lutz', model: 'Único', unit: '€', active: true },
    });
    await prisma.agencyProject.create({
        data: { name: 'armorygrayscvle', model: 'Mensal', active: true },
    });

    const txs = [
        { date: '2026-06-09', projectId: ldl.id, projectName: 'LDL', client: 'Me', type: 'Despesa', category: 'Domínio', value: -10, status: 'Pago', recurrence: 'Anual', notes: 'ladraodoladrao.com' },
        { date: '2026-06-15', projectName: null, client: 'Me', type: 'Despesa', category: 'Subscrição', value: -4, status: 'Pago', recurrence: 'Mensal', notes: 'Claude Code' },
        { date: '2026-06-15', projectId: ugu.id, projectName: 'UGU Portfolio', client: 'Hugo', type: 'Despesa', category: 'Domínio', value: -9.09, status: 'Pago', recurrence: 'Anual', notes: 'ugumls.com' },
        { date: '2026-06-17', client: 'Me', type: 'Despesa', category: 'Subscrição', value: -17.28, status: 'Pago', recurrence: 'Mensal', notes: 'Claude Code' },
        { date: '2026-06-19', projectId: ugu.id, projectName: 'UGU Portfolio', client: 'Hugo', type: 'Receita', category: 'Pagamento', value: 140, status: 'Pago', recurrence: 'Único', notes: 'Pagamento Upfront' },
        { date: '2026-06-20', client: 'Me', type: 'Despesa', category: 'Subscrição', value: -15, status: 'Pago', recurrence: 'Mensal', notes: 'Claude Code' },
        { date: '2026-06-21', projectId: paypal.id, projectName: 'Paypal', client: 'Me', type: 'Despesa', category: 'Subscrição', value: -13.44, status: 'Pago', recurrence: 'Mensal', notes: 'Undetectable' },
        { date: '2026-06-30', projectId: ldl.id, projectName: 'LDL', client: 'Me', type: 'Receita', category: 'Pagamento', value: 50.89, status: 'Pago', recurrence: 'Único', notes: '' },
    ];

    for (const t of txs) {
        await prisma.agencyTransaction.create({ data: { ...t, date: new Date(t.date) } });
    }

    console.log(`✓ ${txs.length} transações + 5 projetos criados`);
    console.log('🎉 Agency seed complete!');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
