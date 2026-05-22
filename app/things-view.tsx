import type { Person, Project, Prisma } from "@prisma/client"
import BucketedTaskList from "./bucketed-task-list"

type Task = Prisma.TaskGetPayload<{ include: { assignee: true; project: true } }>
type RecurringTask = Prisma.RecurringTaskGetPayload<{ include: { assignee: true } }>

type Props = {
  tasks: Task[]
  recurringTasks: RecurringTask[]
  people: Person[]
  projects: Project[]
  isAdmin: boolean
  sessionPersonId: number | null
  isKid: boolean
  soundEnabled: boolean
  timezone: string
}

export default function ThingsView({
  tasks, recurringTasks, people, projects, isAdmin, sessionPersonId, isKid, soundEnabled, timezone,
}: Props) {
  return (
    <BucketedTaskList
      tasks={tasks}
      recurringTasks={recurringTasks}
      people={people}
      projects={projects}
      isAdmin={isAdmin}
      sessionPersonId={sessionPersonId}
      isKid={isKid}
      soundEnabled={soundEnabled}
      timezone={timezone}
    />
  )
}
