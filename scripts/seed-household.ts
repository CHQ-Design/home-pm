import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const CRAIG_EMAIL = "craigregister@gmail.com"
  const MEMBER_EMAILS: string[] = [
    "hudson.a.register@gmail.com",
    "quinn.i.register@gmail.com",
  ]

  const household = await prisma.household.create({
    data: { name: "Register Family" },
  })
  console.log("Created household:", household.id, household.name)

  await prisma.user.create({
    data: { email: CRAIG_EMAIL, role: "admin", householdId: household.id },
  })
  console.log("Created admin user:", CRAIG_EMAIL)

  for (const email of MEMBER_EMAILS) {
    await prisma.user.create({
      data: { email: email.toLowerCase(), role: "member", householdId: household.id },
    })
    console.log("Created member user:", email)
  }

  const hid = household.id
  const [tasks, projects, notes, recurring, people] = await Promise.all([
    prisma.task.updateMany({ data: { householdId: hid } }),
    prisma.project.updateMany({ data: { householdId: hid } }),
    prisma.note.updateMany({ data: { householdId: hid } }),
    prisma.recurringTask.updateMany({ data: { householdId: hid } }),
    prisma.person.updateMany({ data: { householdId: hid } }),
  ])

  console.log(`Assigned to household ${hid}:`)
  console.log(`  ${tasks.count} tasks`)
  console.log(`  ${projects.count} projects`)
  console.log(`  ${notes.count} notes`)
  console.log(`  ${recurring.count} recurring tasks`)
  console.log(`  ${people.count} people`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
